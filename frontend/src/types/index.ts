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

export interface ActaPayload {
  mesaId: string;
  votosEmitidos: number;
  alcalde: ActaInput;
  alcaldeVacio?: ActaInput;
  ganadorAlcalde: string;
  ganadorConcejal: string;
  ejemplar: number;
  劇場: string;
  劇場Concejal: string;
  tipoMesa: string;
  fecha: string;
  prefectural?: string;
  municipal?: string;
  provincial?: string;
  regional?: string;
  concejal: ActaInput;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
