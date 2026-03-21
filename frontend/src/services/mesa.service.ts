import api from './api';
import type { ApiResponse } from '@/types';
import { CandidaturaTipo, ActaDigitadaStatus } from '@/types';

export interface MesaInfo {
  id: string;
  numeroMesa: number;
  provincia: string;
  municipioId: string;
  municipio: string;
  localidad: string | null;
  recinto: string;
  inscritosHabilitados: number;
  estadoAlcalde: string;
  estadoConcejal: string;
  digitadorIdAlcalde: string | null;
  digitadorIdConcejal: string | null;
  actas?: {
    ALCALDE?: {
      id: string;
      status: ActaDigitadaStatus;
      votoValido: number;
      votoEmitido: number;
      digitadorId: string | null;
    };
    CONCEJAL?: {
      id: string;
      status: ActaDigitadaStatus;
      votoValido: number;
      votoEmitido: number;
      digitadorId: string | null;
    };
  };
}

export interface MesaObservada {
  id: string;
  numeroMesa: number;
  recinto: string;
  localidad: string;
  codigoLocalidad?: string;
  estadoAlcalde: string;
  estadoConcejal: string;
  digitadorIdAlcalde: string | null;
  digitadorNombreAlcalde: string | null;
  digitadorEmailAlcalde: string | null;
  digitadorIdConcejal: string | null;
  digitadorNombreConcejal: string | null;
  digitadorEmailConcejal: string | null;
  updatedAt: string;
}

export interface MesasObservadasFiltros {
  localidadId?: string;
  recintoId?: string;
  estadoAlcalde?: string;
  estadoConcejal?: string;
  digitadorId?: string;
}

export interface CandidaturaForm {
  id: string;
  tipo: CandidaturaTipo;
  numeroPapeleta: number;
  posFranja?: number;
  esTitular?: boolean;
  nombreCandidato: string;
  partido: string;
  partidoSigla: string;
  partidoColor: string;
}

export interface ActaDigitadaPayload {
  mesaId: string;
  tipo: CandidaturaTipo;
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
  votoValido: number;
  votoBlanco: number;
  votoNuloDirecto: number;
  votoNuloDeclinacion: number;
  totalVotoNulo: number;
  votoEmitido: number;
  votoValidoReal?: number;
  votoEmitidoReal?: number;
  observaciones?: string;
  confirmar?: boolean;
}

export const mesaService = {
  buscarMesa: async (codigo: string): Promise<ApiResponse<MesaInfo>> => {
    const response = await api.get('/actas/mesa', { params: { codigo } });
    return response.data;
  },

  getCandidaturas: async (municipioId: string, tipo: 'ALCALDE' | 'CONCEJAL'): Promise<ApiResponse<CandidaturaForm[]>> => {
    const response = await api.get('/actas/candidaturas', { params: { municipioId, tipo } });
    return response.data;
  },

  guardarActa: async (payload: ActaDigitadaPayload): Promise<ApiResponse<{
    id: string;
    status: ActaDigitadaStatus;
    tipo: CandidaturaTipo;
  }>> => {
    const response = await api.post(`/actas/mesa/${payload.mesaId}/acta`, payload);
    return response.data;
  },

  getActasMesa: async (mesaId: string): Promise<ApiResponse<unknown[]>> => {
    const response = await api.get(`/actas/mesa/${mesaId}/actas`);
    return response.data;
  },

  // === ADMIN OBSERVACIÓN ===
  getMesasObservadas: async (filtros?: MesasObservadasFiltros): Promise<ApiResponse<MesaObservada[]>> => {
    const response = await api.get('/actas/mesas-observadas', { params: filtros });
    return response.data;
  },

  desbloquearMesa: async (mesaId: string, tipo: 'ALCALDE' | 'CONCEJAL'): Promise<ApiResponse<{
    mesaId: string;
    tipo: string;
    digitadorIdReseteado: boolean;
    estadoActualizado: string;
  }>> => {
    const response = await api.post(`/actas/mesa/${mesaId}/desbloquear`, { tipo });
    return response.data;
  },
};
