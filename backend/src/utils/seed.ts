import mongoose from 'mongoose';
import { config } from '../config';
import { ProvinciaModel, MunicipioModel, RecintoModel, MesaModel, CandidaturaModel, ActaDigitadaModel, UserModel, PartidoModel } from '../models';
import bcrypt from 'bcryptjs';

const log = {
  info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[OK]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg: string) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

const data = {
  partidos: [
    { nombre: 'MAS-IPSP', sigla: 'MAS', color: '#FF6B6B' },
    { nombre: 'Comunidad-Ciudadanos', sigla: 'CC', color: '#4ECDC4' },
    { nombre: 'UNC', sigla: 'UNC', color: '#45B7D1' },
  ],
  provincias: [
    { nombre: 'Cercado', codigo: 'CER' },
    { nombre: 'TDD', codigo: 'TDD' },
    { nombre: 'Quillacollo', codigo: 'QUI' },
  ],
  municipios: [
    { nombre: 'Cochabamba', codigoINE: 'MUN-COCHA', departamento: 'Cercado', provinciaIdx: 0 },
    { nombre: 'Camia', codigoINE: 'MUN-CAMIA', departamento: 'TDD', provinciaIdx: 1 },
    { nombre: 'Quillacollo', codigoINE: 'MUN-QUILL', departamento: 'Quillacollo', provinciaIdx: 2 },
  ],
  recintos: [
    { nombre: ' Coliseo', direccion: 'Av. Libertadores', municipioIdx: 0 },
    { nombre: ' Unidad', direccion: 'Calle Principal', municipioIdx: 0 },
    { nombre: ' Estadio', direccion: 'Plaza Central', municipioIdx: 1 },
    { nombre: ' Salon', direccion: 'Calle Norte', municipioIdx: 1 },
    { nombre: ' Teatro', direccion: 'Av. Principal', municipioIdx: 2 },
    { nombre: ' Centro', direccion: 'Plaza Sipe', municipioIdx: 2 },
  ],
};

async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri);
    log.success('Conectado a MongoDB');
  } catch (error) {
    log.error(`Error conectando a MongoDB: ${error}`);
    process.exit(1);
  }
}

async function cleanDB(): Promise<void> {
  log.warn('Limpiando base de datos...');
  await Promise.all([
    ProvinciaModel.deleteMany({}),
    MunicipioModel.deleteMany({}),
    RecintoModel.deleteMany({}),
    MesaModel.deleteMany({}),
    CandidaturaModel.deleteMany({}),
    PartidoModel.deleteMany({}),
    ActaDigitadaModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
  log.success('Base de datos limpiada');
}

async function seedPartidos(): Promise<void> {
  log.info('Creando partidos...');
  for (const p of data.partidos) {
    await PartidoModel.create({
      nombre: p.nombre,
      sigla: p.sigla,
      color: p.color,
    });
    log.success(`  Partido: ${p.nombre}`);
  }
}

async function seedProvinciasYMunicipios(): Promise<{ provinciaIds: mongoose.Types.ObjectId[]; municipioIds: mongoose.Types.ObjectId[] }> {
  log.info('Creando provincias...');
  const provinciaIds: mongoose.Types.ObjectId[] = [];
  
  for (const prov of data.provincias) {
    const created = await ProvinciaModel.create({
      codigo: prov.codigo,
      nombre: prov.nombre,
    });
    provinciaIds.push(created._id as mongoose.Types.ObjectId);
    log.success(`  Provincia: ${prov.nombre}`);
  }
  
  log.info('Creando municipios...');
  const municipioIds: mongoose.Types.ObjectId[] = [];
  
  for (const mun of data.municipios) {
    const provincia = provinciaIds[mun.provinciaIdx];
    const created = await MunicipioModel.create({
      nombre: mun.nombre,
      codigoINE: mun.codigoINE,
      departamento: mun.departamento,
      provinciaId: provincia,
    });
    municipioIds.push(created._id as mongoose.Types.ObjectId);
    log.success(`  Municipio: ${mun.nombre} (${provinciaIds[mun.provinciaIdx]})`);
  }
  
  return { provinciaIds, municipioIds };
}

async function seedRecintos(municipioIds: mongoose.Types.ObjectId[]): Promise<mongoose.Types.ObjectId[]> {
  log.info('Creando recintos...');
  const recintoIds: mongoose.Types.ObjectId[] = [];
  
  for (const rec of data.recintos) {
    const municipioId = municipioIds[rec.municipioIdx];
    const created = await RecintoModel.create({
      nombre: rec.nombre.trim(),
      direccion: rec.direccion,
      municipioId: municipioId,
    });
    recintoIds.push(created._id as mongoose.Types.ObjectId);
    log.success(`  Recinto: ${rec.nombre.trim()} (${rec.direccion})`);
  }
  
  return recintoIds;
}

async function seedMesas(provinciaIds: mongoose.Types.ObjectId[], municipioIds: mongoose.Types.ObjectId[], recintoIds: mongoose.Types.ObjectId[]): Promise<void> {
  log.info('Creando mesas...');
  const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  let mesaNum = 1;
  for (let i = 0; i < recintoIds.length; i++) {
    const recintoId = recintoIds[i];
    const municipioIdx = data.recintos[i].municipioIdx;
    
    // 2 mesas por recinto
    for (let j = 1; j <= 2; j++) {
      await MesaModel.create({
        numeroMesa: mesaNum,
        provinciaId: provinciaIds[municipioIdx],
        municipioId: municipioIds[municipioIdx],
        recintoId: recintoId,
        inscritosHabilitados: 200 + Math.floor(Math.random() * 150),
        estadoAlcalde: 'PENDIENTE',
        estadoConcejal: 'PENDIENTE',
      });
      log.success(`  Mesa ${mesaNum} (${letras[i % letras.length]}${j}) - Recinto ${data.recintos[i].nombre.trim()}`);
      mesaNum++;
    }
  }
}

async function seedCandidaturas(municipioIds: mongoose.Types.ObjectId[]): Promise<void> {
  log.info('Creando candidaturas...');
  const partidos = await PartidoModel.find().lean();
  
  for (let mIdx = 0; mIdx < municipioIds.length; mIdx++) {
    const municipioId = municipioIds[mIdx];
    
    // Candidatos ALCALDE (3 por municipio)
    for (let pos = 1; pos <= 3; pos++) {
      const partido = partidos[pos - 1];
      await CandidaturaModel.create({
        partidoId: partido._id,
        municipioId: municipioId,
        tipo: 'ALCALDE',
        numeroPapeleta: pos,
        nombreCandidato: `${partido.nombre} - Candidato Alc. ${pos}`,
        esTitular: true,
      });
    }
    
    // Candidatos CONCEJAL (2 por partido = 6 total)
    for (let pos = 1; pos <= 6; pos++) {
      const partidoIdx = Math.floor((pos - 1) / 2);
      const partido = partidos[partidoIdx];
      await CandidaturaModel.create({
        partidoId: partido._id,
        municipioId: municipioId,
        tipo: 'CONCEJAL',
        numeroPapeleta: pos,
        nombreCandidato: `${partido.nombre} - Edil ${pos}`,
        esTitular: pos % 2 === 1,
      });
    }
    
    log.success(`  Candidaturas para municipio ${municipioIds[mIdx]}`);
  }
}

async function seedUsers(): Promise<void> {
  log.info('Creando usuarios...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await UserModel.create({
    email: 'admin@scem.bo',
    password: hashedPassword,
    nombre: 'Administrador',
    rol: 'ADMIN',
    activo: true,
  });
  log.success('  Admin: admin@scem.bo / admin123');
  
  const hashedPassword2 = await bcrypt.hash('operador123', 10);
  await UserModel.create({
    email: 'operador@scem.bo',
    password: hashedPassword2,
    nombre: 'Operador Test',
    rol: 'OPERADOR',
    activo: true,
  });
  log.success('  Operador: operador@scem.bo / operador123');
}

async function seedActasPrueba(): Promise<void> {
  log.info('Creando actas de prueba...');
  const mesas = await MesaModel.find().limit(4).lean();
  const admin = await UserModel.findOne({ rol: 'ADMIN' }).lean();
  
  for (const mesa of mesas) {
    // Acta ALCALDE
    await ActaDigitadaModel.create({
      mesaId: mesa._id,
      tipo: 'ALCALDE',
      voto1: 120,
      voto2: 85,
      voto3: 45,
      votoValido: 250,
      votoBlanco: 10,
      votoNuloDirecto: 5,
      votoNuloDeclinacion: 2,
      totalVotoNulo: 7,
      votoEmitido: 267,
      digitadorId: admin!._id,
      status: 'VALIDA',
    });
    
    // Acta CONCEJAL
    await ActaDigitadaModel.create({
      mesaId: mesa._id,
      tipo: 'CONCEJAL',
      voto1: 110,
      voto2: 15,
      voto3: 90,
      voto4: 10,
      voto5: 12,
      voto6: 13,
      votoValido: 250,
      votoBlanco: 8,
      votoNuloDirecto: 6,
      votoNuloDeclinacion: 3,
      totalVotoNulo: 9,
      votoEmitido: 267,
      digitadorId: admin!._id,
      status: 'VALIDA',
    });
  }
  
  log.success('Actas de prueba creadas (4 mesas)');
}

async function run(): Promise<void> {
  const clean = process.argv.includes('--clean');
  
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     SEED SCEM - Datos de Prueba           ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  
  await connectDB();
  
  if (clean) {
    await cleanDB();
  }
  
  await seedPartidos();
  const { provinciaIds, municipioIds } = await seedProvinciasYMunicipios();
  const recintoIds = await seedRecintos(municipioIds);
  await seedMesas(provinciaIds, municipioIds, recintoIds);
  await seedCandidaturas(municipioIds);
  await seedUsers();
  await seedActasPrueba();
  
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     ✅ SEED COMPLETADO EXITOSAMENTE!      ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  log.info('Usuarios creados:');
  console.log('  👤 Admin:    admin@scem.bo / admin123');
  console.log('  👤 Operador: operador@scem.bo / operador123');
  console.log('');
  log.info('Para probar la app:');
  console.log('  1. npm run dev    (backend en /backend)');
  console.log('  2. npm run dev    (frontend en /frontend)');
  console.log('  3. Abrir http://localhost:5173');
  console.log('');
  
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((error) => {
  log.error(`Error fatal: ${error}`);
  process.exit(1);
});
