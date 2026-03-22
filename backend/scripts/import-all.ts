/**
 * Script para importar candidatos y mesas desde CSV
 * Uso: npx tsx scripts/import-all.ts
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { 
  ProvinciaModel, 
  MunicipioModel, 
  RecintoModel, 
  MesaModel, 
  PartidoModel, 
  CandidaturaModel,
  CandidaturaTipo,
  LocalidadModel,
  ActaDigitadaModel,
  ActaDigitadaStatus
} from '../src/models';

dotenv.config({ path: './.env' });

// Simular usuario autenticado
const mockUser = { _id: new mongoose.Types.ObjectId() };

// ============ HELPERS ============

const readFileAsUtf8 = (filePath: string): string => {
  const buffer = fs.readFileSync(filePath);
  
  // Detectar BOM UTF-8
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.toString('utf8', 3);
  }
  
  // Detectar Windows-1252/Latin-1
  let latin1Count = 0;
  for (let i = 0; i < Math.min(buffer.length, 5000); i++) {
    const byte = buffer[i];
    if (byte >= 0xC0 && byte <= 0xFF) latin1Count++;
    if (byte >= 0x80 && byte <= 0x9F) latin1Count += 5;
  }
  
  if (latin1Count > 5) {
    const iconv = require('iconv-lite');
    return iconv.decode(buffer, 'win1252');
  }
  
  return buffer.toString('utf8');
};

const mapAlcaldesRow = (row: Record<string, string>) => {
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
    NombrePartido: getValue(['nombre del partido', 'partido']),
    Provincia: getValue(['provincia']),
    Municipio: getValue(['municipio']),
    Candidato: getValue(['candidato']),
    Posición: getValue(['posición', 'posicion', 'pos', 'numero', 'num']),
    Titularidad: getValue(['titularidad', 'titular', 'tipo']),
    NombreCompleto: getValue(['nombre completo', 'nombrecandidato', 'nombre', 'candidato']),
  };
};

const mapDatosRow = (row: Record<string, string>): Record<string, string | number> => {
  const result: Record<string, string | number> = {};
  
  for (const key of Object.keys(row)) {
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '');
    let value: string | number = row[key];
    
    if (['voto1', 'voto2', 'voto3', 'voto4', 'voto5', 'voto6', 'voto7', 'voto8', 'voto9', 'voto10', 'voto11', 'voto12', 'voto13',
         'numeromesa', 'inscritoshabilitados', 'votovalidoreal', 'votoemitidoreal'].some(n => normalizedKey.includes(n.toLowerCase()))) {
      value = parseInt(row[key]) || 0;
    }
    
    const keyMappings: Record<string, string> = {
      'nombreprovincia': 'NombreProvincia',
      'nombredemunicipio': 'NombreMunicipio',
      'nombremunicipio': 'NombreMunicipio',
      'nombrerecinto': 'NombreRecinto',
      'nombreslocalidad': 'NombreLocalidad',
      'nombrlocalidad': 'NombreLocalidad',
      'nombrelocalidad': 'NombreLocalidad',
      'numeromesa': 'NumeroMesa',
      'inscritoshabilitados': 'InscritosHabilitados',
      'voto1': 'voto1',
      'voto2': 'voto2',
      'voto3': 'voto3',
      'voto4': 'voto4',
      'voto5': 'voto5',
      'voto6': 'voto6',
      'voto7': 'voto7',
      'voto8': 'voto8',
      'voto9': 'voto9',
      'voto10': 'voto10',
      'voto11': 'voto11',
      'voto12': 'voto12',
      'voto13': 'voto13',
      'votovalidoreal': 'votoValidoReal',
      'votoemitidoreal': 'votoEmitidoReal',
    };
    
    const mappedKey = keyMappings[normalizedKey];
    if (mappedKey) {
      result[mappedKey] = value;
    }
  }
  
  return result;
};

// ============ IMPORTAR CANDIDATURAS ============

async function importarCandidaturas(archivo: string) {
  console.log(`\n📄 Importando candidaturas desde: ${archivo}`);
  
  const csvContent = readFileAsUtf8(archivo);
  const delimiter = csvContent.includes(';') ? ';' : ',';
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  });

  console.log(`   Total filas: ${records.length}`);

  let importados = 0;
  let errores = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i] as Record<string, string>;
    try {
      const mapped = mapAlcaldesRow(row);
      const { NombrePartido, Provincia, Municipio, Candidato, Posición, Titularidad, NombreCompleto } = mapped;

      if (!NombrePartido || !Municipio) {
        throw new Error(`Faltan datos requeridos`);
      }

      const tipo = Candidato?.toUpperCase().includes('ALCALDE') 
        ? CandidaturaTipo.ALCALDE 
        : CandidaturaTipo.CONCEJAL;

      // Crear o buscar Partido
      let partido = await PartidoModel.findOne({ nombre: NombrePartido });
      if (!partido) {
        const sigla = NombrePartido.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
        partido = await PartidoModel.create({
          nombre: NombrePartido,
          sigla: sigla || 'UNK',
          color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        });
      }

      // Buscar o crear Provincia
      let provincia = await ProvinciaModel.findOne({ nombre: Provincia });
      if (!provincia && Provincia) {
        provincia = await ProvinciaModel.create({
          codigo: Provincia.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'UNK',
          nombre: Provincia,
        });
      }

      // Buscar o crear Municipio
      let municipio = await MunicipioModel.findOne({ nombre: Municipio });
      if (!municipio && Municipio) {
        municipio = await MunicipioModel.create({
          nombre: Municipio,
          codigoINE: `MUN-${Municipio.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
          departamento: Provincia || '',
        });
      }

      if (!municipio) {
        throw new Error(`No se pudo crear/obtener municipio`);
      }

      const numeroPapeleta = parseInt(Posición) || 1;
      
      await CandidaturaModel.findOneAndUpdate(
        {
          municipioId: municipio._id,
          tipo,
          numeroPapeleta,
        },
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
      console.log(`   ⚠ Fila ${i + 2}: ${err instanceof Error ? err.message : 'Error'}`);
    }
  }

  console.log(`   ✓ Importados: ${importados}, Errores: ${errores}`);
  return { importados, errores };
}

// ============ IMPORTAR MESAS ============

async function importarMesas(archivo: string) {
  console.log(`\n📄 Importando mesas desde: ${archivo}`);
  
  const csvContent = readFileAsUtf8(archivo);
  const delimiter = csvContent.includes(';') ? ';' : csvContent.includes('\t') ? '\t' : ',';
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  });

  console.log(`   Total filas: ${records.length}`);

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
        throw new Error(`Faltan datos requeridos`);
      }

      // Crear o buscar Provincia
      let provincia = await ProvinciaModel.findOne({ nombre: String(NombreProvincia || '') });
      if (!provincia && NombreProvincia) {
        provincia = await ProvinciaModel.create({
          codigo: String(NombreProvincia).substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'UNK',
          nombre: String(NombreProvincia),
        });
      }

      // Crear o buscar Municipio
      let municipio = await MunicipioModel.findOne({ nombre: String(NombreMunicipio) });
      if (!municipio) {
        municipio = await MunicipioModel.create({
          nombre: String(NombreMunicipio),
          codigoINE: `MUN-${String(NombreMunicipio).substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
          departamento: String(NombreProvincia || ''),
        });
      }

      // Crear o buscar Localidad
      let localidad = await LocalidadModel.findOne({ 
        nombre: String(NombreLocalidad || ''),
        municipioId: municipio._id,
      });
      if (!localidad && NombreLocalidad) {
        localidad = await LocalidadModel.create({
          nombre: String(NombreLocalidad).trim(),
          codigo: `LOC-${String(NombreLocalidad).substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${i}`,
          tipo: 'LOCALIDAD',
          municipioId: municipio._id,
        });
      }

      // Crear o buscar Recinto
      let recinto = await RecintoModel.findOne({ 
        nombre: String(NombreRecinto || ''),
        municipioId: municipio._id,
      });
      if (!recinto && NombreRecinto) {
        recinto = await RecintoModel.create({
          nombre: String(NombreRecinto).trim(),
          direccion: '',
          municipioId: municipio._id,
          localidadId: localidad?._id,
        });
      } else if (recinto && localidad && !recinto.localidadId) {
        recinto.localidadId = localidad._id;
        await recinto.save();
      }

      if (!recinto) {
        throw new Error(`No se pudo crear/obtener recinto`);
      }

      // Crear Mesa
      const numeroMesa = typeof NumeroMesa === 'number' ? NumeroMesa : parseInt(String(NumeroMesa)) || (i + 1);
      
      const mesa = await MesaModel.findOneAndUpdate(
        {
          numeroMesa,
          recintoId: recinto._id,
        },
        {
          numeroMesa,
          provinciaId: provincia?._id,
          municipioId: municipio._id,
          localidadId: localidad?._id,
          recintoId: recinto._id,
          inscritosHabilitados: typeof InscritosHabilitados === 'number' ? InscritosHabilitados : parseInt(String(InscritosHabilitados)) || 0,
          estadoAlcalde: 'PENDIENTE',
          estadoConcejal: 'PENDIENTE',
        },
        { upsert: true, new: true }
      );

      // Crear Acta Digitada (CONCEJAL con todos los votos)
      const votoFields = ['voto1', 'voto2', 'voto3', 'voto4', 'voto5', 'voto6', 'voto7', 'voto8', 'voto9', 'voto10', 'voto11', 'voto12', 'voto13'];
      let votoConcejalValido = 0;
      for (const field of votoFields) {
        if (mapped[field] !== undefined) {
          votoConcejalValido += Number(mapped[field]) || 0;
        }
      }

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
          votoValido: votoConcejalValido,
          status: ActaDigitadaStatus.VALIDA,
          digitadorId: mockUser._id,
        },
        { upsert: true, new: true }
      );

      importados++;
    } catch (err) {
      errores++;
      console.log(`   ⚠ Fila ${i + 2}: ${err instanceof Error ? err.message : 'Error'}`);
    }
  }

  console.log(`   ✓ Importados: ${importados}, Errores: ${errores}`);
  return { importados, errores };
}

// ============ MAIN ============

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   IMPORTACIÓN DE DATOS ELECTORALES     ║');
  console.log('╚════════════════════════════════════════╝');
  
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scem');
  console.log('✓ Conectado a MongoDB');

  const dataDir = path.join(__dirname, '..', 'data');
  
  // Importar ALCALDES.csv (candidaturas)
  const alcaldesPath = path.join(dataDir, 'ALCALDES.csv');
  if (fs.existsSync(alcaldesPath)) {
    await importarCandidaturas(alcaldesPath);
  } else {
    console.log(`\n⚠ No se encontró: ${alcaldesPath}`);
  }

  // Importar DATOS.csv (mesas)
  const datosPath = path.join(dataDir, 'DATOS.csv');
  if (fs.existsSync(datosPath)) {
    await importarMesas(datosPath);
  } else {
    console.log(`\n⚠ No se encontró: ${datosPath}`);
  }

  // Resumen
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            RESUMEN FINAL              ║');
  console.log('╚════════════════════════════════════════╝');
  
  const partidos = await PartidoModel.countDocuments();
  const candidaturas = await CandidaturaModel.countDocuments();
  const provincias = await ProvinciaModel.countDocuments();
  const municipios = await MunicipioModel.countDocuments();
  const localidades = await LocalidadModel.countDocuments();
  const recintos = await RecintoModel.countDocuments();
  const mesas = await MesaModel.countDocuments();

  console.log(`  Partidos:     ${partidos}`);
  console.log(`  Candidaturas: ${candidaturas}`);
  console.log(`  Provincias:   ${provincias}`);
  console.log(`  Municipios:   ${municipios}`);
  console.log(`  Localidades:  ${localidades}`);
  console.log(`  Recintos:     ${recintos}`);
  console.log(`  Mesas:        ${mesas}`);

  await mongoose.disconnect();
  console.log('\n✓ Proceso completado');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
