import { Response } from 'express';
import mongoose from 'mongoose';
import { PartidoModel } from '@/models';
import { asyncHandler } from '@/utils/async-handler';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { AuthRequest } from '@/middleware/auth.middleware';

/**
 * Obtener todos los partidos
 */
export const getPartidos = asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const partidos = await PartidoModel.find().sort({ nombre: 1 });
  res.json({ success: true, data: partidos });
});

/**
 * Obtener un partido por ID
 */
export const getPartidoById = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const partido = await PartidoModel.findById(req.params.id);
  
  if (!partido) {
    throw new NotFoundError('Partido no encontrado');
  }
  
  res.json({ success: true, data: partido });
});

/**
 * Crear un nuevo partido
 */
export const createPartido = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { nombre, sigla, color } = req.body;

  if (!nombre) {
    throw new BadRequestError('El nombre del partido es requerido');
  }

  // Verificar que no exista
  const existing = await PartidoModel.findOne({ nombre });
  if (existing) {
    throw new BadRequestError('Ya existe un partido con ese nombre');
  }

  // Generar sigla si no se proporciona
  let generatedSigla = sigla;
  if (!generatedSigla) {
    const words = nombre.trim().split(/\s+/).filter((w: string) => w.length > 2);
    generatedSigla = words.slice(0, 3).map((w: string) => w[0].toUpperCase()).join('');
    
    // Verificar duplicados y agregar número si es necesario
    let counter = 1;
    let finalSigla = generatedSigla;
    while (await PartidoModel.findOne({ sigla: finalSigla })) {
      counter++;
      finalSigla = `${generatedSigla}${counter}`;
    }
    generatedSigla = finalSigla;
  }

  // Verificar que la sigla no exista
  const siglaExists = await PartidoModel.findOne({ sigla: generatedSigla });
  if (siglaExists) {
    throw new BadRequestError('Ya existe un partido con esa sigla');
  }

  // Color por defecto si no se proporciona
  const finalColor = color || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

  const partido = await PartidoModel.create({
    nombre,
    sigla: generatedSigla,
    color: finalColor,
  });

  res.status(201).json({ success: true, data: partido });
});

/**
 * Actualizar un partido
 */
export const updatePartido = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { nombre, sigla, color } = req.body;

  const partido = await PartidoModel.findById(id);
  if (!partido) {
    throw new NotFoundError('Partido no encontrado');
  }

  // Si cambia el nombre, verificar que no exista otro con ese nombre
  if (nombre && nombre !== partido.nombre) {
    const existing = await PartidoModel.findOne({ nombre, _id: { $ne: id } });
    if (existing) {
      throw new BadRequestError('Ya existe un partido con ese nombre');
    }
    partido.nombre = nombre;
  }

  // Si cambia la sigla, verificar que no exista otra con esa sigla
  if (sigla && sigla !== partido.sigla) {
    const siglaExists = await PartidoModel.findOne({ sigla, _id: { $ne: id } });
    if (siglaExists) {
      throw new BadRequestError('Ya existe un partido con esa sigla');
    }
    partido.sigla = sigla;
  }

  if (color) {
    partido.color = color;
  }

  await partido.save();

  res.json({ success: true, data: partido });
});

/**
 * Eliminar un partido
 */
export const deletePartido = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const partido = await PartidoModel.findById(id);
  if (!partido) {
    throw new NotFoundError('Partido no encontrado');
  }

  await PartidoModel.findByIdAndDelete(id);

  res.json({ success: true, message: 'Partido eliminado correctamente' });
});
