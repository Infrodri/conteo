import mongoose, { Document, Schema } from 'mongoose';

export interface IMunicipio extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  codigoINE: string;
  departamento: string;
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
      required: [true, 'El departamento es requerido'],
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes
municipioSchema.index({ codigoINE: 1 }, { unique: true });
municipioSchema.index({ departamento: 1 });
municipioSchema.index({ nombre: 'text' });

export const MunicipioModel = mongoose.model<IMunicipio>('Municipio', municipioSchema);
