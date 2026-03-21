import { Response } from 'express';
import mongoose from 'mongoose';
import { MesaModel, ActaModel, CandidaturaModel, AuditoriaActaModel, AuditoriaAccion } from '@/models';
import { asyncHandler } from '@/utils/async-handler';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/utils/errors';
import { AuthRequest } from '@/middleware/auth.middleware';
import { CandidaturaTipo } from '@/models/candidatura.model';
import { MesaEstado } from '@/models/mesa.model';

/**
 * Payload combinado que recibe el frontend
 */
export interface ActaPayload {
  mesaId: string;
  votosEmitidos: number;
  alcalde: {
    candidaturaId: string;
    votosRecibidos: number;
    votosBlancos: number;
    votosNulos: number;
  };
  alcaldeVacio?: {
    candidaturaId: string;
    votosRecibidos: number;
    votosBlancos: number;
    votosNulos: number;
  };
  ganadorAlcalde: string;
  ganadorConcejal: string;
  ejemplar: number;
 劇場: string;
 劇場Concejal: string;
  tipoMesa: string;
  fecha: string;
  concejal: {
    candidaturaId: string;
    votosRecibidos: number;
    votosBlancos: number;
    votosNulos: number;
  };
}

/**
 * Buscar mesa por código
 */
export const buscarMesa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { codigo } = req.query;

  if (!codigo || typeof codigo !== 'string') {
    throw new BadRequestError('Código de mesa es requerido');
  }

  const mesa = await MesaModel.findOne({ codigoMesa: codigo })
    .populate('recintoId')
    .populate('municipioId');

  if (!mesa) {
    throw new NotFoundError('Mesa no encontrada');
  }

  res.json({
    success: true,
    data: {
      id: mesa._id,
      codigoMesa: mesa.codigoMesa,
      inscritosHabilitados: mesa.inscritosHabilitados,
      estadoAlcalde: mesa.estadoAlcalde,
      estadoConcejal: mesa.estadoConcejal,
      recinto: (mesa.recintoId as unknown as { nombre: string }).nombre,
      municipio: (mesa.municipioId as unknown as { nombre: string }).nombre,
    },
  });
});

/**
 * Obtener candidaturas por tipo para el formulario
 */
export const getCandidaturas = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { tipo } = req.query;

  if (!tipo || !Object.values(CandidaturaTipo).includes(tipo as CandidaturaTipo)) {
    throw new BadRequestError('Tipo de candidatura inválido');
  }

  const candidaturas = await CandidaturaModel.find({ tipo })
    .populate('partidoId', 'nombre sigla color')
    .sort({ numeroPapeleta: 1 });

  res.json({
    success: true,
    data: candidaturas.map((c) => ({
      id: c._id,
      nombreCandidato: c.nombreCandidato,
      numeroPapeleta: c.numeroPapeleta,
      partido: (c.partidoId as unknown as { nombre: string; sigla: string; color: string }).nombre,
      partidoSigla: (c.partidoId as unknown as { sigla: string }).sigla,
      color: (c.partidoId as unknown as { color: string }).color,
    })),
  });
});

/**
 * Registrar acta completa (ALCALDE + CONCEJAL en una transacción)
 * REGLA CRÍTICA: Solo se guarda si:
 * - Suma(votos + blancos + nulos) === votosEmitidos en AMBAS secciones
 * - votosEmitidos <= inscritosHabilitados
 */
export const registrarActaCompleta = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payload = req.body as ActaPayload;
    const digitadorId = req.user!._id;

    // 1. Validar que la mesa existe
    const mesa = await MesaModel.findById(payload.mesaId).session(session);
    if (!mesa) {
      throw new NotFoundError('Mesa no encontrada');
    }

    // 2. Validar: votosEmitidos <= inscritosHabilitados
    if (payload.votosEmitidos > mesa.inscritosHabilitados) {
      throw new BadRequestError(
        `Votos emitidos (${payload.votosEmitidos}) no puede ser mayor a inscritos habilitados (${mesa.inscritosHabilitados})`
      );
    }

    // 3. Validar sección ALCALDE
    const totalAlcalde = payload.alcalde.votosRecibidos + payload.alcalde.votosBlancos + payload.alcalde.votosNulos;
    if (totalAlcalde !== payload.votosEmitidos) {
      throw new BadRequestError(
        `Sección ALCALDE: Suma de votos (${totalAlcalde}) debe ser igual a votos emitidos (${payload.votosEmitidos})`
      );
    }

    // 4. Validar sección CONCEJAL
    const totalConcejal = payload.concejal.votosRecibidos + payload.concejal.votosBlancos + payload.concejal.votosNulos;
    if (totalConcejal !== payload.votosEmitidos) {
      throw new BadRequestError(
        `Sección CONCEJAL: Suma de votos (${totalConcejal}) debe ser igual a votos emitidos (${payload.votosEmitidos})`
      );
    }

    // 5. Crear acta ALCALDE
    const actaAlcalde = new ActaModel({
      mesaId: payload.mesaId,
      tipo: CandidaturaTipo.ALCALDE,
      candidaturaId: payload.alcalde.candidaturaId,
      votosRecibidos: payload.alcalde.votosRecibidos,
      votosBlancos: payload.alcalde.votosBlancos,
      votosNulos: payload.alcalde.votosNulos,
      digitadorId,
    });
    await actaAlcalde.save({ session });

    // 6. Crear acta CONCEJAL
    const actaConcejal = new ActaModel({
      mesaId: payload.mesaId,
      tipo: CandidaturaTipo.CONCEJAL,
      candidaturaId: payload.concejal.candidaturaId,
      votosRecibidos: payload.concejal.votosRecibidos,
      votosBlancos: payload.concejal.votosBlancos,
      votosNulos: payload.concejal.votosNulos,
      digitadorId,
    });
    await actaConcejal.save({ session });

    // 7. Actualizar estado de la mesa
    await MesaModel.updateOne(
      { _id: payload.mesaId },
      {
        estadoAlcalde: MesaEstado.COMPLETADA,
        estadoConcejal: MesaEstado.COMPLETADA,
      },
      { session }
    );

    // 8. Registrar auditoría
    const auditoria = new AuditoriaActaModel({
      actaId: actaAlcalde._id,
      userId: digitadorId,
      accion: AuditoriaAccion.CREAR,
      valoresAnteriores: {},
      valoresNuevos: { payload },
      observaciones: `Acta completa registrada - Mesa ${mesa.codigoMesa}`,
    });
    await auditoria.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Acta registrada exitosamente',
      data: {
        actaAlcaldeId: actaAlcalde._id,
        actaConcejalId: actaConcejal._id,
        mesa: {
          codigo: mesa.codigoMesa,
          estadoAlcalde: MesaEstado.COMPLETADA,
          estadoConcejal: MesaEstado.COMPLETADA,
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
export const anularActa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { motivo } = req.body;

  const acta = await ActaModel.findById(id);
  if (!acta) {
    throw new NotFoundError('Acta no encontrada');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Marcar acta como anulada
    acta.status = 'ANULADA' as unknown as import('@/models/acta.model').ActaStatus;
    await acta.save({ session });

    // Revertir estado de la mesa
    const estadoCampo = acta.tipo === CandidaturaTipo.ALCALDE ? 'estadoAlcalde' : 'estadoConcejal';
    await MesaModel.updateOne(
      { _id: acta.mesaId },
      { [estadoCampo]: MesaEstado.PENDIENTE },
      { session }
    );

    // Registrar auditoría
    const auditoria = new AuditoriaActaModel({
      actaId: acta._id,
      userId: req.user!._id,
      accion: AuditoriaAccion.ANULAR,
      valoresAnteriores: { status: 'VALIDA' },
      valoresNuevos: { status: 'ANULADA', motivo },
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
    .sort({ fecha: -1 });

  res.json({
    success: true,
    data: auditorias,
  });
});
