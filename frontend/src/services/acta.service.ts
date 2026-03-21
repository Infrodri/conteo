import api from './api';
import type { Mesa, Candidatura, ActaPayload, ApiResponse } from '@/types';

export const actaService = {
  buscarMesa: async (codigo: string): Promise<ApiResponse<Mesa>> => {
    const response = await api.get('/actas/mesa', { params: { codigo } });
    return response.data;
  },

  getCandidaturas: async (tipo: 'ALCALDE' | 'CONCEJAL'): Promise<ApiResponse<Candidatura[]>> => {
    const response = await api.get('/actas/candidaturas', { params: { tipo } });
    return response.data;
  },

  registrarActa: async (payload: ActaPayload): Promise<ApiResponse<unknown>> => {
    const response = await api.post('/actas/registrar', payload);
    return response.data;
  },

  anularActa: async (id: string, motivo: string): Promise<ApiResponse<unknown>> => {
    const response = await api.patch(`/actas/${id}/anular`, { motivo });
    return response.data;
  },
};
