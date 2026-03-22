import { Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { MesaModel, ActaDigitadaModel, CandidaturaModel, AuditoriaActaModel, AuditoriaAccion, CandidaturaTipo, ActaDigitadaStatus, IActaDigitada } from '@/models';
import { asyncHandler } from '@/utils/async-handler';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/utils/errors';
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

  // Helper para obtener string ID de campos poblados o no poblados
  const getObjectIdString = (field: unknown): string => {
    if (field instanceof mongoose.Types.ObjectId) {
      return field.toString();
    }
    if (typeof field === 'object' && field !== null && '_id' in field) {
      return (field as { _id: mongoose.Types.ObjectId })._id.toString();
    }
    return String(field);
  };
  
  // Helper para obtener propiedad de campos poblados o no poblados
  const getFieldValue = (field: unknown, prop: string): string => {
    if (typeof field === 'object' && field !== null) {
      return (field as Record<string, unknown>)[prop] as string || '';
    }
    return '';
  };

  res.json({
    success: true,
    data: {
      id: mesa._id.toString(),
      numeroMesa: mesa.numeroMesa,
      provincia: getFieldValue(mesa.provinciaId, 'nombre'),
      municipioId: getObjectIdString(mesa.municipioId),
      municipio: getFieldValue(mesa.municipioId, 'nombre'),
      localidad: mesa.localidadId ? getFieldValue(mesa.localidadId, 'nombre') : null,
      recinto: getFieldValue(mesa.recintoId, 'nombre'),
      inscritosHabilitados: mesa.inscritosHabilitados,
      estadoAlcalde: mesa.estadoAlcalde,
      estadoConcejal: mesa.estadoConcejal,
      // Info de digitadores
      digitadorIdAlcalde: mesa.digitadorIdAlcalde?.toString() || null,
      digitadorIdConcejal: mesa.digitadorIdConcejal?.toString() || null,
      actas: actas.reduce((acc, acta) => {
        acc[acta.tipo] = {
          id: acta._id,
          status: acta.status,
          votoValido: acta.votoValido,
          votoEmitido: acta.votoEmitido,
          digitadorId: acta.digitadorId?.toString() || null,
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
 * 
 * Lógica de permisos:
 * - OPERADOR: Solo puede editar si la sección NO tiene digitador asignado
 * - ADMIN: Puede editar cualquier acta en cualquier momento
 */
export const guardarActaDigitada = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const payload = req.body as ActaDigitadaPayload & { confirmar?: boolean };
  const digitadorId = req.user!._id;
  const isAdmin = req.user!.rol === 'ADMIN';
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

  // 3. Verificar permisos por tipo de acta
  const campoDigitador = payload.tipo === CandidaturaTipo.ALCALDE ? 'digitadorIdAlcalde' : 'digitadorIdConcejal';
  const digitadorActual = mesa.get(campoDigitador) as Types.ObjectId | undefined;
  const tieneDigitador = digitadorActual != null;
  const esSuDigitador = digitadorActual?.toString() === digitadorId.toString();

  // OPERADOR: No puede editar si ya hay otro digitador
  if (!isAdmin && tieneDigitador && !esSuDigitador) {
    throw new BadRequestError(
      `Esta sección ya fue digitada por otro operador. Solo un administrador puede modificarla.`
    );
  }

  // 4. Calcular totales
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

  // 5. Validaciones según confirmar
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

  try {
    // 6. Buscar acta existente para esta mesa y tipo
    const actaExistente = await ActaDigitadaModel.findOne({
      mesaId: payload.mesaId,
      tipo: payload.tipo,
    });

    // 7. Crear o actualizar
    let acta: IActaDigitada;

    // Preparar datos del acta
    const actaData = {
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
      status: confirmar ? ActaDigitadaStatus.VALIDA : ActaDigitadaStatus.PARCIAL,
      digitadorId: digitadorId,
      fechaDigitacion: new Date(),
    };

    if (actaExistente) {
      // Preparar datos para update (sin digitadorId para no sobrescribir)
      const updateData: Record<string, unknown> = {
        voto1: actaData.voto1,
        voto2: actaData.voto2,
        voto3: actaData.voto3,
        voto4: actaData.voto4,
        voto5: actaData.voto5,
        voto6: actaData.voto6,
        voto7: actaData.voto7,
        voto8: actaData.voto8,
        voto9: actaData.voto9,
        voto10: actaData.voto10,
        voto11: actaData.voto11,
        voto12: actaData.voto12,
        voto13: actaData.voto13,
        votoValido: actaData.votoValido,
        votoBlanco: actaData.votoBlanco,
        votoNuloDirecto: actaData.votoNuloDirecto,
        votoNuloDeclinacion: actaData.votoNuloDeclinacion,
        totalVotoNulo: actaData.totalVotoNulo,
        votoEmitido: actaData.votoEmitido,
        status: actaData.status,
        fechaDigitacion: actaData.fechaDigitacion,
      };
      
      // Solo actualizar digitadorId si no existe o es null
      if (!actaExistente.digitadorId) {
        updateData.digitadorId = digitadorId;
      }
      
      await ActaDigitadaModel.updateOne(
        { _id: actaExistente._id },
        { $set: updateData }
      );
      acta = await ActaDigitadaModel.findById(actaExistente._id) as IActaDigitada;
    } else {
      acta = await ActaDigitadaModel.create({
        mesaId: payload.mesaId,
        tipo: payload.tipo,
        ...actaData,
      });
    }

    // 7. Actualizar estado de la mesa Y asignar digitador
    const updateFields: Record<string, unknown> = {};
    if (payload.tipo === CandidaturaTipo.ALCALDE) {
      updateFields.estadoAlcalde = confirmar ? 'COMPLETADA' : 'PARCIAL';
      // Asignar digitador si no tiene
      if (!mesa.digitadorIdAlcalde) {
        updateFields.digitadorIdAlcalde = digitadorId;
      }
    } else {
      updateFields.estadoConcejal = confirmar ? 'COMPLETADA' : 'PARCIAL';
      // Asignar digitador si no tiene
      if (!mesa.digitadorIdConcejal) {
        updateFields.digitadorIdConcejal = digitadorId;
      }
    }
    await MesaModel.updateOne({ _id: payload.mesaId }, updateFields);

    // 8. Registrar auditoría (sin fallar si hay error)
    try {
      await AuditoriaActaModel.create({
        actaId: acta._id,
        userId: digitadorId,
        accion: confirmar ? AuditoriaAccion.CREAR : AuditoriaAccion.CORREGIR,
        valoresAnteriores: actaExistente ? actaExistente.toObject() : {},
        valoresNuevos: acta.toObject(),
        observaciones: confirmar
          ? `Acta confirmada - Mesa ${mesa.numeroMesa}`
          : payload.observaciones || 'Guardado parcial',
      });
    } catch (auditoriaError) {
      console.error('Error guardando auditoría:', auditoriaError);
    }

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
    throw error;
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

/**
 * Obtener lista de mesas observadas (con filtros)
 * Solo ADMIN puede acceder
 */
export const getMesasObservadas = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // Validar rol ADMIN
  if (req.user!.rol !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden ver esta información');
  }

  const { localidadId, recintoId, estadoAlcalde, estadoConcejal, digitadorId } = req.query;

  const query: Record<string, unknown> = {};
  if (localidadId) query.localidadId = new mongoose.Types.ObjectId(localidadId as string);
  if (recintoId) query.recintoId = new mongoose.Types.ObjectId(recintoId as string);
  if (estadoAlcalde) query.estadoAlcalde = estadoAlcalde;
  if (estadoConcejal) query.estadoConcejal = estadoConcejal;
  if (digitadorId) {
    query.$or = [
      { digitadorIdAlcalde: new mongoose.Types.ObjectId(digitadorId as string) },
      { digitadorIdConcejal: new mongoose.Types.ObjectId(digitadorId as string) },
    ];
  }

  const mesas = await MesaModel.find(query)
    .populate('recintoId', 'nombre')
    .populate('localidadId', 'nombre codigo')
    .populate('digitadorIdAlcalde', 'nombre email')
    .populate('digitadorIdConcejal', 'nombre email')
    .sort({ updatedAt: -1 })
    .limit(500);

  // Helper para obtener string de campo poblado
  const getFieldString = (field: unknown, prop: string): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object') return (field as Record<string, unknown>)[prop] as string || '';
    return '';
  };

  res.json({
    success: true,
    data: mesas.map((m) => ({
      id: m._id.toString(),
      numeroMesa: m.numeroMesa,
      recinto: getFieldString(m.recintoId, 'nombre'),
      localidad: getFieldString(m.localidadId, 'nombre'),
      codigoLocalidad: getFieldString(m.localidadId, 'codigo'),
      estadoAlcalde: m.estadoAlcalde,
      estadoConcejal: m.estadoConcejal,
      digitadorIdAlcalde: m.digitadorIdAlcalde ? getFieldString(m.digitadorIdAlcalde, '_id') : null,
      digitadorNombreAlcalde: m.digitadorIdAlcalde ? getFieldString(m.digitadorIdAlcalde, 'nombre') : null,
      digitadorEmailAlcalde: m.digitadorIdAlcalde ? getFieldString(m.digitadorIdAlcalde, 'email') : null,
      digitadorIdConcejal: m.digitadorIdConcejal ? getFieldString(m.digitadorIdConcejal, '_id') : null,
      digitadorNombreConcejal: m.digitadorIdConcejal ? getFieldString(m.digitadorIdConcejal, 'nombre') : null,
      digitadorEmailConcejal: m.digitadorIdConcejal ? getFieldString(m.digitadorIdConcejal, 'email') : null,
      updatedAt: m.updatedAt,
    })),
  });
});

/**
 * Desbloquear una sección de mesa (resetear digitadorId)
 * Solo ADMIN puede acceder
 */
export const desbloquearMesa = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // Validar rol ADMIN
  if (req.user!.rol !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden desbloquear mesas');
  }

  const { id } = req.params;
  const { tipo } = req.body as { tipo?: CandidaturaTipo };

  if (!tipo || !Object.values(CandidaturaTipo).includes(tipo)) {
    throw new BadRequestError('Tipo debe ser ALCALDE o CONCEJAL');
  }

  const campoDigitador = tipo === CandidaturaTipo.ALCALDE ? 'digitadorIdAlcalde' : 'digitadorIdConcejal';
  const campoEstado = tipo === CandidaturaTipo.ALCALDE ? 'estadoAlcalde' : 'estadoConcejal';

  const updateResult = await MesaModel.updateOne(
    { _id: id },
    {
      $set: {
        [campoDigitador]: null,
        [campoEstado]: 'PARCIAL',
      },
    }
  );

  if (updateResult.matchedCount === 0) {
    throw new NotFoundError('Mesa no encontrada');
  }

  res.json({
    success: true,
    message: `Sección ${tipo} desbloqueada exitosamente`,
    data: {
      mesaId: id,
      tipo,
      digitadorIdReseteado: true,
      estadoActualizado: 'PARCIAL',
    },
  });
});
