/**
 * Script para limpiar la base de datos SCEM
 * Uso: npx ts-node scripts/clean-db.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scem';

async function cleanDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado\n');

    const db = mongoose.connection.db;
    if (!db) throw new Error('No se pudo obtener la conexión a la BD');

    // Lista de colecciones a limpiar
    const collections = [
      'actadigitadas',
      'mesas', 
      'candidaturas',
      'partidos',
      'recintos',
      'localidads',
      'municipios',
      'provincias',
      'users', // Opcional: comentar si querés mantener usuarios
    ];

    console.log('🗑️  Limpiando colecciones...\n');

    for (const collName of collections) {
      const collection = db.collection(collName);
      const count = await collection.countDocuments();
      if (count > 0) {
        await collection.deleteMany({});
        console.log(`   ✅ ${collName}: ${count} documentos eliminados`);
      } else {
        console.log(`   ⚪ ${collName}: vacía (sin cambios)`);
      }
    }

    console.log('\n🎉 Base de datos limpiada correctamente!');

    // Mostrar estado final
    console.log('\n📊 Estado final de colecciones:');
    for (const collName of collections) {
      const count = await db.collection(collName).countDocuments();
      console.log(`   ${collName}: ${count} documentos`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Desconectado de MongoDB');
    process.exit(0);
  }
}

cleanDatabase();
