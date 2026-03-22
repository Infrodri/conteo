import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRecinto extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  direccion: string;
  municipioId: Types.ObjectId;
  localidadId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const recintoSchema = new Schema<IRecinto>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del recinto es requerido'],
      trim: true,
    },
    direccion: {
      type: String,
      trim: true,
      default: '',
    },
    municipioId: {
      type: Schema.Types.ObjectId,
      ref: 'Municipio',
      required: [true, 'El municipio es requerido'],
    },
    localidadId: {
      type: Schema.Types.ObjectId,
      ref: 'Localidad',
    },
  },
  { timestamps: true }
);

// Indexes
recintoSchema.index({ municipioId: 1 });
recintoSchema.index({ localidadId: 1 });
recintoSchema.index({ nombre: 'text' });

export const RecintoModel = mongoose.model<IRecinto>('Recinto', recintoSchema);
