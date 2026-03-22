const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scem';

async function cleanDatabase() {
  console.log('=== Conectando a MongoDB ===');
  await mongoose.connect(MONGODB_URI);
  console.log('✓ Conectado\n');

  // Nombres reales de las collections en MongoDB
  const collectionsToClean = [
    'actadigitadas',
    'mesas', 
    'recintos',
    'localidads',
    'municipios',
    'provincias',
    'candidaturas',
    'partidos',
    'users',
    'auditoriaactas'
  ];

  console.log('=== Limpiando collections ===');
  for (const name of collectionsToClean) {
    try {
      await mongoose.connection.db.collection(name).drop();
      console.log(`✓ ${name} borrada`);
    } catch (err) {
      if (err.message === 'ns not found' || err.message === 'Collection not found') {
        console.log(`○ ${name} no existía`);
      } else if (err.code === 26) {
        console.log(`○ ${name} no existía (code 26)`);
      } else {
        console.log(`✗ ${name}: ${err.message}`);
      }
    }
  }

  console.log('\n=== Verificando ===');
  const remaining = await mongoose.connection.db.listCollections().toArray();
  if (remaining.length === 0) {
    console.log('✓ Base de datos limpia');
  } else {
    console.log('Collections restantes:');
    remaining.forEach(c => console.log(`  - ${c.name}`));
  }

  await mongoose.disconnect();
  console.log('\n✓ Desconectado');
}

cleanDatabase().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
