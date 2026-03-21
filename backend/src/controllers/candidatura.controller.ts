import { Response } from 'express';
import mongoose from 'mongoose';
import { CandidaturaModel, PartidoModel, ProvinciaModel, MunicipioModel, CandidaturaTipo } from '@/models';
import { asyncHandler } from '@/utils/async-handler';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { AuthRequest } from '@/middleware/auth.middleware';

/**
 * Obtener todas las candidaturas
 */
export const getCandidaturas = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { tipo, municipioId } = req.query;
  
  const query: Record<string, unknown> = {};
  if (tipo) query.tipo = tipo;
  if (municipioId) query.municipioId = new mongoose.Types.ObjectId(municipioId as string);

  const candidaturas = await CandidaturaModel.find(query)
    .populate('partidoId', 'nombre sigla color')
    .populate('municipioId', 'nombre')
    .sort({ tipo: 1, numeroPapeleta: 1 });

  res.json({ success: true, data: candidaturas });
});

/**
 * Obtener una candidatura por ID
 */
export const getCandidaturaById = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const candidatura = await CandidaturaModel.findById(req.params.id)
    .populate('partidoId', 'nombre sigla color')
    .populate('municipioId', 'nombre');

  if (!candidatura) {
    throw new NotFoundError('Candidatura no encontrada');
  }

  res.json({ success: true, data: candidatura });
});

/**
 * Crear una nueva candidatura
 */
export const createCandidatura = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { partidoId, municipioId, tipo, numeroPapeleta, nombreCandidato, esTitular } = req.body;

  if (!partidoId || !municipioId || !tipo || !numeroPapeleta) {
    throw new BadRequestError('partidoId, municipioId, tipo y numeroPapeleta son requeridos');
  }

  // Verificar que no exista
  const existing = await CandidaturaModel.findOne({ municipioId, tipo, numeroPapeleta });
  if (existing) {
    throw new BadRequestError('Ya existe una candidatura con esa posición para este municipio y tipo');
  }

  const candidatura = await CandidaturaModel.create({
    partidoId,
    municipioId,
    tipo,
    numeroPapeleta,
    nombreCandidato: nombreCandidato || '',
    esTitular: esTitular ?? true,
  });

  const populated = await CandidaturaModel.findById(candidatura._id)
    .populate('partidoId', 'nombre sigla color')
    .populate('municipioId', 'nombre');

  res.status(201).json({ success: true, data: populated });
});

/**
 * Actualizar una candidatura
 */
export const updateCandidatura = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { partidoId, numeroPapeleta, nombreCandidato, esTitular } = req.body;

  const candidatura = await CandidaturaModel.findById(id);
  if (!candidatura) {
    throw new NotFoundError('Candidatura no encontrada');
  }

  // Si cambia posición, verificar que no exista duplicado
  if (numeroPapeleta && numeroPapeleta !== candidatura.numeroPapeleta) {
    const existing = await CandidaturaModel.findOne({
      _id: { $ne: id },
      municipioId: candidatura.municipioId,
      tipo: candidatura.tipo,
      numeroPapeleta,
    });
    if (existing) {
      throw new BadRequestError('Ya existe una candidatura con esa posición');
    }
    candidatura.numeroPapeleta = numeroPapeleta;
  }

  if (partidoId) candidatura.partidoId = partidoId;
  if (nombreCandidato !== undefined) candidatura.nombreCandidato = nombreCandidato;
  if (esTitular !== undefined) candidatura.esTitular = esTitular;

  await candidatura.save();

  const populated = await CandidaturaModel.findById(candidatura._id)
    .populate('partidoId', 'nombre sigla color')
    .populate('municipioId', 'nombre');

  res.json({ success: true, data: populated });
});

/**
 * Eliminar una candidatura
 */
export const deleteCandidatura = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const candidatura = await CandidaturaModel.findById(id);
  if (!candidatura) {
    throw new NotFoundError('Candidatura no encontrada');
  }

  await CandidaturaModel.findByIdAndDelete(id);

  res.json({ success: true, message: 'Candidatura eliminada correctamente' });
});
