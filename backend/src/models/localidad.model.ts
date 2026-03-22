import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILocalidad extends Document {
  _id: mongoose.Types.ObjectId;
  codigo: string;
  nombre: string;
  nombreLower?: string;
  tipo: 'MUNICIPIO' | 'LOCALIDAD';
  municipioId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const localidadSchema = new Schema<ILocalidad>(
  {
    codigo: {
      type: String,
      required: [true, 'El código de localidad es requerido'],
      trim: true,
      unique: true,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre de localidad es requerido'],
      trim: true,
    },
    tipo: {
      type: String,
      enum: ['MUNICIPIO', 'LOCALIDAD'],
      default: 'LOCALIDAD',
    },
    municipioId: {
      type: Schema.Types.ObjectId,
      ref: 'Municipio',
      default: null,
    },
    nombreLower: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes
localidadSchema.index({ tipo: 1 });
localidadSchema.index({ municipioId: 1 });
localidadSchema.index({ nombre: 'text' });

export const LocalidadModel = mongoose.model<ILocalidad>('Localidad', localidadSchema);
