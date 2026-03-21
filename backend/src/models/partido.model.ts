import mongoose, { Document, Schema } from 'mongoose';

export interface IPartido extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  sigla: string;
  color: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const partidoSchema = new Schema<IPartido>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del partido es requerido'],
      trim: true,
    },
    sigla: {
      type: String,
      required: [true, 'La sigla es requerida'],
      trim: true,
      uppercase: true,
    },
    color: {
      type: String,
      required: [true, 'El color es requerido para los gráficos'],
      trim: true,
      validate: {
        validator: (v: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v),
        message: 'El color debe ser un código hexadecimal válido (ej: #FF5733)',
      },
    },
    logo: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes
partidoSchema.index({ sigla: 1 }, { unique: true });
partidoSchema.index({ nombre: 'text' });

export const PartidoModel = mongoose.model<IPartido>('Partido', partidoSchema);
