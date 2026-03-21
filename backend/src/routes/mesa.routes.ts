import { Router } from 'express';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/models';
import {
  getMesas,
  getMesaById,
  createMesa,
  updateMesa,
  deleteMesa,
  getActasByMesa,
  upsertActa,
} from '@/controllers/mesa.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de solo lectura para operadores
router.get('/', getMesas);
router.get('/:id', getMesaById);
router.get('/:mesaId/actas', getActasByMesa);

// Rutas de escritura
router.post('/', authorize(UserRole.ADMIN), createMesa);
router.put('/:id', authorize(UserRole.ADMIN), updateMesa);
router.delete('/:id', authorize(UserRole.ADMIN), deleteMesa);

// Digitación - operadores pueden actualizar actas
router.post('/:mesaId/acta', upsertActa);

export default router;
