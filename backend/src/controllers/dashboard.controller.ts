import { Response } from 'express';
import mongoose from 'mongoose';
import { MesaModel, ActaDigitadaModel, CandidaturaModel, CandidaturaTipo, ActaDigitadaStatus } from '@/models';
import { asyncHandler } from '@/utils/async-handler';
import { AuthRequest } from '@/middleware/auth.middleware';

/**
 * Obtener resumen general de resultados
 */
export const getResumen = asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  // Obtener todas las actas confirmadas
  const actas = await ActaDigitadaModel.find({ status: ActaDigitadaStatus.VALIDA });

  // Calcular totales
  const totales = actas.reduce(
    (acc, acta) => {
      acc.votoValido += acta.votoValido;
      acc.votoBlanco += acta.votoBlanco;
      acc.totalVotoNulo += acta.totalVotoNulo;
      acc.votoEmitido += acta.votoEmitido;
      return acc;
    },
    { votoValido: 0, votoBlanco: 0, totalVotoNulo: 0, votoEmitido: 0 }
  );

  // Obtener estadísticas de mesas
  const statsMesas = await MesaModel.aggregate([
    {
      $group: {
        _id: null,
        totalMesas: { $sum: 1 },
        actasCompletadasAlcalde: {
          $sum: { $cond: [{ $eq: ['$estadoAlcalde', 'COMPLETADA'] }, 1, 0] },
        },
        actasCompletadasConcejal: {
          $sum: { $cond: [{ $eq: ['$estadoConcejal', 'COMPLETADA'] }, 1, 0] },
        },
        totalInscritos: { $sum: '$inscritosHabilitados' },
      },
    },
  ]);

  const stats = statsMesas[0] || {
    totalMesas: 0,
    actasCompletadasAlcalde: 0,
    actasCompletadasConcejal: 0,
    totalInscritos: 0,
  };

  const porcentajeParticipacion = stats.totalInscritos > 0
    ? Math.round((totales.votoEmitido / stats.totalInscritos) * 10000) / 100
    : 0;

  res.json({
    success: true,
    data: {
      totales: {
        votoValido: totales.votoValido,
        votoBlanco: totales.votoBlanco,
        totalVotoNulo: totales.totalVotoNulo,
        votoEmitido: totales.votoEmitido,
      },
      porcentajes: {
        participacion: porcentajeParticipacion,
        votoBlanco: totales.votoEmitido > 0
          ? Math.round((totales.votoBlanco / totales.votoEmitido) * 10000) / 100
          : 0,
        votoNulo: totales.votoEmitido > 0
          ? Math.round((totales.totalVotoNulo / totales.votoEmitido) * 10000) / 100
          : 0,
      },
      actas: {
        totalMesas: stats.totalMesas,
        actasCompletadasAlcalde: stats.actasCompletadasAlcalde,
        actasCompletadasConcejal: stats.actasCompletadasConcejal,
        progresoAlcalde: stats.totalMesas > 0
          ? Math.round((stats.actasCompletadasAlcalde / stats.totalMesas) * 100)
          : 0,
        progresoConcejal: stats.totalMesas > 0
          ? Math.round((stats.actasCompletadasConcejal / stats.totalMesas) * 100)
          : 0,
      },
      inscritos: stats.totalInscritos,
    },
  });
});

/**
 * Obtener resultados por tipo de candidatura (ALCALDE o CONCEJAL)
 */
export const getResultados = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { tipo, municipioId } = req.query;

  if (!tipo || !Object.values(CandidaturaTipo).includes(tipo as CandidaturaTipo)) {
    res.status(400).json({
      success: false,
      message: 'Tipo de candidatura inválido. Use ALCALDE o CONCEJAL.',
    });
    return;
  }

  // Construir query base
  const queryActas: Record<string, unknown> = {
    status: ActaDigitadaStatus.VALIDA,
    tipo: tipo as CandidaturaTipo,
  };

    if (municipioId) {
    // Necesitamos filtrar por municipio también
    const mesas = await MesaModel.find({
      municipioId: new mongoose.Types.ObjectId(municipioId as string),
    }).select('_id');
    queryActas.mesaId = { $in: mesas.map(m => m._id) };
  }

  // Obtener actas filtradas
  const actas = await ActaDigitadaModel.find(queryActas);

  // Obtener todos los candidatos del tipo especificado
  const queryCandidaturas: Record<string, unknown> = { tipo: tipo as CandidaturaTipo };
  if (municipioId) {
    queryCandidaturas.municipioId = new mongoose.Types.ObjectId(municipioId as string);
  }

  const candidaturas = await CandidaturaModel.find(queryCandidaturas)
    .populate('partidoId', 'nombre sigla color');

  // Calcular votos por candidatura
  const resultados: Record<string, {
    candidaturaId: string;
    partido: string;
    sigla: string;
    color: string;
    nombreCandidato: string;
    numeroPapeleta: number;
    votos: number;
  }> = {};

  // Inicializar resultados con candidatos
  for (const c of candidaturas) {
    const partidoInfo = c.partidoId as unknown as { nombre: string; sigla: string; color: string };
    resultados[c._id.toString()] = {
      candidaturaId: c._id.toString(),
      partido: partidoInfo.nombre,
      sigla: partidoInfo.sigla,
      color: partidoInfo.color,
      nombreCandidato: c.nombreCandidato,
      numeroPapeleta: c.numeroPapeleta,
      votos: 0,
    };
  }

  // Sumar votos de actas
  for (const acta of actas) {
    const camposVoto = [
      'voto1', 'voto2', 'voto3', 'voto4', 'voto5', 'voto6', 'voto7',
      'voto8', 'voto9', 'voto10', 'voto11', 'voto12', 'voto13',
    ];

    // Crear mapa de candidatura por posición
    const mapaPorPosicion: Record<number, string> = {};
    for (const c of candidaturas) {
      mapaPorPosicion[c.numeroPapeleta] = c._id.toString();
    }

    // Sumar votos
    for (let i = 0; i < camposVoto.length; i++) {
      const campo = camposVoto[i];
      const posicion = i + 1;
      const candidaturaId = mapaPorPosicion[posicion];

      if (candidaturaId && resultados[candidaturaId]) {
        resultados[candidaturaId].votos += Number((acta as unknown as Record<string, number>)[campo]) || 0;
      }
    }
  }

  // Ordenar por votos descendente
  const resultadosOrdenados = Object.values(resultados).sort((a, b) => b.votos - a.votos);

  // Calcular totales
  const totalVotos = resultadosOrdenados.reduce((sum, r) => sum + r.votos, 0);
  const actaCount = await ActaDigitadaModel.countDocuments(queryActas);

  res.json({
    success: true,
    data: {
      tipo,
      totalActas: actaCount,
      totalVotos,
      resultados: resultadosOrdenados.map((r, index) => ({
        ...r,
        posicion: index + 1,
        porcentaje: totalVotos > 0 ? Math.round((r.votos / totalVotos) * 10000) / 100 : 0,
      })),
    },
  });
});

/**
 * Obtener resultados por municipio
 */
export const getResultadosMunicipio = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { municipioId, tipo } = req.query;

  if (!municipioId) {
    res.status(400).json({
      success: false,
      message: 'municipioId es requerido',
    });
    return;
  }

  const tipoCandidatura = tipo && Object.values(CandidaturaTipo).includes(tipo as CandidaturaTipo)
    ? (tipo as CandidaturaTipo)
    : CandidaturaTipo.ALCALDE;

  // Obtener mesas del municipio
  const mesas = await MesaModel.find({
    municipioId: new mongoose.Types.ObjectId(municipioId as string),
  }).select('_id numeroMesa');

  const mesaIds = mesas.map(m => m._id);

  // Obtener actas
  const actas = await ActaDigitadaModel.find({
    mesaId: { $in: mesaIds },
    tipo: tipoCandidatura,
    status: ActaDigitadaStatus.VALIDA,
  });

  // Obtener candidatos
  const candidaturas = await CandidaturaModel.find({
    municipioId: new mongoose.Types.ObjectId(municipioId as string),
    tipo: tipoCandidatura,
  }).populate('partidoId', 'nombre sigla color');

  // Calcular resultados por partido
  const resultadosPorPartido: Record<string, {
    partido: string;
    sigla: string;
    color: string;
    votos: number;
    candidato: string;
  }> = {};

  for (const c of candidaturas) {
    const partidoInfo = c.partidoId as unknown as { nombre: string; sigla: string; color: string };
    resultadosPorPartido[c._id.toString()] = {
      partido: partidoInfo.nombre,
      sigla: partidoInfo.sigla,
      color: partidoInfo.color,
      votos: 0,
      candidato: c.nombreCandidato,
    };
  }

  // Sumar votos
  for (const acta of actas) {
    const camposVoto = [
      'voto1', 'voto2', 'voto3', 'voto4', 'voto5', 'voto6', 'voto7',
      'voto8', 'voto9', 'voto10', 'voto11', 'voto12', 'voto13',
    ];

    for (let i = 0; i < camposVoto.length && i < candidaturas.length; i++) {
      const campo = camposVoto[i];
      const candidaturaId = candidaturas[i]._id.toString();
      if (resultadosPorPartido[candidaturaId]) {
        resultadosPorPartido[candidaturaId].votos += Number((acta as unknown as Record<string, number>)[campo]) || 0;
      }
    }
  }

  const resultadosOrdenados = Object.values(resultadosPorPartido).sort((a, b) => b.votos - a.votos);
  const totalVotos = resultadosOrdenados.reduce((sum, r) => sum + r.votos, 0);

  res.json({
    success: true,
    data: {
      tipo: tipoCandidatura,
      totalMesas: mesas.length,
      actasComputadas: actas.length,
      totalVotos,
      resultados: resultadosOrdenados.map((r, index) => ({
        ...r,
        posicion: index + 1,
        porcentaje: totalVotos > 0 ? Math.round((r.votos / totalVotos) * 10000) / 100 : 0,
      })),
    },
  });
});
