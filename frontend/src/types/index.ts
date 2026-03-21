export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: 'ADMIN' | 'OPERADOR';
}

export interface Mesa {
  id: string;
  codigoMesa: string;
  inscritosHabilitados: number;
  estadoAlcalde: 'PENDIENTE' | 'COMPLETADA' | 'ANULADA';
  estadoConcejal: 'PENDIENTE' | 'COMPLETADA' | 'ANULADA';
  recinto?: string;
  municipio?: string;
}

export interface Candidatura {
  id: string;
  nombreCandidato: string;
  numeroPapeleta: number;
  partido: string;
  partidoSigla: string;
  color: string;
}

export interface ActaInput {
  candidaturaId: string;
  votosRecibidos: number;
  votosBlancos: number;
  votosNulos: number;
}

// Tipos de candidatura
export type CandidaturaTipo = 'ALCALDE' | 'CONCEJAL';

// Estados del acta digitada
export type ActaDigitadaStatus = 'PARCIAL' | 'VALIDA' | 'ANULADA';

// Payload para registrar acta (legacy)
export interface ActaPayload {
  mesaId: string;
  votosEmitidos: number;
  alcalde: ActaInput;
  /** Sección CONCEJAL - requerida por el backend */
  edil: ActaInput;
  ejemplar: number;
  winnerAlcalde?: string;
  winnerConcejal?: string;
  tipo?: string;
  fecha?: string;
  elecciones?: string;
  municipio?: string;
  recinto?: string;
  numeroMesa?: string;
  /** Legacy field - extra properties allowed */
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
