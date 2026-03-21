import { Router } from 'express';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/models';
import {
  getCandidaturas,
  getCandidaturaById,
  createCandidatura,
  updateCandidatura,
  deleteCandidatura,
} from '@/controllers/candidatura.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de solo lectura para operadores
router.get('/', getCandidaturas);
router.get('/:id', getCandidaturaById);

// Rutas de escritura solo para admins
router.post('/', authorize(UserRole.ADMIN), createCandidatura);
router.put('/:id', authorize(UserRole.ADMIN), updateCandidatura);
router.delete('/:id', authorize(UserRole.ADMIN), deleteCandidatura);

export default router;
