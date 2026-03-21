import { Router } from 'express';
import { getResumen, getResultados, getResultadosMunicipio } from '@/controllers/dashboard.controller';

const router = Router();

// Dashboard público (sin autenticación para visitantes)
router.get('/resumen', getResumen);
router.get('/resultados', getResultados);
router.get('/resultados/municipio/:municipioId', getResultadosMunicipio);

export default router;
