/**
 * Script para crear usuarios admin y operador
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function createUsers() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado a MongoDB\n');

    const db = mongoose.connection.db;
    const users = db!.collection('users');

    // Crear Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await users.insertOne({
      email: 'admin@scem.gob.bo',
      password: adminPassword,
      nombre: 'Administrador',
      rol: 'ADMIN',
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Admin creado:', adminResult.insertedId);

    // Crear Operador
    const operadorPassword = await bcrypt.hash('operador123', 10);
    const operadorResult = await users.insertOne({
      email: 'operador@scem.gob.bo',
      password: operadorPassword,
      nombre: 'Operador',
      rol: 'OPERADOR',
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Operador creado:', operadorResult.insertedId);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CREDENCIALES DE ACCESO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('👤 ADMIN:');
    console.log('   Email:    admin@scem.gob.bo');
    console.log('   Password: admin123');
    console.log('');
    console.log('👤 OPERADOR:');
    console.log('   Email:    operador@scem.gob.bo');
    console.log('   Password: operador123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.connection.close();
    console.log('\n✅ Proceso completado.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createUsers();
