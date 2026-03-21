import api from './api';
import type { ApiResponse } from '@/types';

export interface ResumenData {
  totales: {
    votoValido: number;
    votoBlanco: number;
    totalVotoNulo: number;
    votoEmitido: number;
  };
  porcentajes: {
    participacion: number;
    votoBlanco: number;
    votoNulo: number;
  };
  actas: {
    totalMesas: number;
    actasCompletadasAlcalde: number;
    actasCompletadasConcejal: number;
    progresoAlcalde: number;
    progresoConcejal: number;
  };
  inscritos: number;
}

export interface ResultadoCandidato {
  candidaturaId: string;
  partido: string;
  sigla: string;
  color: string;
  nombreCandidato: string;
  numeroPapeleta: number;
  posicion: number;
  votos: number;
  porcentaje: number;
}

export interface ResultadosData {
  tipo: 'ALCALDE' | 'CONCEJAL';
  totalActas?: number;
  totalMesas?: number;
  actasComputadas?: number;
  totalVotos: number;
  resultados: ResultadoCandidato[];
}

export const dashboardService = {
  getResumen: async (): Promise<ApiResponse<ResumenData>> => {
    const response = await api.get('/dashboard/resumen');
    return response.data;
  },

  getResultados: async (tipo: 'ALCALDE' | 'CONCEJAL', municipioId?: string): Promise<ApiResponse<ResultadosData>> => {
    const params: Record<string, string> = { tipo };
    if (municipioId) params.municipioId = municipioId;
    const response = await api.get('/dashboard/resultados', { params });
    return response.data;
  },

  getResultadosMunicipio: async (municipioId: string, tipo?: 'ALCALDE' | 'CONCEJAL'): Promise<ApiResponse<ResultadosData>> => {
    const params: Record<string, string> = {};
    if (tipo) params.tipo = tipo;
    const response = await api.get(`/dashboard/resultados/municipio/${municipioId}`, { params });
    return response.data;
  },
};
