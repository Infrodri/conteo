import { Response } from 'express';
import mongoose from 'mongoose';
import { MesaModel, RecintoModel, ProvinciaModel, MunicipioModel, ActaDigitadaModel, ActaDigitadaStatus, CandidaturaTipo } from '@/models';
import { asyncHandler } from '@/utils/async-handler';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { AuthRequest } from '@/middleware/auth.middleware';

/**
 * Obtener todas las mesas con sus actas
 */
export const getMesas = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { municipioId, recintoId, estado } = req.query;

  const query: Record<string, unknown> = {};
  if (municipioId) query.municipioId = new mongoose.Types.ObjectId(municipioId as string);
  if (recintoId) query.recintoId = new mongoose.Types.ObjectId(recintoId as string);

  const mesas = await MesaModel.find(query)
    .populate('municipioId', 'nombre')
    .populate('recintoId', 'nombre')
    .sort({ numeroMesa: 1 });

  // Obtener actas para cada mesa
  const mesaIds = mesas.map(m => m._id);
  const actas = await ActaDigitadaModel.find({ mesaId: { $in: mesaIds } });

  const mesasConActas = mesas.map(mesa => ({
    ...mesa.toObject(),
    actas: actas.filter(a => a.mesaId.toString() === mesa._id.toString()),
  }));

  res.json({ success: true, data: mesasConActas });
});

/**
 * Obtener una mesa por ID
 */
export const getMesaById = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const mesa = await MesaModel.findById(req.params.id)
    .populate('municipioId', 'nombre')
    .populate('recintoId', 'nombre');

  if (!mesa) {
    throw new NotFoundError('Mesa no encontrada');
  }

  const actas = await ActaDigitadaModel.find({ mesaId: mesa._id });

  res.json({
    success: true,
    data: {
      ...mesa.toObject(),
      actas,
    },
  });
});

/**
 * Crear una nueva mesa
 */
export const createMesa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { numeroMesa, municipioId, recintoId, provinciaId, inscritosHabilitados } = req.body;

  if (!numeroMesa || !municipioId) {
    throw new BadRequestError('numeroMesa y municipioId son requeridos');
  }

  const mesa = await MesaModel.create({
    numeroMesa,
    municipioId,
    recintoId,
    provinciaId,
    inscritosHabilitados: inscritosHabilitados || 0,
    estadoAlcalde: 'PENDIENTE',
    estadoConcejal: 'PENDIENTE',
  });

  const populated = await MesaModel.findById(mesa._id)
    .populate('municipioId', 'nombre')
    .populate('recintoId', 'nombre');

  res.status(201).json({ success: true, data: populated });
});

/**
 * Actualizar una mesa
 */
export const updateMesa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { numeroMesa, recintoId, inscritosHabilitados, estadoAlcalde, estadoConcejal } = req.body;

  const mesa = await MesaModel.findById(id);
  if (!mesa) {
    throw new NotFoundError('Mesa no encontrada');
  }

  if (numeroMesa !== undefined) mesa.numeroMesa = numeroMesa;
  if (recintoId !== undefined) mesa.recintoId = recintoId;
  if (inscritosHabilitados !== undefined) mesa.inscritosHabilitados = inscritosHabilitados;
  if (estadoAlcalde !== undefined) mesa.estadoAlcalde = estadoAlcalde;
  if (estadoConcejal !== undefined) mesa.estadoConcejal = estadoConcejal;

  await mesa.save();

  const populated = await MesaModel.findById(mesa._id)
    .populate('municipioId', 'nombre')
    .populate('recintoId', 'nombre');

  res.json({ success: true, data: populated });
});

/**
 * Eliminar una mesa
 */
export const deleteMesa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const mesa = await MesaModel.findById(id);
  if (!mesa) {
    throw new NotFoundError('Mesa no encontrada');
  }

  // Eliminar actas asociadas
  await ActaDigitadaModel.deleteMany({ mesaId: id });
  await MesaModel.findByIdAndDelete(id);

  res.json({ success: true, message: 'Mesa eliminada correctamente' });
});

/**
 * Obtener actas de una mesa
 */
export const getActasByMesa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { mesaId } = req.params;
  const { tipo } = req.query;

  const query: Record<string, unknown> = { mesaId: new mongoose.Types.ObjectId(mesaId) };
  if (tipo) query.tipo = tipo;

  const actas = await ActaDigitadaModel.find(query);

  res.json({ success: true, data: actas });
});

/**
 * Actualizar/crear acta de una mesa (para digitación)
 */
export const upsertActa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { mesaId } = req.params;
  const { tipo, voto1, voto2, voto3, voto4, voto5, voto6, voto7, voto8, voto9, voto10, voto11, voto12, voto13, votoValido, votoBlanco, votoNuloDirecto, votoNuloDeclinacion, totalVotoNulo, votoEmitido, confirmar } = req.body;

  if (!tipo) {
    throw new BadRequestError('Tipo de acta es requerido');
  }

  // Validar que la mesa existe
  const mesa = await MesaModel.findById(mesaId);
  if (!mesa) {
    throw new NotFoundError('Mesa no encontrada');
  }

  // Calcular voto válido si no se proporciona
  let calculatedVotoValido = votoValido;
  if (calculatedVotoValido === undefined) {
    calculatedVotoValido = 0;
    for (let i = 1; i <= 13; i++) {
      calculatedVotoValido += Number(req.body[`voto${i}`]) || 0;
    }
  }

  const acta = await ActaDigitadaModel.findOneAndUpdate(
    { mesaId: new mongoose.Types.ObjectId(mesaId), tipo },
    {
      mesaId: new mongoose.Types.ObjectId(mesaId),
      tipo,
      voto1: voto1 || 0,
      voto2: voto2 || 0,
      voto3: voto3 || 0,
      voto4: voto4 || 0,
      voto5: voto5 || 0,
      voto6: voto6 || 0,
      voto7: voto7 || 0,
      voto8: voto8 || 0,
      voto9: voto9 || 0,
      voto10: voto10 || 0,
      voto11: voto11 || 0,
      voto12: voto12 || 0,
      voto13: voto13 || 0,
      votoValido: calculatedVotoValido,
      votoBlanco: votoBlanco || 0,
      votoNuloDirecto: votoNuloDirecto || 0,
      votoNuloDeclinacion: votoNuloDeclinacion || 0,
      totalVotoNulo: totalVotoNulo || ((votoNuloDirecto || 0) + (votoNuloDeclinacion || 0)),
      votoEmitido: votoEmitido || (calculatedVotoValido + (votoBlanco || 0) + ((votoNuloDirecto || 0) + (votoNuloDeclinacion || 0))),
      status: confirmar ? ActaDigitadaStatus.VALIDA : ActaDigitadaStatus.PARCIAL,
      digitadorId: req.user!._id,
    },
    { upsert: true, new: true }
  );

  // Actualizar estado de la mesa
  if (confirmar) {
    const updateField = tipo === CandidaturaTipo.ALCALDE ? 'estadoAlcalde' : 'estadoConcejal';
    await MesaModel.findByIdAndUpdate(mesaId, { [updateField]: 'COMPLETADA' });
  }

  res.json({ success: true, data: acta });
});
