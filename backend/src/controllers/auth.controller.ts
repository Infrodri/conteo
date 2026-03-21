import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel, UserRole } from '@/models';
import { config } from '@/config';
import { asyncHandler } from '@/utils/async-handler';
import { BadRequestError, UnauthorizedError, ConflictError } from '@/utils/errors';
import { AuthRequest } from '@/middleware/auth.middleware';

const generateToken = (payload: { userId: string; email: string; rol: UserRole }): string => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: '24h' });
};

export const register = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password, nombre, rol } = req.body;

  const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ConflictError('El email ya está registrado');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = new UserModel({
    email,
    password: hashedPassword,
    nombre,
    rol: rol || UserRole.OPERADOR,
  });

  await user.save();

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
    rol: user.rol,
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
      token,
    },
  });
});

export const login = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('Email y contraseña son requeridos');
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  if (!user.activo) {
    throw new UnauthorizedError('Usuario inactivo');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
    rol: user.rol,
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
      token,
    },
  });
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;

  res.json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      createdAt: user.createdAt,
    },
  });
});
