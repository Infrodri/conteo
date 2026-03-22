/**
 * Script para importar datos desde CSV en la carpeta data/
 * Uso: npm run import:csv
 */
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { config } from '../config';
import { ProvinciaModel, MunicipioModel, LocalidadModel, RecintoModel, MesaModel, PartidoModel, CandidaturaModel, ActaDigitadaModel, ActaDigitadaStatus, CandidaturaTipo } from '../models';

const log = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
  const colors = { info: '\x1b[36m', success: '\x1b[32m', error: '\x1b[31m' };
  console.log(`${colors[type]}[${type.toUpperCase()}]\x1b[0m ${msg}`);
};

const readFileAsUtf8 = (filePath: string): string => {
  const buffer = fs.readFileSync(filePath);
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.toString('utf8', 3);
  }
  return iconv.decode(buffer, 'win1252');
};

const detectDelimiter = (content: string): string => {
  const firstLine = content.split('\n')[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  if (semicolonCount >= commaCount && semicolonCount >= tabCount) return ';';
  if (tabCount >= commaCount) return '\t';
  return ',';
};

// Generar sigla única a partir del nombre
const generateSigla = (nombre: string, existingSiglas: Set<string>): string => {
  const words = nombre.trim().split(/\s+/).filter(w => w.length > 2);
  let sigla = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  
  if (sigla.length < 3 && words.length > 0) {
    sigla = words.map(w => w.substring(0, Math.min(2, w.length))).join('').toUpperCase();
  }
  
  if (existingSiglas.has(sigla)) {
    let counter = 2;
    while (existingSiglas.has(`${sigla}${counter}`)) {
      counter++;
    }
    sigla = `${sigla}${counter}`;
  }
  
  return sigla;
};

// Normalizar texto para comparación
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s]/g, '') // Quitar caracteres especiales
    .trim();
};

// Buscar o crear provincia
const getOrCreateProvincia = async (nombre: string): Promise<{ _id: mongoose.Types.ObjectId }> => {
  const normalized = normalizeText(nombre);
  let provincia = await ProvinciaModel.findOne({ nombreLower: normalized });
  
  if (!provincia && nombre) {
    provincia = await ProvinciaModel.create({
      nombre: nombre.trim(),
      nombreLower: normalized,
      codigo: nombre.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'UNK',
    });
  }
  
  return provincia!;
};

// Buscar o crear municipio
const getOrCreateMunicipio = async (nombre: string, provinciaId?: mongoose.Types.ObjectId): Promise<{ _id: mongoose.Types.ObjectId }> => {
  const normalized = normalizeText(nombre);
  let municipio = await MunicipioModel.findOne({ nombreLower: normalized });
  
  if (!municipio && nombre) {
    municipio = await MunicipioModel.create({
      nombre: nombre.trim(),
      nombreLower: normalized,
      codigoINE: `MUN-${nombre.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
      departamento: '',
      provinciaId: provinciaId,
    });
  }
  
  return municipio!;
};

// Buscar o crear localidad
const getOrCreateLocalidad = async (nombre: string, municipioId: mongoose.Types.ObjectId): Promise<{ _id: mongoose.Types.ObjectId }> => {
  const normalized = normalizeText(nombre);
  let localidad = await LocalidadModel.findOne({ 
    nombreLower: normalized, 
    municipioId: municipioId 
  });
  
  if (!localidad && nombre) {
    localidad = await LocalidadModel.create({
      nombre: nombre.trim(),
      nombreLower: normalized,
      codigo: nombre.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'UNK',
      tipo: 'LOCALIDAD',
      municipioId: municipioId,
    });
  }
  
  return localidad!;
};

// Buscar o crear recinto
const getOrCreateRecinto = async (nombre: string, municipioId: mongoose.Types.ObjectId, localidadId?: mongoose.Types.ObjectId): Promise<{ _id: mongoose.Types.ObjectId }> => {
  const normalized = normalizeText(nombre);
  let recinto = await RecintoModel.findOne({ 
    nombreLower: normalized, 
    municipioId: municipioId 
  });
  
  if (!recinto && nombre) {
    recinto = await RecintoModel.create({
      nombre: nombre.trim(),
      nombreLower: normalized,
      direccion: '',
      municipioId: municipioId,
      localidadId: localidadId,
    });
  } else if (recinto && localidadId && !recinto.localidadId) {
    recinto.localidadId = localidadId;
    await recinto.save();
  }
  
  return recinto!;
};

async function cleanDB(): Promise<void> {
  log('Limpiando base de datos...', 'info');
  await Promise.all([
    ActaDigitadaModel.deleteMany({}),
    MesaModel.deleteMany({}),
    CandidaturaModel.deleteMany({}),
    RecintoModel.deleteMany({}),
    LocalidadModel.deleteMany({}),
    MunicipioModel.deleteMany({}),
    ProvinciaModel.deleteMany({}),
    PartidoModel.deleteMany({}),
  ]);
  log('Base de datos limpiada', 'success');
}

// Actualizar modelos para agregar nombreLower
async function setupSchemas(): Promise<void> {
  // Agregar índice a Provincia si no existe
  try {
    await ProvinciaModel.collection.createIndex({ nombreLower: 1 }, { unique: true, sparse: true });
  } catch {}
  
  try {
    await MunicipioModel.collection.createIndex({ nombreLower: 1 }, { unique: true, sparse: true });
  } catch {}
  
  try {
    await LocalidadModel.collection.createIndex({ nombreLower: 1, municipioId: 1 }, { unique: true, sparse: true });
  } catch {}
  
  try {
    await RecintoModel.collection.createIndex({ nombreLower: 1, municipioId: 1 }, { unique: true, sparse: true });
  } catch {}
}

async function importDataAndMesas(): Promise<void> {
  log('Configurando esquemas...', 'info');
  await setupSchemas();
  
  // El CSV de DATOS.csv tiene toda la información
  const datosPath = path.join(__dirname, '../../data/DATOS.csv');
  
  if (!fs.existsSync(datosPath)) {
    log(`Archivo no encontrado: ${datosPath}`, 'error');
    return;
  }
  
  log(`Importando desde: ${path.basename(datosPath)}`, 'info');
  
  const content = readFileAsUtf8(datosPath);
  const delimiter = detectDelimiter(content);
  
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  });
  
  log(`Headers: ${Object.keys(records[0] || {}).slice(0, 6).join(', ')}...`, 'info');
  log(`Total filas: ${records.length}`, 'info');
  
  let importados = 0;
  let errores = 0;
  
  // Procesar cada fila de DATOS.csv
  for (let i = 0; i < records.length; i++) {
    const row = records[i] as Record<string, string>;
    
    try {
      const codigoMesa = row['CodigoMesa'] || row['CodigoMesa'.toLowerCase()] || '';
      const nombreDepto = row['NombreDepartamento'] || row['NombreDepartamento'.toLowerCase()] || '';
      const nombreProvincia = row['NombreProvincia'] || row['NombreProvincia'.toLowerCase()] || '';
      const nombreMunicipio = row['NombreMunicipio'] || row['NombreMunicipio'.toLowerCase()] || '';
      const nombreLocalidad = row['NombreLocalidad'] || row['NombreLocalidad'.toLowerCase()] || '';
      const nombreRecinto = row['NombreRecinto'] || row['NombreRecinto'.toLowerCase()] || '';
      const numeroMesa = parseInt(row['NumeroMesa'] || row['NumeroMesa'.toLowerCase()] || '0') || (i + 1);
      const inscritos = parseInt(row['InscritosHabilitados'] || row['InscritosHabilitados'.toLowerCase()] || '0') || 0;
      
      // Votos
      const votos: number[] = [];
      for (let v = 1; v <= 13; v++) {
        const key1 = `Voto${v}`;
        const key2 = `Voto${v}`.toLowerCase();
        votos.push(parseInt(row[key1] || row[key2] || '0') || 0);
      }
      
      // Crear/obtener ubicación
      const provincia = await getOrCreateProvincia(nombreProvincia);
      const municipio = await getOrCreateMunicipio(nombreMunicipio, provincia?._id);
      const localidad = await getOrCreateLocalidad(nombreLocalidad, municipio._id);
      const recinto = await getOrCreateRecinto(nombreRecinto, municipio._id, localidad?._id);
      
      // Crear o actualizar mesa
      const mesa = await MesaModel.findOneAndUpdate(
        { numeroMesa, recintoId: recinto._id },
        {
          numeroMesa,
          provinciaId: provincia?._id,
          municipioId: municipio._id,
          localidadId: localidad?._id,
          recintoId: recinto._id,
          inscripitosHabilitados: inscritos,
          estadoAlcalde: 'PENDIENTE',
          estadoConcejal: 'PENDIENTE',
        },
        { upsert: true, new: true }
      );
      
      // Crear actas para ALCALDE y CONCEJAL
      const sumaVotos = votos.slice(0, 3).reduce((a, b) => a + b, 0);
      
      // Acta ALCALDE (votos 1-3)
      await ActaDigitadaModel.findOneAndUpdate(
        { mesaId: mesa._id, tipo: CandidaturaTipo.ALCALDE },
        {
          mesaId: mesa._id,
          tipo: CandidaturaTipo.ALCALDE,
          voto1: votos[0] || 0,
          voto2: votos[1] || 0,
          voto3: votos[2] || 0,
          votoValido: sumaVotos,
          votoBlanco: 0,
          votoNuloDirecto: 0,
          votoNuloDeclinacion: 0,
          totalVotoNulo: 0,
          votoEmitido: sumaVotos,
          status: ActaDigitadaStatus.VALIDA,
        },
        { upsert: true, new: true }
      );
      
      // Acta CONCEJAL (votos 1-13)
      await ActaDigitadaModel.findOneAndUpdate(
        { mesaId: mesa._id, tipo: CandidaturaTipo.CONCEJAL },
        {
          mesaId: mesa._id,
          tipo: CandidaturaTipo.CONCEJAL,
          voto1: votos[0] || 0,
          voto2: votos[1] || 0,
          voto3: votos[2] || 0,
          voto4: votos[3] || 0,
          voto5: votos[4] || 0,
          voto6: votos[5] || 0,
          voto7: votos[6] || 0,
          voto8: votos[7] || 0,
          voto9: votos[8] || 0,
          voto10: votos[9] || 0,
          voto11: votos[10] || 0,
          voto12: votos[11] || 0,
          voto13: votos[12] || 0,
          votoValido: sumaVotos,
          votoBlanco: 0,
          votoNuloDirecto: 0,
          votoNuloDeclinacion: 0,
          totalVotoNulo: 0,
          votoEmitido: sumaVotos,
          status: ActaDigitadaStatus.VALIDA,
        },
        { upsert: true, new: true }
      );
      
      importados++;
      
      if (importados % 10 === 0) {
        log(`Procesados: ${importados}/${records.length}`, 'info');
      }
      
    } catch (err) {
      errores++;
      log(`Fila ${i + 2}: ${err instanceof Error ? err.message : 'Error'}`, 'error');
    }
  }
  
  log(`Mesas y actas: ${importados} importados, ${errores} errores`, 'success');
}

async function importPartidos(): Promise<void> {
  const partidoPath = path.join(__dirname, '../../data/ALCALDES.csv');
  
  if (!fs.existsSync(partidoPath)) {
    log(`Archivo no encontrado: ${partidoPath}`, 'error');
    return;
  }
  
  log(`Importando partidos desde: ${path.basename(partidoPath)}`, 'info');
  
  const content = readFileAsUtf8(partidoPath);
  const delimiter = detectDelimiter(content);
  
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  });
  
  log(`Partidos CSV: ${records.length} filas`, 'info');
  
  // Extraer partidos únicos
  const partidosUnicos = new Set<string>();
  for (const row of records as Record<string, string>[]) {
    const nombreKey = Object.keys(row).find(k => k.toLowerCase().includes('partido'));
    if (nombreKey && row[nombreKey]) {
      partidosUnicos.add(row[nombreKey].trim());
    }
  }
  
  // Crear partidos
  const existingSiglas = new Set<string>();
  for (const nombre of partidosUnicos) {
    const sigla = generateSigla(nombre, existingSiglas);
    existingSiglas.add(sigla);
    
    await PartidoModel.findOneAndUpdate(
      { nombre },
      { 
        nombre, 
        sigla, 
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}` 
      },
      { upsert: true, new: true }
    );
    
    log(`  - ${nombre} (${sigla})`, 'info');
  }
  
  log(`Partidos: ${partidosUnicos.size} creados`, 'success');
  
  // Crear candidaturas
  let importados = 0;
  let errores = 0;
  
  for (const row of records as Record<string, string>[]) {
    try {
      // Encontrar las columnas
      const getVal = (patterns: string[]): string => {
        for (const key of Object.keys(row)) {
          const normalized = key.toLowerCase();
          if (patterns.some(p => normalized.includes(p.toLowerCase()))) {
            return row[key] || '';
          }
        }
        return '';
      };
      
      const nombrePartido = getVal(['partido']);
      const candidato = getVal(['candidato']);
      const posicion = parseInt(getVal(['posic'])) || 1;
      const nombreCompleto = getVal(['nombre completo', 'nombre']) || candidato;
      const titularidad = getVal(['titular']);
      
      if (!nombrePartido) {
        throw new Error('Partido vacío');
      }
      
      const tipo = candidato.toUpperCase().includes('ALCALDE') 
        ? CandidaturaTipo.ALCALDE 
        : CandidaturaTipo.CONCEJAL;
      
      const partido = await PartidoModel.findOne({ nombre: nombrePartido });
      if (!partido) throw new Error(`Partido no encontrado: ${nombrePartido}`);
      
      // Buscar municipio Puna
      const municipio = await MunicipioModel.findOne({ nombreLower: normalizeText('Puna') });
      if (!municipio) throw new Error('Municipio Puna no encontrado');
      
      // Crear candidatura SIN upsert (el CSV tiene duplicados en posicion)
      await CandidaturaModel.create({
        partidoId: partido._id,
        municipioId: municipio._id,
        tipo,
        numeroPapeleta: posicion,
        nombreCandidato: nombreCompleto || `${nombrePartido} - ${candidato}`,
        esTitular: titularidad.toLowerCase().includes('titular'),
      });
      
      importados++;
      
    } catch (err) {
      errores++;
      log(`Candidatura: ${err instanceof Error ? err.message : 'Error'}`, 'error');
    }
  }
  
  log(`Candidaturas: ${importados} importados, ${errores} errores`, 'success');
}

async function run(): Promise<void> {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     IMPORT CSV - Importación Masiva       ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  await mongoose.connect(config.mongodb.uri);
  log('Conectado a MongoDB', 'success');

  // Limpiar base de datos
  await cleanDB();

  // 1. Primero importar datos geográficos y mesas desde DATOS.csv
  await importDataAndMesas();

  // 2. Luego importar partidos y candidaturas
  await importPartidos();

  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     ✅ IMPORTACIÓN COMPLETADA             ║');
  console.log('╚════════════════════════════════════════════╝');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  log(`Error fatal: ${err.message}`, 'error');
  process.exit(1);
});
