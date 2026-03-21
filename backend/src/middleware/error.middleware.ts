import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      isOperational: err.isOperational,
    });
    return;
  }

  // Error de Mongoose - CastError (ObjectId inválido)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
    });
    return;
  }

  // Error de Mongoose - ValidationError
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: (err as unknown as { errors: Record<string, { message: string }> }).errors,
    });
    return;
  }

  // Error de Mongoose - Duplicate key
  if ((err as unknown as { code: number }).code === 11000) {
    const field = Object.keys((err as unknown as { keyValue: Record<string, string> }).keyValue)[0];
    res.status(409).json({
      success: false,
      message: `El campo '${field}' ya existe`,
    });
    return;
  }

  // Error desconocido
  console.error('ERROR:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
  });
};

export const notFoundHandler = (req: Request): void => {
  throw new AppError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`);
};
