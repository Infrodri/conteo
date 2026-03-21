import { Router } from 'express';
import {
  buscarMesa,
  getCandidaturas,
  registrarActaCompleta,
  anularActa,
  getAuditoriaActa,
} from '@/controllers/acta.controller';
import { authenticate, optionalAuth } from '@/middleware/auth.middleware';
import { UserRole } from '@/models';

const router = Router();

/**
 * @route   GET /api/actas/mesa
 * @desc    Buscar mesa por código
 * @access  Private (Operador, Admin)
 */
router.get('/mesa', authenticate, buscarMesa);

/**
 * @route   GET /api/actas/candidaturas
 * @desc    Obtener candidaturas por tipo
 * @access  Private (Operador, Admin)
 */
router.get('/candidaturas', authenticate, getCandidaturas);

/**
 * @route   POST /api/actas/registrar
 * @desc    Registrar acta completa (Alcalde + Concejil)
 * @access  Private (Operador, Admin)
 */
router.post('/registrar', authenticate, registrarActaCompleta);

/**
 * @route   PATCH /api/actas/:id/anular
 * @desc    Anular un acta
 * @access  Private (Admin only)
 */
router.patch('/:id/anular', authenticate, (req, res, next) => {
  // Inline authorization for admin-only endpoint
  if (req.user!.rol !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Solo administradores pueden anular actas',
    });
  }
  next();
}, anularActa);

/**
 * @route   GET /api/actas/:id/auditoria
 * @desc    Obtener historial de auditoría de un acta
 * @access  Private (Admin only)
 */
router.get('/:id/auditoria', authenticate, getAuditoriaActa);

export default router;
