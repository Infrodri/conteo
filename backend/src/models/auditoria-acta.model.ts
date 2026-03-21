import mongoose, { Document, Schema, Types } from 'mongoose';

export enum AuditoriaAccion {
  CREAR = 'CREAR',
  CORREGIR = 'CORREGIR',
  ANULAR = 'ANULAR',
}

export interface IAuditoriaActa extends Document {
  _id: mongoose.Types.ObjectId;
  actaId: Types.ObjectId;
  userId: Types.ObjectId;
  accion: AuditoriaAccion;
  valoresAnteriores: Record<string, unknown>;
  valoresNuevos: Record<string, unknown>;
  observaciones?: string;
  fecha: Date;
  createdAt: Date;
  updatedAt: Date;
}

const auditoriaActaSchema = new Schema<IAuditoriaActa>(
  {
    actaId: {
      type: Schema.Types.ObjectId,
      ref: 'Acta',
      required: [true, 'El acta es requerida'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario es requerido'],
    },
    accion: {
      type: String,
      enum: Object.values(AuditoriaAccion),
      required: [true, 'La acción es requerida'],
    },
    valoresAnteriores: {
      type: Schema.Types.Mixed,
      default: {},
    },
    valoresNuevos: {
      type: Schema.Types.Mixed,
      default: {},
    },
    observaciones: {
      type: String,
      trim: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
auditoriaActaSchema.index({ actaId: 1 });
auditoriaActaSchema.index({ userId: 1 });
auditoriaActaSchema.index({ fecha: -1 });

export const AuditoriaActaModel = mongoose.model<IAuditoriaActa>(
  'AuditoriaActa',
  auditoriaActaSchema
);
