import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from '@/config';
import { errorHandler, notFoundHandler } from '@/middleware';
import { authRoutes, actaRoutes, adminRoutes, dashboardRoutes, partidoRoutes, candidaturaRoutes, mesaRoutes } from '@/routes';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Archivos estáticos para CSVs de ejemplo
  app.use('/downloads', express.static(path.join(process.cwd(), 'public', 'csv')));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/actas', actaRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/partidos', partidoRoutes);
  app.use('/api/candidaturas', candidaturaRoutes);
  app.use('/api/mesas', mesaRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
