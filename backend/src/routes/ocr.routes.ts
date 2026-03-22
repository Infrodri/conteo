import { Router } from 'express';
import { procesarActa, procesarLote } from '../controllers/ocr.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models';

const router = Router();

router.post('/procesar', authenticate, authorize(UserRole.ADMIN), procesarActa);
router.post('/procesar-lote', authenticate, authorize(UserRole.ADMIN), procesarLote);

export default router;
