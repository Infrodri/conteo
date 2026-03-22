/**
 * Script para exportar datos a CSV
 * Uso: npm run export:csv
 */
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

async function exportToCsv(): Promise<void> {
  console.log('Conectando a MongoDB...');
  await mongoose.connect(config.mongodb.uri);
  
  const db = mongoose.connection.db!;
  
  const outputDir = path.join(__dirname, '../../data/backup');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Exportar PARTIDOS
  console.log('Exportando partidos...');
  const partidos = await db.collection('partidos').find({}).toArray();
  let csvPartidos = 'nombre;sigla;color\n';
  for (const p of partidos) {
    csvPartidos += `${p.nombre};${p.sigla};${p.color}\n`;
  }
  fs.writeFileSync(path.join(outputDir, 'PARTIDOS_backup.csv'), csvPartidos);
  console.log(`  ${partidos.length} partidos exportados`);
  
  // Exportar CANDIDATURAS
  console.log('Exportando candidaturas...');
  const candidaturas = await db.collection('candidaturas').find({}).toArray();
  let csvCandidaturas = 'tipo;numeroPapeleta;nombrePartido;siglaPartido;colorPartido;nombreCandidato;esTitular\n';
  
  for (const c of candidaturas) {
    const partido = partidos.find((p: any) => p._id.toString() === (c as any).partidoId?.toString());
    csvCandidaturas += `${(c as any).tipo};${(c as any).numeroPapeleta};${partido?.nombre || ''};${partido?.sigla || ''};${partido?.color || ''};${(c as any).nombreCandidato};${(c as any).esTitular}\n`;
  }
  fs.writeFileSync(path.join(outputDir, 'CANDIDATURAS_backup.csv'), csvCandidaturas);
  console.log(`  ${candidaturas.length} candidaturas exportadas`);
  
  // Exportar MESAS con ubicación
  console.log('Exportando mesas...');
  const mesas = await db.collection('mesas').find({}).toArray();
  
  // Obtener ubicaciones
  const provincias = await db.collection('provincias').find({}).toArray();
  const municipios = await db.collection('municipios').find({}).toArray();
  const localidads = await db.collection('localidads').find({}).toArray();
  const recintos = await db.collection('recintos').find({}).toArray();
  
  let csvMesas = 'numeroMesa;provincia;municipio;localidad;recinto;inscritosHabilitados;estadoAlcalde;estadoConcejal\n';
  for (const m of mesas) {
    const pm = m as any;
    const provincia = provincias.find((p: any) => p._id.toString() === pm.provinciaId?.toString());
    const municipio = municipios.find((mu: any) => mu._id.toString() === pm.municipioId?.toString());
    const localidad = localidads.find((l: any) => l._id.toString() === pm.localidadId?.toString());
    const recinto = recintos.find((r: any) => r._id.toString() === pm.recintoId?.toString());
    
    csvMesas += `${pm.numeroMesa};${provincia?.nombre || ''};${municipio?.nombre || ''};${localidad?.nombre || ''};${recinto?.nombre || ''};${pm.inscripitosHabilitados || 0};${pm.estadoAlcalde};${pm.estadoConcejal}\n`;
  }
  fs.writeFileSync(path.join(outputDir, 'MESAS_backup.csv'), csvMesas);
  console.log(`  ${mesas.length} mesas exportadas`);
  
  // Exportar ACTAS
  console.log('Exportando actas...');
  const actas = await db.collection('actadigitadas').find({}).toArray();
  let csvActas = 'mesaNumero;tipo;voto1;voto2;voto3;voto4;voto5;voto6;voto7;voto8;voto9;voto10;voto11;voto12;voto13;votoValido;votoBlanco;votoNuloDirecto;votoNuloDeclinacion;totalVotoNulo;votoEmitido;status\n';
  
  for (const a of actas) {
    const pa = a as any;
    const mesa = mesas.find((m: any) => m._id.toString() === pa.mesaId?.toString());
    csvActas += `${mesa ? (mesa as any).numeroMesa : ''};${pa.tipo};${pa.voto1};${pa.voto2};${pa.voto3};${pa.voto4};${pa.voto5};${pa.voto6};${pa.voto7};${pa.voto8};${pa.voto9};${pa.voto10};${pa.voto11};${pa.voto12};${pa.voto13};${pa.votoValido};${pa.votoBlanco};${pa.votoNuloDirecto};${pa.votoNuloDeclinacion};${pa.totalVotoNulo};${pa.votoEmitido};${pa.status}\n`;
  }
  fs.writeFileSync(path.join(outputDir, 'ACTAS_backup.csv'), csvActas);
  console.log(`  ${actas.length} actas exportadas`);
  
  await mongoose.disconnect();
  
  console.log('\n✅ Exportación completada');
  console.log(`📁 Archivos en: ${outputDir}`);
  console.log('   - PARTIDOS_backup.csv');
  console.log('   - CANDIDATURAS_backup.csv');
  console.log('   - MESAS_backup.csv');
  console.log('   - ACTAS_backup.csv');
  
  process.exit(0);
}

exportToCsv().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
