import api from './api';
import type { ApiResponse } from '@/types';

export interface Acta {
  _id: string;
  mesaId: string;
  tipo: 'ALCALDE' | 'CONCEJAL';
  voto1: number;
  voto2: number;
  voto3: number;
  voto4: number;
  voto5: number;
  voto6: number;
  voto7: number;
  voto8: number;
  voto9: number;
  voto10: number;
  voto11: number;
  voto12: number;
  voto13: number;
  votoValido: number;
  votoBlanco: number;
  votoNuloDirecto: number;
  votoNuloDeclinacion: number;
  totalVotoNulo: number;
  votoEmitido: number;
  status: 'PARCIAL' | 'VALIDA' | 'ANULADA';
  digitadorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Mesa {
  _id: string;
  numeroMesa: number;
  municipioId: {
    _id: string;
    nombre: string;
  };
  recintoId?: {
    _id: string;
    nombre: string;
  };
  provinciaId?: string;
  inscritosHabilitados: number;
  estadoAlcalde: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'ANULADA';
  estadoConcejal: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'ANULADA';
  actas?: Acta[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMesaDto {
  numeroMesa: number;
  municipioId: string;
  recintoId?: string;
  provinciaId?: string;
  inscritosHabilitados?: number;
}

export interface UpdateMesaDto {
  numeroMesa?: number;
  recintoId?: string;
  inscritosHabilitados?: number;
  estadoAlcalde?: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'ANULADA';
  estadoConcejal?: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'ANULADA';
}

export interface UpsertActaDto {
  tipo: 'ALCALDE' | 'CONCEJAL';
  voto1?: number;
  voto2?: number;
  voto3?: number;
  // ... hasta voto13
  voto13?: number;
  votoValido?: number;
  votoBlanco?: number;
  votoNuloDirecto?: number;
  votoNuloDeclinacion?: number;
  totalVotoNulo?: number;
  votoEmitido?: number;
  confirmar?: boolean;
}

export const mesaService = {
  getAll: async (municipioId?: string, recintoId?: string): Promise<ApiResponse<Mesa[]>> => {
    const params: Record<string, string> = {};
    if (municipioId) params.municipioId = municipioId;
    if (recintoId) params.recintoId = recintoId;
    const response = await api.get('/mesas', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Mesa>> => {
    const response = await api.get(`/mesas/${id}`);
    return response.data;
  },

  create: async (data: CreateMesaDto): Promise<ApiResponse<Mesa>> => {
    const response = await api.post('/mesas', data);
    return response.data;
  },

  update: async (id: string, data: UpdateMesaDto): Promise<ApiResponse<Mesa>> => {
    const response = await api.put(`/mesas/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/mesas/${id}`);
    return response.data;
  },

  getActas: async (mesaId: string, tipo?: string): Promise<ApiResponse<Acta[]>> => {
    const params: Record<string, string> = {};
    if (tipo) params.tipo = tipo;
    const response = await api.get(`/mesas/${mesaId}/actas`, { params });
    return response.data;
  },

  upsertActa: async (mesaId: string, data: UpsertActaDto): Promise<ApiResponse<Acta>> => {
    const response = await api.post(`/mesas/${mesaId}/acta`, data);
    return response.data;
  },
};
