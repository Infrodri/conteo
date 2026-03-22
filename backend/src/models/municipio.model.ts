import mongoose, { Document, Schema } from 'mongoose';

export interface IMunicipio extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  nombreLower?: string;
  codigoINE: string;
  departamento: string;
  provinciaId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const municipioSchema = new Schema<IMunicipio>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del municipio es requerido'],
      trim: true,
    },
    codigoINE: {
      type: String,
      required: [true, 'El código INE es requerido'],
      unique: true,
      trim: true,
    },
    departamento: {
      type: String,
      trim: true,
    },
    provinciaId: {
      type: Schema.Types.ObjectId,
      ref: 'Provincia',
    },
    nombreLower: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes
municipioSchema.index({ departamento: 1 });
municipioSchema.index({ nombre: 'text' });

export const MunicipioModel = mongoose.model<IMunicipio>('Municipio', municipioSchema);
