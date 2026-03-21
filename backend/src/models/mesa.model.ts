import mongoose, { Document, Schema, Types } from 'mongoose';

export enum MesaEstado {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
  ANULADA = 'ANULADA',
}

export interface IMesa extends Document {
  _id: mongoose.Types.ObjectId;
  codigoMesa: string;
  recintoId: Types.ObjectId;
  municipioId: Types.ObjectId;
  inscritosHabilitados: number;
  estadoAlcalde: MesaEstado;
  estadoConcejal: MesaEstado;
  createdAt: Date;
  updatedAt: Date;
}

const mesaSchema = new Schema<IMesa>(
  {
    codigoMesa: {
      type: String,
      required: [true, 'El código de mesa es requerido'],
      unique: true,
      trim: true,
    },
    recintoId: {
      type: Schema.Types.ObjectId,
      ref: 'Recinto',
      required: [true, 'El recinto es requerido'],
    },
    municipioId: {
      type: Schema.Types.ObjectId,
      ref: 'Municipio',
      required: [true, 'El municipio es requerido'],
    },
    inscritosHabilitados: {
      type: Number,
      required: [true, 'El número de inscritos habilitados es requerido'],
      min: [0, 'No puede haber inscritos negativos'],
    },
    estadoAlcalde: {
      type: String,
      enum: Object.values(MesaEstado),
      default: MesaEstado.PENDIENTE,
    },
    estadoConcejal: {
      type: String,
      enum: Object.values(MesaEstado),
      default: MesaEstado.PENDIENTE,
    },
  },
  { timestamps: true }
);

// Indexes
mesaSchema.index({ codigoMesa: 1 }, { unique: true });
mesaSchema.index({ municipioId: 1 });
mesaSchema.index({ recintoId: 1 });
mesaSchema.index({ estadoAlcalde: 1, estadoConcejal: 1 });

export const MesaModel = mongoose.model<IMesa>('Mesa', mesaSchema);
