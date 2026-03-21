import { Router, Response, NextFunction } from 'express';
import {
  buscarMesa,
  getCandidaturas,
  getActasMesa,
  guardarActaDigitada,
  anularActaDigitada,
  getAuditoriaActa,
  getMesasObservadas,
  desbloquearMesa,
} from '@/controllers/acta.controller';
import { authenticate, AuthRequest } from '@/middleware/auth.middleware';
import { UserRole } from '@/models';

const router = Router();

/**
 * @route   GET /api/actas/mesa
 * @desc    Buscar mesa por filtros
 * @access  Private (Operador, Admin)
 */
router.get('/mesa', authenticate, buscarMesa);

/**
 * @route   GET /api/actas/candidaturas
 * @desc    Obtener candidaturas por municipio y tipo
 * @access  Private (Operador, Admin)
 */
router.get('/candidaturas', authenticate, getCandidaturas);

/**
 * @route   GET /api/actas/mesa/:mesaId/actas
 * @desc    Obtener actas de una mesa
 * @access  Private (Operador, Admin)
 */
router.get('/mesa/:mesaId/actas', authenticate, getActasMesa);

/**
 * @route   POST /api/actas/mesa/:mesaId/acta
 * @desc    Guardar/actualizar acta digitada (parcial o confirmar)
 * @access  Private (Operador, Admin)
 */
router.post('/mesa/:mesaId/acta', authenticate, guardarActaDigitada);

/**
 * @route   PATCH /api/actas/:id/anular
 * @desc    Anular un acta
 * @access  Private (Admin only)
 */
router.patch('/:id/anular', authenticate, (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.user!.rol !== UserRole.ADMIN) {
    return _res.status(403).json({
      success: false,
      message: 'Solo administradores pueden anular actas',
    });
  }
  next();
}, anularActaDigitada);

/**
 * @route   GET /api/actas/:id/auditoria
 * @desc    Obtener historial de auditoría de un acta
 * @access  Private (Admin only)
 */
router.get('/:id/auditoria', authenticate, getAuditoriaActa);

/**
 * @route   GET /api/actas/mesas-observadas
 * @desc    Obtener lista de mesas con filtros para observación admin
 * @access  Private (Admin only)
 */
router.get('/mesas-observadas', authenticate, (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.user!.rol !== UserRole.ADMIN) {
    return _res.status(403).json({
      success: false,
      message: 'Solo administradores pueden ver esta información',
    });
  }
  next();
}, getMesasObservadas);

/**
 * @route   POST /api/actas/mesa/:id/desbloquear
 * @desc    Desbloquear una sección de mesa (resetear digitadorId)
 * @access  Private (Admin only)
 */
router.post('/mesa/:id/desbloquear', authenticate, (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.user!.rol !== UserRole.ADMIN) {
    return _res.status(403).json({
      success: false,
      message: 'Solo administradores pueden desbloquear mesas',
    });
  }
  next();
}, desbloquearMesa);

export default router;
