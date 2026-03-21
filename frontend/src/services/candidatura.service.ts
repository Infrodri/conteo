import api from './api';
import type { ApiResponse } from '@/types';

export interface Candidatura {
  _id: string;
  partidoId: {
    _id: string;
    nombre: string;
    sigla: string;
    color: string;
  };
  municipioId: {
    _id: string;
    nombre: string;
  };
  tipo: 'ALCALDE' | 'CONCEJAL';
  numeroPapeleta: number;
  nombreCandidato: string;
  esTitular: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCandidaturaDto {
  partidoId: string;
  municipioId: string;
  tipo: 'ALCALDE' | 'CONCEJAL';
  numeroPapeleta: number;
  nombreCandidato?: string;
  esTitular?: boolean;
}

export interface UpdateCandidaturaDto {
  partidoId?: string;
  numeroPapeleta?: number;
  nombreCandidato?: string;
  esTitular?: boolean;
}

export const candidaturaService = {
  getAll: async (tipo?: string, municipioId?: string): Promise<ApiResponse<Candidatura[]>> => {
    const params: Record<string, string> = {};
    if (tipo) params.tipo = tipo;
    if (municipioId) params.municipioId = municipioId;
    const response = await api.get('/candidaturas', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Candidatura>> => {
    const response = await api.get(`/candidaturas/${id}`);
    return response.data;
  },

  create: async (data: CreateCandidaturaDto): Promise<ApiResponse<Candidatura>> => {
    const response = await api.post('/candidaturas', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCandidaturaDto): Promise<ApiResponse<Candidatura>> => {
    const response = await api.put(`/candidaturas/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/candidaturas/${id}`);
    return response.data;
  },
};
