import { Request, Response, NextFunction } from 'express';
import { procesarImagenBase64, procesarLoteBase64 } from '../services/ocr.service';
import { BadRequestError } from '../utils/errors';

interface ProcesarActaBody {
  imagen: string;
}

interface ProcesarLoteBody {
  imagenes: { base64: string; seccion?: 'ALCALDE' | 'CONCEJAL' }[];
}

export const procesarActa = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { imagen } = req.body as ProcesarActaBody;

    if (!imagen) {
      throw new BadRequestError('Imagen en base64 es requerida');
    }

    const resultado = await procesarImagenBase64(imagen);

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
};

export const procesarLote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { imagenes } = req.body as ProcesarLoteBody;

    if (!imagenes || !Array.isArray(imagenes) || imagenes.length === 0) {
      throw new BadRequestError('Array de imágenes es requerido');
    }

    if (imagenes.length > 52) {
      throw new BadRequestError('Máximo 52 imágenes por lote');
    }

    const resultados = await procesarLoteBase64(imagenes);

    res.json({
      success: true,
      data: resultados,
      total: resultados.length,
    });
  } catch (error) {
    next(error);
  }
};
