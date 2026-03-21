import mongoose, { Document, Schema, Types } from 'mongoose';

export enum MesaEstado {
  PENDIENTE = 'PENDIENTE',
  PARCIAL = 'PARCIAL',
  COMPLETADA = 'COMPLETADA',
  ANULADA = 'ANULADA',
}

export interface IMesa extends Document {
  _id: mongoose.Types.ObjectId;
  numeroMesa: number;
  provinciaId: Types.ObjectId;
  municipioId: Types.ObjectId;
  localidadId?: Types.ObjectId;
  recintoId: Types.ObjectId;
  inscritosHabilitados: number;
  estadoAlcalde: MesaEstado;
  estadoConcejal: MesaEstado;
  createdAt: Date;
  updatedAt: Date;
}

const mesaSchema = new Schema<IMesa>(
  {
    numeroMesa: {
      type: Number,
      required: [true, 'El número de mesa es requerido'],
      min: [1, 'El número de mesa debe ser positivo'],
    },
    provinciaId: {
      type: Schema.Types.ObjectId,
      ref: 'Provincia',
      required: [true, 'La provincia es requerida'],
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
    recintoId: {
      type: Schema.Types.ObjectId,
      ref: 'Recinto',
      required: [true, 'El recinto es requerido'],
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
mesaSchema.index({ municipioId: 1 });
mesaSchema.index({ recintoId: 1 });
mesaSchema.index({ provinciaId: 1 });
mesaSchema.index({ estadoAlcalde: 1, estadoConcejal: 1 });
// Una mesa única por recinto
mesaSchema.index({ recintoId: 1, numeroMesa: 1 }, { unique: true });

export const MesaModel = mongoose.model<IMesa>('Mesa', mesaSchema);
