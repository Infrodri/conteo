import mongoose, { Document, Schema, Types } from 'mongoose';

export enum CandidaturaTipo {
  ALCALDE = 'ALCALDE',
  CONCEJAL = 'CONCEJAL',
}

export interface ICandidatura extends Document {
  _id: mongoose.Types.ObjectId;
  partidoId: Types.ObjectId;
  municipioId: Types.ObjectId;
  tipo: CandidaturaTipo;
  nombreCandidato: string;
  numeroPapeleta: number;
  posFranja?: number;
  esTitular?: boolean;
  foto?: string;
  createdAt: Date;
  updatedAt: Date;
}

const candidaturaSchema = new Schema<ICandidatura>(
  {
    partidoId: {
      type: Schema.Types.ObjectId,
      ref: 'Partido',
      required: [true, 'El partido es requerido'],
    },
    municipioId: {
      type: Schema.Types.ObjectId,
      ref: 'Municipio',
      required: [true, 'El municipio es requerido'],
    },
    tipo: {
      type: String,
      enum: Object.values(CandidaturaTipo),
      required: [true, 'El tipo de candidatura es requerido'],
    },
    nombreCandidato: {
      type: String,
      required: [true, 'El nombre del candidato es requerido'],
      trim: true,
    },
    numeroPapeleta: {
      type: Number,
      required: [true, 'El número de papeleta es requerido'],
      min: [1, 'El número de papeleta debe ser positivo'],
    },
    posFranja: {
      type: Number,
      min: 1,
    },
    esTitular: {
      type: Boolean,
      default: false,
    },
    foto: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes
candidaturaSchema.index({ tipo: 1 });
candidaturaSchema.index({ partidoId: 1 });
candidaturaSchema.index({ municipioId: 1 });
// Único: un candidato por posición dentro de un municipio y tipo
candidaturaSchema.index({ municipioId: 1, tipo: 1, numeroPapeleta: 1 }, { unique: true });

export const CandidaturaModel = mongoose.model<ICandidatura>('Candidatura', candidaturaSchema);
