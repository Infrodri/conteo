/**
 * Script para crear el usuario administrador inicial
 * Uso: npx ts-node scripts/create-admin.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { UserModel, UserRole } from '../src/models';

dotenv.config({ path: './.env' });

const ADMIN_EMAIL = 'admin@scem.gob.bo';
const ADMIN_PASSWORD = 'Admin123456!';
const ADMIN_NOMBRE = 'Administrador Sistema';

async function createAdmin() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe
    const existingUser = await UserModel.findOne({ email: ADMIN_EMAIL });
    
    if (existingUser) {
      console.log('⚠️  El usuario admin ya existe:', ADMIN_EMAIL);
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Rol:', existingUser.rol);
      console.log('🆔 ID:', existingUser._id);
      console.log('\n💡 Si quieres cambiar la contraseña, elimina el usuario y vuelve a ejecutar.');
      
      await mongoose.connection.close();
      return;
    }

    // Crear hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // Crear usuario admin
    const admin = new UserModel({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      nombre: ADMIN_NOMBRE,
      rol: UserRole.ADMIN,
      activo: true,
    });

    await admin.save();

    console.log('\n🎉 ¡Usuario ADMIN creado exitosamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  CAMBIA ESTA CONTRASEÑA DESPUÉS DEL PRIMER LOGIN');

    await mongoose.connection.close();
    console.log('\n✅ Proceso completado. MongoDB desconectado.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al crear el usuario admin:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createAdmin();
