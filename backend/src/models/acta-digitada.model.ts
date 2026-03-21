import mongoose, { Document, Schema, Types } from 'mongoose';
import { CandidaturaTipo } from './candidatura.model';

export enum ActaDigitadaStatus {
  PARCIAL = 'PARCIAL',
  VALIDA = 'VALIDA',
  ANULADA = 'ANULADA',
}

export interface IActaDigitada extends Document {
  _id: mongoose.Types.ObjectId;
  mesaId: Types.ObjectId;
  tipo: CandidaturaTipo;
  // Votos por candidato (según posición/franja)
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
  // Totales del acta
  votoValido: number;
  votoBlanco: number;
  votoNuloDirecto: number;
  votoNuloDeclinacion: number;
  totalVotoNulo: number;
  votoEmitido: number;
  // Datos del acta física (validación)
  votoValidoReal?: number;
  votoEmitidoReal?: number;
  // Metadata
  digitadorId: Types.ObjectId;
  status: ActaDigitadaStatus;
  observaciones?: string;
  fechaDigitacion: Date;
  createdAt: Date;
  updatedAt: Date;
}

const actaDigitadaSchema = new Schema<IActaDigitada>(
  {
    mesaId: {
      type: Schema.Types.ObjectId,
      ref: 'Mesa',
      required: [true, 'La mesa es requerida'],
    },
    tipo: {
      type: String,
      enum: Object.values(CandidaturaTipo),
      required: [true, 'El tipo de acta es requerido'],
    },
    // Votos por candidato (1-13)
    voto1: { type: Number, default: 0, min: 0 },
    voto2: { type: Number, default: 0, min: 0 },
    voto3: { type: Number, default: 0, min: 0 },
    voto4: { type: Number, default: 0, min: 0 },
    voto5: { type: Number, default: 0, min: 0 },
    voto6: { type: Number, default: 0, min: 0 },
    voto7: { type: Number, default: 0, min: 0 },
    voto8: { type: Number, default: 0, min: 0 },
    voto9: { type: Number, default: 0, min: 0 },
    voto10: { type: Number, default: 0, min: 0 },
    voto11: { type: Number, default: 0, min: 0 },
    voto12: { type: Number, default: 0, min: 0 },
    voto13: { type: Number, default: 0, min: 0 },
    // Totales
    votoValido: {
      type: Number,
      required: [true, 'El voto válido es requerido'],
      min: 0,
    },
    votoBlanco: {
      type: Number,
      required: [true, 'El voto blanco es requerido'],
      default: 0,
      min: 0,
    },
    votoNuloDirecto: {
      type: Number,
      required: [true, 'El voto nulo directo es requerido'],
      default: 0,
      min: 0,
    },
    votoNuloDeclinacion: {
      type: Number,
      required: [true, 'El voto nulo por declinación es requerido'],
      default: 0,
      min: 0,
    },
    totalVotoNulo: {
      type: Number,
      required: [true, 'El total de votos nulos es requerido'],
      default: 0,
      min: 0,
    },
    votoEmitido: {
      type: Number,
      required: [true, 'El voto emitido es requerido'],
      min: 0,
    },
    // Validación con acta física
    votoValidoReal: { type: Number, min: 0 },
    votoEmitidoReal: { type: Number, min: 0 },
    // Metadata
    digitadorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El digitador es requerido'],
    },
    status: {
      type: String,
      enum: Object.values(ActaDigitadaStatus),
      default: ActaDigitadaStatus.PARCIAL,
    },
    observaciones: { type: String, trim: true },
    fechaDigitacion: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
actaDigitadaSchema.index({ mesaId: 1, tipo: 1 }, { unique: true });
actaDigitadaSchema.index({ digitadorId: 1 });
actaDigitadaSchema.index({ status: 1 });

export const ActaDigitadaModel = mongoose.model<IActaDigitada>('ActaDigitada', actaDigitadaSchema);
