import api from './api';
import type { ApiResponse } from '@/types';

export interface ImportResult {
  importados: number;
  errores: number;
  errors?: string[];
}

export interface UbicacionItem {
  id: string;
  nombre: string;
  codigo?: string;
}

export interface AdminStats {
  ubicaciones: {
    provincias: number;
    municipios: number;
    localidades: number;
    recinto: number;
    mesas: number;
  };
  candidatos: {
    partidos: number;
    candidaturas: number;
  };
  actas: {
    totalMesas: number;
    pendienteAlcalde: number;
    pendienteConcejal: number;
    completadaAlcalde: number;
    completadaConcejal: number;
    progresoAlcalde: number;
    progresoConcejal: number;
  };
}

export const adminService = {
  // Importar CSV
  importarCandidaturas: async (file: File): Promise<ApiResponse<ImportResult>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/import/candidaturas', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  importarMesas: async (file: File): Promise<ApiResponse<ImportResult>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/import/mesas', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Stats
  getStats: async (): Promise<ApiResponse<AdminStats>> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Ubicación
  getProvincias: async (): Promise<ApiResponse<UbicacionItem[]>> => {
    const response = await api.get('/admin/ubicacion/provincias');
    return response.data;
  },

  getMunicipios: async (provinciaId?: string): Promise<ApiResponse<UbicacionItem[]>> => {
    const params = provinciaId ? { provinciaId } : {};
    const response = await api.get('/admin/ubicacion/municipios', { params });
    return response.data;
  },

  getLocalidads: async (municipioId: string): Promise<ApiResponse<UbicacionItem[]>> => {
    const response = await api.get('/admin/ubicacion/localidades', { params: { municipioId } });
    return response.data;
  },

  getRecintos: async (municipioId: string, localidadId?: string): Promise<ApiResponse<UbicacionItem[]>> => {
    const params: Record<string, string> = { municipioId };
    if (localidadId) params.localidadId = localidadId;
    const response = await api.get('/admin/ubicacion/recintos', { params });
    return response.data;
  },

  getMesas: async (recintoId: string): Promise<ApiResponse<Array<{
    id: string;
    numeroMesa: number;
    inscritosHabilitados: number;
    estadoAlcalde: string;
    estadoConcejal: string;
  }>>> => {
    const response = await api.get('/admin/ubicacion/mesas', { params: { recintoId } });
    return response.data;
  },
};
