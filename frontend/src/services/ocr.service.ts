import api from './api';
import type { ApiResponse } from '@/types';

export interface ActaElectoral {
  identificacion: {
    mesa: string | null;
    codigoMesa: string | null;
    departamento: string | null;
    provincia: string | null;
    localidad: string | null;
    recinto: string | null;
  };
  votosAlcalde: Record<string, number>;
  votosConcejal: Record<string, number>;
  resumen: {
    validosAlcalde: number | null;
    validosConcejal: number | null;
    blancosAlcalde: number | null;
    blancosConcejal: number | null;
    nulosAlcalde: number | null;
    nulosConcejal: number | null;
    habilitados: number | null;
    papeletasAnfora: number | null;
    papeletasNoUtilizadas: number | null;
  };
  textoExtraido: string;
  confianza: number;
}

export interface OcrResponse {
  success: boolean;
  data: ActaElectoral;
}

export async function procesarOcr(imagen: string): Promise<ApiResponse<ActaElectoral>> {
  const response = await api.post<OcrResponse>('/ocr/procesar', { imagen });
  return response.data;
}

export async function procesarLoteOcr(
  imagenes: { base64: string; seccion?: 'ALCALDE' | 'CONCEJAL' }[]
): Promise<ApiResponse<ActaElectoral[]>> {
  const response = await api.post<{ success: boolean; data: ActaElectoral[]; total: number }>(
    '/ocr/procesar-lote',
    { imagenes }
  );
  return {
    success: response.data.success,
    data: response.data.data,
  };
}
