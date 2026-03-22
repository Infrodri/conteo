/**
 * Genera una sigla única a partir del nombre del partido
 * Ej: "ACCION DEMOCRATICA NACIONALISTA" → "ADN"
 * Ej: "MOVIMIENTO TERCER SISTEMA" → "MTS"
 */
function generarSiglaUnica(nombre: string): string {
  // Limpiar el nombre
  const palabras = nombre.trim().toUpperCase().split(/\s+/);
  
  // Si hay 3 o más palabras, tomar la primera letra de cada una
  if (palabras.length >= 3) {
    const sigla = palabras.map(p => p[0]).join('').substring(0, 3);
    // Si ya empieza con vocales, ajustar
    if ('AEIOU'.includes(sigla[0])) {
      return palabras[0].substring(0, 3);
    }
    return sigla;
  }
  
  // Si hay 2 palabras, tomar 2 letras de la primera + 1 de la segunda
  if (palabras.length === 2) {
    return (palabras[0].substring(0, 2) + palabras[1][0]).substring(0, 3);
  }
  
  // Si hay 1 palabra, tomar las primeras 3 letras
  return palabras[0].substring(0, 3);
}

/**
 * Script para importar candidatos con siglas únicas
 * Uso: npx tsx scripts/import-partidos.ts
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { 
  ProvinciaModel, 
  MunicipioModel, 
  PartidoModel, 
  CandidaturaModel,
  CandidaturaTipo,
} from '../src/models';

dotenv.config({ path: './.env' });

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

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   IMPORTACIÓN DE PARTIDOS Y CANDIDATURAS║');
  console.log('╚════════════════════════════════════════╝');
  
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scem');
  console.log('✓ Conectado a MongoDB\n');

  const dataDir = path.join(__dirname, '..', 'data');
  const archivo = path.join(dataDir, 'ALCALDES.csv');
  
  if (!fs.existsSync(archivo)) {
    console.log(`✗ No se encontró: ${archivo}`);
    await mongoose.disconnect();
    return;
  }

  // Leer archivo
  const buffer = fs.readFileSync(archivo);
  const iconv = require('iconv-lite');
  const csvContent = iconv.decode(buffer, 'win1252');
  const delimiter = csvContent.includes(';') ? ';' : ',';
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  });

  console.log(`📄 Total filas: ${records.length}\n`);

  // Primero, recolectar todos los partidos únicos
  const partidosMap = new Map<string, { nombre: string; sigla?: string }>();
  
  for (let i = 0; i < records.length; i++) {
    const row = records[i] as Record<string, string>;
    const mapped = mapAlcaldesRow(row);
    const nombre = mapped.NombrePartido;
    
    if (!partidosMap.has(nombre)) {
      partidosMap.set(nombre, { nombre });
    }
  }

  console.log(`📋 Partidos únicos encontrados: ${partidosMap.size}`);

  // Generar siglas únicas
  const siglasUsadas = new Set<string>();
  
  for (const [nombre, partido] of partidosMap) {
    let sigla = generarSiglaUnica(nombre);
    
    // Si la sigla ya existe, agregar letras adicionales
    if (siglasUsadas.has(sigla)) {
      // Buscar una combinación única
      const palabras = nombre.toUpperCase().split(/\s+/);
      for (let i = 0; i < palabras.length; i++) {
        for (let j = i + 1; j <= Math.min(palabras.length, i + 3); j++) {
          const prueba = palabras.slice(i, j).map(p => p[0]).join('').substring(0, 3);
          if (!siglasUsadas.has(prueba)) {
            sigla = prueba;
            break;
          }
        }
        if (!siglasUsadas.has(sigla)) break;
      }
      
      // Último recurso: usar prefijo con número
      if (siglasUsadas.has(sigla)) {
        let sufijo = 1;
        while (siglasUsadas.has(sigla.substring(0, 2) + sufijo)) sufijo++;
        sigla = sigla.substring(0, 2) + sufijo;
      }
    }
    
    partido.sigla = sigla;
    siglasUsadas.add(sigla);
    console.log(`  - ${nombre} → ${sigla}`);
  }

  // Crear partidos en la DB usando upsert
  console.log('\n🏛️ Creando partidos...');
  for (const [nombre, partido] of partidosMap) {
    const color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    await PartidoModel.findOneAndUpdate(
      { sigla: partido.sigla },
      {
        nombre,
        sigla: partido.sigla,
        color,
      },
      { upsert: true, new: true }
    );
  }
  console.log(`  ✓ ${partidosMap.size} partidos creados/actualizados`);

  // Ahora importar candidaturas
  console.log('\n📝 Importando candidaturas...');
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

      const partido = await PartidoModel.findOne({ nombre: NombrePartido });
      if (!partido) throw new Error(`Partido no encontrado: ${NombrePartido}`);

      let municipio = await MunicipioModel.findOne({ nombre: Municipio });
      if (!municipio && Municipio) {
        municipio = await MunicipioModel.create({
          nombre: Municipio,
          codigoINE: `MUN-${Municipio.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
          departamento: Provincia || '',
        });
      }

      if (!municipio) throw new Error(`Municipio no encontrado`);

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
      console.log(`  ⚠ Fila ${i + 2}: ${err instanceof Error ? err.message : 'Error'}`);
    }
  }

  console.log(`  ✓ Importados: ${importados}, Errores: ${errores}`);

  // Resumen
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            RESUMEN FINAL              ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`  Partidos:     ${await PartidoModel.countDocuments()}`);
  console.log(`  Candidaturas: ${await CandidaturaModel.countDocuments()}`);

  await mongoose.disconnect();
  console.log('\n✓ Proceso completado');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
