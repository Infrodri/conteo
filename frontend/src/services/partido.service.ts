import api from './api';
import type { ApiResponse } from '@/types';

export interface Partido {
  _id: string;
  nombre: string;
  sigla: string;
  color: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartidoDto {
  nombre: string;
  sigla?: string;
  color?: string;
}

export interface UpdatePartidoDto {
  nombre?: string;
  sigla?: string;
  color?: string;
}

export const partidoService = {
  // Obtener todos los partidos
  getAll: async (): Promise<ApiResponse<Partido[]>> => {
    const response = await api.get('/partidos');
    return response.data;
  },

  // Obtener un partido por ID
  getById: async (id: string): Promise<ApiResponse<Partido>> => {
    const response = await api.get(`/partidos/${id}`);
    return response.data;
  },

  // Crear un partido
  create: async (data: CreatePartidoDto): Promise<ApiResponse<Partido>> => {
    const response = await api.post('/partidos', data);
    return response.data;
  },

  // Actualizar un partido
  update: async (id: string, data: UpdatePartidoDto): Promise<ApiResponse<Partido>> => {
    const response = await api.put(`/partidos/${id}`, data);
    return response.data;
  },

  // Eliminar un partido
  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/partidos/${id}`);
    return response.data;
  },
};
