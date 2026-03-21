import { Response } from 'express';
import mongoose from 'mongoose';
import { MesaModel, ActaDigitadaModel, CandidaturaModel, AuditoriaActaModel, AuditoriaAccion, CandidaturaTipo, ActaDigitadaStatus, IActaDigitada } from '@/models';
import { asyncHandler } from '@/utils/async-handler';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { AuthRequest } from '@/middleware/auth.middleware';

/**
 * Payload para registrar/actualizar un acta digitada
 */
export interface ActaDigitadaPayload {
  mesaId: string;
  tipo: CandidaturaTipo;
  // Votos por candidato (1-13)
  voto1?: number;
  voto2?: number;
  voto3?: number;
  voto4?: number;
  voto5?: number;
  voto6?: number;
  voto7?: number;
  voto8?: number;
  voto9?: number;
  voto10?: number;
  voto11?: number;
  voto12?: number;
  voto13?: number;
  // Totales
  votoValido: number;
  votoBlanco: number;
  votoNuloDirecto: number;
  votoNuloDeclinacion: number;
  totalVotoNulo: number;
  votoEmitido: number;
  // Datos del acta física
  votoValidoReal?: number;
  votoEmitidoReal?: number;
  observaciones?: string;
}



/**
 * Buscar mesa por código o número
 */
export const buscarMesa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { codigo, numeroMesa, recintoId, localidadId } = req.query;

  let query: Record<string, unknown> = {};

  if (codigo && typeof codigo === 'string') {
    // Buscar por número de mesa directamente (usando el ID generado)
    query = { _id: codigo };
  }

  if (recintoId && typeof recintoId === 'string') {
    query.recintoId = new mongoose.Types.ObjectId(recintoId);
  }

  if (numeroMesa && typeof numeroMesa === 'string') {
    query.numeroMesa = parseInt(numeroMesa, 10);
  }

  if (localidadId && typeof localidadId === 'string') {
    query.localidadId = new mongoose.Types.ObjectId(localidadId);
  }

  if (Object.keys(query).length === 0) {
    throw new BadRequestError('Debe proporcionar al menos un filtro de búsqueda');
  }

  const mesa = await MesaModel.findOne(query)
    .populate('provinciaId', 'nombre codigo')
    .populate('municipioId', 'nombre')
    .populate('localidadId', 'nombre')
    .populate('recintoId', 'nombre');

  if (!mesa) {
    throw new NotFoundError('Mesa no encontrada');
  }

  // Obtener actas existentes de esta mesa
  const actas = await ActaDigitadaModel.find({ mesaId: mesa._id });

  res.json({
    success: true,
    data: {
      id: mesa._id,
      numeroMesa: mesa.numeroMesa,
      provincia: (mesa.provinciaId as unknown as { nombre: string }).nombre,
      municipio: (mesa.municipioId as unknown as { nombre: string }).nombre,
      localidad: mesa.localidadId ? (mesa.localidadId as unknown as { nombre: string }).nombre : null,
      recinto: (mesa.recintoId as unknown as { nombre: string }).nombre,
      inscritosHabilitados: mesa.inscritosHabilitados,
      estadoAlcalde: mesa.estadoAlcalde,
      estadoConcejal: mesa.estadoConcejal,
      actas: actas.reduce((acc, acta) => {
        acc[acta.tipo] = {
          id: acta._id,
          status: acta.status,
          votoValido: acta.votoValido,
          votoEmitido: acta.votoEmitido,
          digitadorId: acta.digitadorId,
        };
        return acc;
      }, {} as Record<string, unknown>),
    },
  });
});

/**
 * Obtener candidaturas por municipio y tipo
 */
export const getCandidaturas = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { municipioId, tipo } = req.query;

  if (!municipioId || !tipo) {
    throw new BadRequestError('municipioId y tipo son requeridos');
  }

  if (!Object.values(CandidaturaTipo).includes(tipo as CandidaturaTipo)) {
    throw new BadRequestError('Tipo de candidatura inválido');
  }

  const candidaturas = await CandidaturaModel.find({
    municipioId: new mongoose.Types.ObjectId(municipioId as string),
    tipo: tipo as CandidaturaTipo,
  })
    .populate('partidoId', 'nombre sigla color logo')
    .sort({ numeroPapeleta: 1 });

  res.json({
    success: true,
    data: candidaturas.map((c) => ({
      id: c._id,
      tipo: c.tipo,
      numeroPapeleta: c.numeroPapeleta,
      posFranja: c.posFranja,
      esTitular: c.esTitular,
      nombreCandidato: c.nombreCandidato,
      partido: (c.partidoId as unknown as { nombre: string }).nombre,
      partidoSigla: (c.partidoId as unknown as { sigla: string }).sigla,
      partidoColor: (c.partidoId as unknown as { color: string }).color,
    })),
  });
});

/**
 * Obtener actas de una mesa
 */
export const getActasMesa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { mesaId } = req.params;
  const { tipo } = req.query;

  const query: Record<string, unknown> = { mesaId: new mongoose.Types.ObjectId(mesaId) };
  if (tipo) {
    query.tipo = tipo;
  }

  const actas = await ActaDigitadaModel.find(query)
    .populate('digitadorId', 'nombre email');

  res.json({
    success: true,
    data: actas,
  });
});

/**
 * Guardar/actualizar acta digitada (parcial o completa)
 */
export const guardarActaDigitada = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const payload = req.body as ActaDigitadaPayload & { confirmar?: boolean };
  const digitadorId = req.user!._id;
  const { confirmar = false } = payload;

  // 1. Validar que la mesa existe
  const mesa = await MesaModel.findById(payload.mesaId);
  if (!mesa) {
    throw new NotFoundError('Mesa no encontrada');
  }

  // 2. Validar: votoEmitido <= inscritosHabilitados
  if (payload.votoEmitido > mesa.inscritosHabilitados) {
    throw new BadRequestError(
      `Votos emitidos (${payload.votoEmitido}) no puede ser mayor a inscritos habilitados (${mesa.inscritosHabilitados})`
    );
  }

  // 3. Calcular totales
  const votosCandidatos = [
    payload.voto1 || 0,
    payload.voto2 || 0,
    payload.voto3 || 0,
    payload.voto4 || 0,
    payload.voto5 || 0,
    payload.voto6 || 0,
    payload.voto7 || 0,
    payload.voto8 || 0,
    payload.voto9 || 0,
    payload.voto10 || 0,
    payload.voto11 || 0,
    payload.voto12 || 0,
    payload.voto13 || 0,
  ];

  const sumaVotosCandidatos = votosCandidatos.reduce((sum, v) => sum + v, 0);
  const totalNuloCalculado = payload.votoNuloDirecto + payload.votoNuloDeclinacion;
  const votoEmitidoCalculado = sumaVotosCandidatos + payload.votoBlanco + totalNuloCalculado;

  // 4. Validaciones según confirmar
  if (confirmar) {
    // Validación completa
    if (sumaVotosCandidatos !== payload.votoValido) {
      throw new BadRequestError(
        `Suma de votos de candidatos (${sumaVotosCandidatos}) debe ser igual a voto válido (${payload.votoValido})`
      );
    }
    if (votoEmitidoCalculado !== payload.votoEmitido) {
      throw new BadRequestError(
        `Voto emitido calculado (${votoEmitidoCalculado}) debe ser igual a voto emitido (${payload.votoEmitido})`
      );
    }
  }

  // 5. Buscar acta existente
  const actaExistente = await ActaDigitadaModel.findOne({
    mesaId: payload.mesaId,
    tipo: payload.tipo,
  });

  // Verificar permisos si existe
  if (actaExistente) {
    if (actaExistente.digitadorId.toString() !== digitadorId.toString() && req.user!.rol !== 'ADMIN') {
      throw new BadRequestError('Solo el digitador original puede editar esta acta');
    }
  }

  // 6. Crear o actualizar
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let acta: IActaDigitada;

    if (actaExistente) {
      // Actualizar campos existentes
      actaExistente.voto1 = payload.voto1 ?? actaExistente.voto1;
      actaExistente.voto2 = payload.voto2 ?? actaExistente.voto2;
      actaExistente.voto3 = payload.voto3 ?? actaExistente.voto3;
      actaExistente.voto4 = payload.voto4 ?? actaExistente.voto4;
      actaExistente.voto5 = payload.voto5 ?? actaExistente.voto5;
      actaExistente.voto6 = payload.voto6 ?? actaExistente.voto6;
      actaExistente.voto7 = payload.voto7 ?? actaExistente.voto7;
      actaExistente.voto8 = payload.voto8 ?? actaExistente.voto8;
      actaExistente.voto9 = payload.voto9 ?? actaExistente.voto9;
      actaExistente.voto10 = payload.voto10 ?? actaExistente.voto10;
      actaExistente.voto11 = payload.voto11 ?? actaExistente.voto11;
      actaExistente.voto12 = payload.voto12 ?? actaExistente.voto12;
      actaExistente.voto13 = payload.voto13 ?? actaExistente.voto13;
      actaExistente.votoValido = payload.votoValido;
      actaExistente.votoBlanco = payload.votoBlanco;
      actaExistente.votoNuloDirecto = payload.votoNuloDirecto;
      actaExistente.votoNuloDeclinacion = payload.votoNuloDeclinacion;
      actaExistente.totalVotoNulo = totalNuloCalculado;
      actaExistente.votoEmitido = payload.votoEmitido;
      if (payload.votoValidoReal !== undefined) actaExistente.votoValidoReal = payload.votoValidoReal;
      if (payload.votoEmitidoReal !== undefined) actaExistente.votoEmitidoReal = payload.votoEmitidoReal;
      actaExistente.status = confirmar ? ActaDigitadaStatus.VALIDA : ActaDigitadaStatus.PARCIAL;
      if (payload.observaciones) actaExistente.observaciones = payload.observaciones;
      acta = actaExistente;
    } else {
      // Crear nueva acta
      acta = new ActaDigitadaModel({
        mesaId: payload.mesaId,
        tipo: payload.tipo,
        digitadorId,
        voto1: payload.voto1 || 0,
        voto2: payload.voto2 || 0,
        voto3: payload.voto3 || 0,
        voto4: payload.voto4 || 0,
        voto5: payload.voto5 || 0,
        voto6: payload.voto6 || 0,
        voto7: payload.voto7 || 0,
        voto8: payload.voto8 || 0,
        voto9: payload.voto9 || 0,
        voto10: payload.voto10 || 0,
        voto11: payload.voto11 || 0,
        voto12: payload.voto12 || 0,
        voto13: payload.voto13 || 0,
        votoValido: payload.votoValido,
        votoBlanco: payload.votoBlanco,
        votoNuloDirecto: payload.votoNuloDirecto,
        votoNuloDeclinacion: payload.votoNuloDeclinacion,
        totalVotoNulo: totalNuloCalculado,
        votoEmitido: payload.votoEmitido,
        votoValidoReal: payload.votoValidoReal,
        votoEmitidoReal: payload.votoEmitidoReal,
        status: confirmar ? ActaDigitadaStatus.VALIDA : ActaDigitadaStatus.PARCIAL,
        observaciones: payload.observaciones,
        fechaDigitacion: new Date(),
      });
    }

    await acta.save({ session });

    // 7. Actualizar estado de la mesa
    const updateFields: Record<string, unknown> = {};
    if (payload.tipo === CandidaturaTipo.ALCALDE) {
      updateFields.estadoAlcalde = confirmar ? 'COMPLETADA' : 'PARCIAL';
    } else {
      updateFields.estadoConcejal = confirmar ? 'COMPLETADA' : 'PARCIAL';
    }

    await MesaModel.updateOne({ _id: payload.mesaId }, updateFields, { session });

    // 8. Registrar auditoría
    const auditoria = new AuditoriaActaModel({
      actaId: acta._id,
      userId: digitadorId,
      accion: confirmar ? AuditoriaAccion.CREAR : AuditoriaAccion.CORREGIR,
      valoresAnteriores: actaExistente ? actaExistente.toObject() : {},
      valoresNuevos: acta.toObject(),
      observaciones: confirmar
        ? `Acta confirmada - Mesa ${mesa.numeroMesa}`
        : payload.observaciones || 'Guardado parcial',
    });
    await auditoria.save({ session });

    await session.commitTransaction();

    res.status(actaExistente ? 200 : 201).json({
      success: true,
      message: confirmar ? 'Acta confirmada exitosamente' : 'Avance guardado',
      data: {
        id: acta._id,
        status: acta.status,
        tipo: acta.tipo,
        mesa: {
          numeroMesa: mesa.numeroMesa,
          estadoAlcalde: confirmar ? undefined : mesa.estadoAlcalde,
          estadoConcejal: confirmar ? undefined : mesa.estadoConcejal,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * Anular un acta (solo ADMIN)
 */
export const anularActaDigitada = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { motivo } = req.body;

  const acta = await ActaDigitadaModel.findById(id);
  if (!acta) {
    throw new NotFoundError('Acta no encontrada');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Marcar acta como anulada
    acta.status = ActaDigitadaStatus.ANULADA;
    await acta.save({ session });

    // Revertir estado de la mesa
    const updateFields: Record<string, unknown> = {};
    if (acta.tipo === CandidaturaTipo.ALCALDE) {
      updateFields.estadoAlcalde = 'ANULADA';
    } else {
      updateFields.estadoConcejal = 'ANULADA';
    }
    await MesaModel.updateOne({ _id: acta.mesaId }, updateFields, { session });

    // Registrar auditoría
    const auditoria = new AuditoriaActaModel({
      actaId: acta._id,
      userId: req.user!._id,
      accion: AuditoriaAccion.ANULAR,
      valoresAnteriores: { status: acta.status },
      valoresNuevos: { status: ActaDigitadaStatus.ANULADA, motivo },
    });
    await auditoria.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Acta anulada exitosamente',
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * Obtener historial de auditoría de un acta
 */
export const getAuditoriaActa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const auditorias = await AuditoriaActaModel.find({ actaId: id })
    .populate('userId', 'nombre email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: auditorias,
  });
});
