import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ MongoDB conectado');

    // Create and start app
    const app = createApp();

    app.listen(config.port, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${config.port}`);
      console.log(`📦 Entorno: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

startServer();
