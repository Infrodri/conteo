import { Router } from 'express';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/models';
import {
  getPartidos,
  getPartidoById,
  createPartido,
  updatePartido,
  deletePartido,
} from '@/controllers/partido.controller';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

// CRUD de Partidos
router.get('/', getPartidos);
router.get('/:id', getPartidoById);
router.post('/', createPartido);
router.put('/:id', updatePartido);
router.delete('/:id', deletePartido);

export default router;
