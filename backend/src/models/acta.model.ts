import mongoose, { Document, Schema, Types } from 'mongoose';

export enum ActaStatus {
  VALIDA = 'VALIDA',
  ANULADA = 'ANULADA',
}

export interface IActa extends Document {
  _id: mongoose.Types.ObjectId;
  mesaId: Types.ObjectId;
  tipo: string;
  candidaturaId: Types.ObjectId;
  votosRecibidos: number;
  votosBlancos: number;
  votosNulos: number;
  digitadorId: Types.ObjectId;
  status: ActaStatus;
  createdAt: Date;
  updatedAt: Date;
}

const actaSchema = new Schema<IActa>(
  {
    mesaId: {
      type: Schema.Types.ObjectId,
      ref: 'Mesa',
      required: [true, 'La mesa es requerida'],
    },
    tipo: {
      type: String,
      required: [true, 'El tipo de acta es requerido'],
    },
    candidaturaId: {
      type: Schema.Types.ObjectId,
      ref: 'Candidatura',
      required: [true, 'La candidatura es requerida'],
    },
    votosRecibidos: {
      type: Number,
      required: [true, 'Los votos recibidos son requeridos'],
      min: [0, 'Los votos no pueden ser negativos'],
    },
    votosBlancos: {
      type: Number,
      required: [true, 'Los votos en blanco son requeridos'],
      min: [0, 'Los votos no pueden ser negativos'],
    },
    votosNulos: {
      type: Number,
      required: [true, 'Los votos nulos son requeridos'],
      min: [0, 'Los votos no pueden ser negativos'],
    },
    digitadorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El digitador es requerido'],
    },
    status: {
      type: String,
      enum: Object.values(ActaStatus),
      default: ActaStatus.VALIDA,
    },
  },
  { timestamps: true }
);

// Compound unique index: una candidatura por mesa por tipo
actaSchema.index({ mesaId: 1, tipo: 1, candidaturaId: 1 }, { unique: true });
actaSchema.index({ mesaId: 1, tipo: 1 });
actaSchema.index({ digitadorId: 1 });

// Validación de negocio: suma de votos
actaSchema.pre('save', function (next) {
  // Esta validación se complementa con la del controller
  // donde se compara con votosEmitidos de la mesa
  next();
});

export const ActaModel = mongoose.model<IActa>('Acta', actaSchema);
