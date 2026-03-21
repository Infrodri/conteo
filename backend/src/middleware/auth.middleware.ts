import { Response, Request, NextFunction } from 'express';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { UserModel, UserRole } from '@/models';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors';
import { IUser } from '@/models/user.model';

export interface JwtPayload {
  userId: string;
  email: string;
  rol: UserRole;
}

export interface AuthRequest extends Omit<Request, 'file'> {
  user?: IUser;
  userPayload?: JwtPayload;
  file?: MulterFile;
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token no proporcionado');
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    const user = await UserModel.findById(decoded.userId).select('-password');
    
    if (!user) {
      throw new UnauthorizedError('Usuario no encontrado');
    }
    
    if (!user.activo) {
      throw new UnauthorizedError('Usuario inactivo');
    }
    
    req.user = user;
    req.userPayload = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Token inválido'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expirado'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: UserRole[]): (req: AuthRequest, res: Response, next: NextFunction) => void => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('No autenticado'));
      return;
    }
    
    if (!roles.includes(req.user.rol)) {
      next(new ForbiddenError('No tienes permisos para esta acción'));
      return;
    }
    
    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const user = await UserModel.findById(decoded.userId).select('-password');
    
    if (user && user.activo) {
      req.user = user;
      req.userPayload = decoded;
    }
    
    next();
  } catch {
    // Token inválido pero es opcional, continuar
    next();
  }
};
