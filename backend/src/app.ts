import express, { Application } from 'express';
import cors from 'cors';
import { config } from '@/config';
import { errorHandler, notFoundHandler } from '@/middleware';
import { authRoutes, actaRoutes } from '@/routes';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/actas', actaRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
