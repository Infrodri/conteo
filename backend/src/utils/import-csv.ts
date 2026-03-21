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
import { ProvinciaModel, MunicipioModel, RecintoModel, MesaModel, PartidoModel, CandidaturaModel, ActaDigitadaModel, ActaDigitadaStatus, CandidaturaTipo } from '../models';

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
  // Limpiar y obtener palabras
  const words = nombre.trim().split(/\s+/).filter(w => w.length > 2);
  
  // Estrategia 1: Primera letra de cada palabra (hasta 3)
  let sigla = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  
  // Estrategia 2: Primeras letras más últimas letras si es muy corto
  if (sigla.length < 3 && words.length > 0) {
    sigla = words.map(w => w.substring(0, Math.min(2, w.length))).join('').toUpperCase();
  }
  
  // Si ya existe, agregar números
  if (existingSiglas.has(sigla)) {
    let counter = 2;
    while (existingSiglas.has(`${sigla}${counter}`)) {
      counter++;
    }
    sigla = `${sigla}${counter}`;
  }
  
  return sigla;
};

const mapAlcaldesRow = (row: Record<string, string>): {
  NombrePartido: string;
  Provincia: string;
  Municipio: string;
  Candidato: string;
  Posición: string;
  Titularidad: string;
  NombreCompleto: string;
} => {
  const getValue = (patterns: string[]): string => {
    for (const key of Object.keys(row)) {
      const normalizedKey = key.trim().toLowerCase();
      if (patterns.some(p => normalizedKey.includes(p.toLowerCase()))) {
        return row[key];
      }
    }
    return '';
  };

  return {
    NombrePartido: getValue(['partido']),
    Provincia: getValue(['provincia']),
    Municipio: getValue(['municipio']),
    Candidato: getValue(['candidato']),
    Posición: getValue(['posici', 'posicion', 'pos', 'numero']),
    Titularidad: getValue(['titularidad', 'titular', 'tipo']),
    NombreCompleto: getValue(['nombre completo', 'nombrecandidato', 'nombre', 'candidato']),
  };
};

const mapDatosRow = (row: Record<string, string>): Record<string, string | number> => {
  const result: Record<string, string | number> = {};
  
  for (const key of Object.keys(row)) {
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '');
    let value: string | number = row[key];
    
    const numericFields = ['voto1', 'voto2', 'voto3', 'voto4', 'voto5', 'voto6', 'voto7', 'voto8', 'voto9', 'voto10', 'voto11', 'voto12', 'voto13',
         'numeromesa', 'inscritoshabilitados', 'votovalidoreal', 'votoemitidoreal'];
    
    if (numericFields.some(n => normalizedKey.includes(n))) {
      value = parseInt(row[key]) || 0;
    }
    
    const keyMappings: Record<string, string> = {
      'nombreprovincia': 'NombreProvincia',
      'nombredemunicipio': 'NombreMunicipio',
      'nombremunicipio': 'NombreMunicipio',
      'nombrerecinto': 'NombreRecinto',
      'nombrelocalidad': 'NombreLocalidad',
      'numeromesa': 'NumeroMesa',
      'inscritoshabilitados': 'InscritosHabilitados',
    };
    
    for (let v = 1; v <= 13; v++) {
      keyMappings[`voto${v}`] = `voto${v}`;
    }
    
    const mappedKey = keyMappings[normalizedKey];
    if (mappedKey) {
      result[mappedKey] = value;
    }
  }
  
  return result;
};

async function cleanDB(): Promise<void> {
  log('Limpiando base de datos...', 'info');
  await Promise.all([
    ActaDigitadaModel.deleteMany({}),
    MesaModel.deleteMany({}),
    CandidaturaModel.deleteMany({}),
    RecintoModel.deleteMany({}),
    MunicipioModel.deleteMany({}),
    ProvinciaModel.deleteMany({}),
    PartidoModel.deleteMany({}),
  ]);
  log('Base de datos limpiada', 'success');
}

async function importCandidaturas(filePath: string): Promise<void> {
  log(`Importando candidaturas desde: ${path.basename(filePath)}`, 'info');
  
  const content = readFileAsUtf8(filePath);
  const delimiter = detectDelimiter(content);
  
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  });

  log(`Headers: ${Object.keys(records[0] || {}).join(', ')}`, 'info');
  log(`Total filas: ${records.length}`, 'info');

  // Recolectar todos los partidos únicos primero
  const partidosUnicos = new Set<string>();
  for (const row of records as Record<string, string>[]) {
    const mapped = mapAlcaldesRow(row);
    partidosUnicos.add(mapped.NombrePartido);
  }

  // Generar siglas únicas
  const existingSiglas = new Set<string>();
  const partidoSiglas = new Map<string, string>();
  for (const nombre of partidosUnicos) {
    const sigla = generateSigla(nombre, existingSiglas);
    existingSiglas.add(sigla);
    partidoSiglas.set(nombre, sigla);
  }

  // Crear todos los partidos primero
  log('Creando partidos...', 'info');
  for (const [nombre, sigla] of partidoSiglas) {
    await PartidoModel.findOneAndUpdate(
      { nombre },
      { nombre, sigla, color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}` },
      { upsert: true, new: true }
    );
    log(`  - ${nombre} (${sigla})`, 'info');
  }

  // Ahora importar candidaturas
  let importados = 0;
  let errores = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i] as Record<string, string>;
    try {
      const mapped = mapAlcaldesRow(row);
      const { NombrePartido, Provincia, Municipio, Candidato, Posición, Titularidad, NombreCompleto } = mapped;

      if (!NombrePartido || !Municipio) {
        throw new Error(`Faltan datos: Partido="${NombrePartido}", Municipio="${Municipio}"`);
      }

      const tipo = Candidato?.toUpperCase().includes('ALCALDE') 
        ? CandidaturaTipo.ALCALDE 
        : CandidaturaTipo.CONCEJAL;

      const partido = await PartidoModel.findOne({ nombre: NombrePartido });
      if (!partido) throw new Error(`Partido no encontrado: ${NombrePartido}`);

      // Crear Provincia
      let provincia = await ProvinciaModel.findOne({ nombre: Provincia });
      if (!provincia && Provincia) {
        provincia = await ProvinciaModel.create({
          codigo: Provincia.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'UNK',
          nombre: Provincia,
        });
      }

      // Crear Municipio
      let municipio = await MunicipioModel.findOne({ nombre: Municipio });
      if (!municipio && Municipio) {
        municipio = await MunicipioModel.create({
          nombre: Municipio,
          codigoINE: `MUN-${Municipio.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
          departamento: Provincia || '',
          provinciaId: provincia?._id,
        });
      }

      if (!municipio) throw new Error(`No se pudo crear municipio: ${Municipio}`);

      const numeroPapeleta = parseInt(Posición) || (i + 1);
      
      await CandidaturaModel.findOneAndUpdate(
        { municipioId: municipio._id, tipo, numeroPapeleta },
        {
          partidoId: partido._id,
          municipioId: municipio._id,
          tipo,
          numeroPapeleta,
          nombreCandidato: NombreCompleto || `${NombrePartido} - ${Candidato}`,
          esTitular: Titularidad?.toLowerCase().includes('titular') || false,
        },
        { upsert: true, new: true }
      );

      importados++;
    } catch (err) {
      errores++;
      log(`Fila ${i + 2}: ${err instanceof Error ? err.message : 'Error'}`, 'error');
    }
  }

  log(`Candidaturas: ${importados} importados, ${errores} errores`, 'success');
}

async function importMesas(filePath: string): Promise<void> {
  log(`Importando mesas desde: ${path.basename(filePath)}`, 'info');
  
  const content = readFileAsUtf8(filePath);
  const delimiter = detectDelimiter(content);
  
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  });

  log(`Headers: ${Object.keys(records[0] || {}).slice(0, 8).join(', ')}...`, 'info');
  log(`Total filas: ${records.length}`, 'info');

  let importados = 0;
  let errores = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i] as Record<string, string>;
    try {
      const mapped = mapDatosRow(row);
      
      const {
        NombreProvincia,
        NombreMunicipio,
        NombreLocalidad,
        NombreRecinto,
        NumeroMesa,
        InscritosHabilitados,
      } = mapped as Record<string, string | number>;

      if (!NombreMunicipio) {
        throw new Error(`Faltan datos: Municipio="${NombreMunicipio}"`);
      }

      // Crear Provincia
      let provincia = await ProvinciaModel.findOne({ nombre: String(NombreProvincia || '') });
      if (!provincia && NombreProvincia) {
        provincia = await ProvinciaModel.create({
          codigo: String(NombreProvincia).substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'UNK',
          nombre: String(NombreProvincia),
        });
      }

      // Crear Municipio
      let municipio = await MunicipioModel.findOne({ nombre: String(NombreMunicipio) });
      if (!municipio) {
        municipio = await MunicipioModel.create({
          nombre: String(NombreMunicipio),
          codigoINE: `MUN-${String(NombreMunicipio).substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
          departamento: String(NombreProvincia || ''),
          provinciaId: provincia?._id,
        });
      }

      // Crear Recinto
      let recinto = await RecintoModel.findOne({ nombre: String(NombreRecinto || ''), municipioId: municipio._id });
      if (!recinto && NombreRecinto) {
        recinto = await RecintoModel.create({
          nombre: String(NombreRecinto).trim(),
          direccion: '',
          municipioId: municipio._id,
        });
      }

      // Crear Mesa
      const numeroMesa = typeof NumeroMesa === 'number' ? NumeroMesa : parseInt(String(NumeroMesa)) || (i + 1);
      
      const mesa = await MesaModel.findOneAndUpdate(
        { numeroMesa, recintoId: recinto?._id },
        {
          numeroMesa,
          provinciaId: provincia?._id,
          municipioId: municipio._id,
          recintoId: recinto?._id,
          inscritosHabilitados: typeof InscritosHabilitados === 'number' ? InscritosHabilitados : parseInt(String(InscritosHabilitados)) || 0,
          estadoAlcalde: 'PENDIENTE',
          estadoConcejal: 'PENDIENTE',
        },
        { upsert: true, new: true }
      );

      // Importar actas con votos
      const votoFields = ['voto1', 'voto2', 'voto3', 'voto4', 'voto5', 'voto6', 'voto7', 'voto8', 'voto9', 'voto10', 'voto11', 'voto12', 'voto13'];
      
      let votoAlcaldeValido = 0;
      for (let v = 1; v <= 3; v++) {
        const key = `voto${v}`;
        if (mapped[key] !== undefined) {
          votoAlcaldeValido += Number(mapped[key]) || 0;
        }
      }

      // Crear Acta ALCALDE
      await ActaDigitadaModel.findOneAndUpdate(
        { mesaId: mesa._id, tipo: CandidaturaTipo.ALCALDE },
        {
          mesaId: mesa._id,
          tipo: CandidaturaTipo.ALCALDE,
          voto1: Number(mapped.voto1) || 0,
          voto2: Number(mapped.voto2) || 0,
          voto3: Number(mapped.voto3) || 0,
          votoValido: votoAlcaldeValido,
          votoBlanco: 0,
          votoNuloDirecto: 0,
          votoNuloDeclinacion: 0,
          totalVotoNulo: 0,
          votoEmitido: votoAlcaldeValido,
          status: ActaDigitadaStatus.VALIDA,
          digitadorId: null,
        },
        { upsert: true, new: true }
      );

      // Crear Acta CONCEJAL
      await ActaDigitadaModel.findOneAndUpdate(
        { mesaId: mesa._id, tipo: CandidaturaTipo.CONCEJAL },
        {
          mesaId: mesa._id,
          tipo: CandidaturaTipo.CONCEJAL,
          voto1: Number(mapped.voto1) || 0,
          voto2: Number(mapped.voto2) || 0,
          voto3: Number(mapped.voto3) || 0,
          voto4: Number(mapped.voto4) || 0,
          voto5: Number(mapped.voto5) || 0,
          voto6: Number(mapped.voto6) || 0,
          voto7: Number(mapped.voto7) || 0,
          voto8: Number(mapped.voto8) || 0,
          voto9: Number(mapped.voto9) || 0,
          voto10: Number(mapped.voto10) || 0,
          voto11: Number(mapped.voto11) || 0,
          voto12: Number(mapped.voto12) || 0,
          voto13: Number(mapped.voto13) || 0,
          votoValido: votoAlcaldeValido,
          votoBlanco: 0,
          votoNuloDirecto: 0,
          votoNuloDeclinacion: 0,
          totalVotoNulo: 0,
          votoEmitido: votoAlcaldeValido,
          status: ActaDigitadaStatus.VALIDA,
          digitadorId: null,
        },
        { upsert: true, new: true }
      );

      importados++;
    } catch (err) {
      errores++;
      log(`Fila ${i + 2}: ${err instanceof Error ? err.message : 'Error'}`, 'error');
    }
  }

  log(`Mesas: ${importados} importados, ${errores} errores`, 'success');
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

  // Importar candidaturas
  const alcaldesPath = path.join(__dirname, '../../data/ALCALDES.csv');
  if (fs.existsSync(alcaldesPath)) {
    await importCandidaturas(alcaldesPath);
  } else {
    log(`Archivo no encontrado: ${alcaldesPath}`, 'error');
  }

  // Importar mesas
  const datosPath = path.join(__dirname, '../../data/DATOS.csv');
  if (fs.existsSync(datosPath)) {
    await importMesas(datosPath);
  } else {
    log(`Archivo no encontrado: ${datosPath}`, 'error');
  }

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
