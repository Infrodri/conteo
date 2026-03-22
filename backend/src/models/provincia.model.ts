import mongoose, { Document, Schema } from 'mongoose';

export interface IProvincia extends Document {
  _id: mongoose.Types.ObjectId;
  codigo: string;
  nombre: string;
  nombreLower?: string;
  createdAt: Date;
  updatedAt: Date;
}

const provinciaSchema = new Schema<IProvincia>(
  {
    codigo: {
      type: String,
      required: [true, 'El código de provincia es requerido'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre de provincia es requerido'],
      trim: true,
    },
    nombreLower: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes
provinciaSchema.index({ codigo: 1 }, { unique: true });
provinciaSchema.index({ nombre: 'text' });

export const ProvinciaModel = mongoose.model<IProvincia>('Provincia', provinciaSchema);
