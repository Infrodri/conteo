import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  importarCandidaturas,
  importarMesas,
  getStats,
  getProvincias,
  getMunicipios,
  getLocalidads,
  getRecintos,
  getMesas,
} from '@/controllers/admin.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { UserRole } from '@/models';

const router = Router();

// Configuración de multer para upload de CSV
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// Middleware para verificar rol admin
const requireAdmin = (req: Parameters<typeof authenticate>[0], res: Parameters<typeof authenticate>[1], next: Parameters<typeof authenticate>[2]): void => {
  authenticate(req, res, () => {
    if (req.user!.rol !== UserRole.ADMIN) {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de administrador.',
      });
      return;
    }
    next();
  });
};

// Rutas de ubicación (públicas para operadores)
router.get('/ubicacion/provincias', authenticate, getProvincias);
router.get('/ubicacion/municipios', authenticate, getMunicipios);
router.get('/ubicacion/localidades', authenticate, getLocalidads);
router.get('/ubicacion/recintos', authenticate, getRecintos);
router.get('/ubicacion/mesas', authenticate, getMesas);

// Rutas de carga (solo admin)
router.post('/import/candidaturas', requireAdmin, upload.single('file'), importarCandidaturas);
router.post('/import/mesas', requireAdmin, upload.single('file'), importarMesas);
router.get('/stats', authenticate, getStats);

export default router;
