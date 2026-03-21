import { Response } from 'express';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import mongoose from 'mongoose';
import { ProvinciaModel, MunicipioModel, RecintoModel, MesaModel, PartidoModel, CandidaturaModel, CandidaturaTipo, ActaDigitadaModel, ActaDigitadaStatus } from '@/models';
import { asyncHandler } from '@/utils/async-handler';
import { BadRequestError } from '@/utils/errors';
import { AuthRequest } from '@/middleware/auth.middleware';

/**
 * Función helper para detectar el separador (tab, coma o punto y coma)
 */
const detectDelimiter = (content: string): string => {
  const firstLine = content.split('\n')[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  
  if (tabCount >= commaCount && tabCount >= semicolonCount) return '\t';
  if (semicolonCount > commaCount) return ';';
  return ',';
};

/**
 * Función para convertir buffer a UTF-8 (maneja diferentes codificaciones)
 */
const readFileAsUtf8 = (filePath: string): string => {
  const buffer = fs.readFileSync(filePath);
  
  // Detectar BOM y codificación
  // Si empieza con BOM UTF-8
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.toString('utf8', 3);
  }
  
  // Intentar detectar si es Latin-1/Windows-1252
  // Contar caracteres problemáticos
  let latin1Count = 0;
  let utf8ValidCount = 0;
  
  for (let i = 0; i < Math.min(buffer.length, 5000); i++) {
    const byte = buffer[i];
    // Caracteres Latin-1 típicos: á, é, í, ó, ú, ñ, etc. están en 0xC0-0xFF
    if (byte >= 0xC0 && byte <= 0xFF) {
      latin1Count++;
    }
    // Caracteres de control Latin-1 (0x80-0x9F) también indican Latin-1
    if (byte >= 0x80 && byte <= 0x9F) {
      latin1Count += 5; // Pesar más estos caracteres
    }
  }
  
  // Si hay muchos caracteres Latin-1, tratar como Windows-1252
  if (latin1Count > 5) {
    // Convertir de Windows-1252/Latin-1 a UTF-8
    // Crear buffer temporal con encoding correcto
    const iconv = require('iconv-lite');
    return iconv.decode(buffer, 'win1252');
  }
  
  // Intentar como UTF-8
  try {
    const utf8Content = buffer.toString('utf8');
    // Verificar que no tenga caracteres de reemplazo UTF-8
    if (!utf8Content.includes('�')) {
      return utf8Content;
    }
  } catch (e) {
    // Ignorar errores
  }
  
  // Último recurso: Latin-1
  return buffer.toString('latin1');
};

/**
 * Mapear columnas del formato ALCALDES real
 */
const mapAlcaldesRow = (row: Record<string, string>): {
  NombrePartido: string;
  Provincia: string;
  Municipio: string;
  Candidato: string;
  Posición: string;
  Titularidad: string;
  NombreCompleto: string;
} => {
  // Buscar las claves por diferentes variaciones
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
    NombrePartido: getValue(['nombre del partido', 'partido', 'partido']),
    Provincia: getValue(['provincia']),
    Municipio: getValue(['municipio']),
    Candidato: getValue(['candidato']),
    Posición: getValue(['posición', 'posicion', 'pos', 'numero', 'num']),
    Titularidad: getValue(['titularidad', 'titular', 'tipo']),
    NombreCompleto: getValue(['nombre completo', 'nombrecandidato', 'nombre', 'candidato']),
  };
};

/**
 * Mapear columnas del formato DATOS real
 */
const mapDatosRow = (row: Record<string, string>): Record<string, string | number> => {
  const result: Record<string, string | number> = {};
  
  for (const key of Object.keys(row)) {
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '');
    let value: string | number = row[key];
    
    // Convertir números
    if (['voto1', 'voto2', 'voto3', 'voto4', 'voto5', 'voto6', 'voto7', 'voto8', 'voto9', 'voto10', 'voto11', 'voto12', 'voto13',
         'numeromesa', 'inscritoshabilitados', 'votovalidoreal', 'votoemitidoreal',
         'votovalidoreal', 'votoemitidoreal'].some(n => normalizedKey.includes(n.toLowerCase()))) {
      value = parseInt(row[key]) || 0;
    }
    
    // Mapear nombres normalizados
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
    } else {
      // Guardar con el nombre original normalizado
      result[key.trim()] = value;
    }
  }
  
  return result;
};

/**
 * Importar candidatos desde archivo ALCALDES
 * 
 * Formato real:
 * Nombre del Partido | Provincia | Municipio | Candidato | Posición | Titularidad | Nombre completo
 */
export const importarCandidaturas = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    throw new BadRequestError('Archivo CSV es requerido');
  }

  const filePath = req.file.path;
  console.log(`[IMPORT] Procesando archivo de candidaturas: ${req.file.originalname}`);
  
  try {
    // Leer archivo manejando diferentes codificaciones
    const csvContent = readFileAsUtf8(filePath);
    
    // Auto-detectar separador (tab, coma o punto y coma)
    const delimiter = detectDelimiter(csvContent);
    console.log(`[IMPORT] Separador detectado: "${delimiter === '\t' ? 'TAB' : delimiter}"`);
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter,
    });

    console.log(`[IMPORT] Headers detectados:`, Object.keys(records[0] || {}).slice(0, 5));
    console.log(`[IMPORT] Total filas: ${records.length}`);

    let importados = 0;
    let errores = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i] as Record<string, string>;
      try {
        const mapped = mapAlcaldesRow(row);
        
        const { NombrePartido, Provincia, Municipio, Candidato, Posición, Titularidad, NombreCompleto } = mapped;

        if (!NombrePartido || !Municipio) {
          throw new Error(`Faltan datos requeridos: Partido="${NombrePartido}", Municipio="${Municipio}"`);
        }

        // Determinar tipo
        const tipo = Candidato?.toUpperCase().includes('ALCALDE') 
          ? CandidaturaTipo.ALCALDE 
          : CandidaturaTipo.CONCEJAL;

        // Crear o buscar Partido
        let partido = await PartidoModel.findOne({ nombre: NombrePartido });
        if (!partido) {
          const sigla = NombrePartido.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
          const color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
          partido = await PartidoModel.create({
            nombre: NombrePartido,
            sigla: sigla || 'UNK',
            color,
          });
        }

        // Buscar o crear Provincia
        let provincia = await ProvinciaModel.findOne({ nombre: Provincia });
        if (!provincia && Provincia) {
          const codigoProvincia = Provincia.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '');
          provincia = await ProvinciaModel.create({
            codigo: codigoProvincia || 'UNK',
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
            provinciaId: provincia?._id,
          });
        }

        if (!municipio) {
          throw new Error(`No se pudo crear/obtener municipio: ${Municipio}`);
        }

        // Crear Candidatura
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
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        errors.push(`Fila ${i + 2}: ${errorMsg}`);
        console.log(`[IMPORT ERROR] Fila ${i + 2}:`, err);
      }
    }

    // Limpiar archivo temporal
    fs.unlinkSync(filePath);

    console.log(`[IMPORT] Candidaturas - Importados: ${importados}, Errores: ${errores}`);

    res.json({
      success: errores === 0,
      message: `Importación completada: ${importados} importados, ${errores} errores`,
      data: {
        importados,
        errores,
        errors: errors,
      },
    });
  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
});

/**
 * Importar mesas y actas desde archivo DATOS
 * 
 * Formato real:
 * NombreProvincia | NombreMunicipio | NombreLocalidad | NombreRecinto | NumeroMesa | InscritosHabilitados | Voto1...Voto13 | Totales
 */
export const importarMesas = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    throw new BadRequestError('Archivo CSV es requerido');
  }

  const filePath = req.file.path;
  console.log(`[IMPORT] Procesando archivo de mesas: ${req.file.originalname}`);

  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    
    // Detectar separador (tab o coma)
    const delimiter = csvContent.includes('\t') ? '\t' : ',';
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter,
    });

    console.log(`[IMPORT] Headers detectados:`, Object.keys(records[0] || {}).slice(0, 10));
    console.log(`[IMPORT] Total filas: ${records.length}`);

    let importados = 0;
    let errores = 0;
    const errors: string[] = [];

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
          throw new Error(`Faltan datos requeridos: Municipio="${NombreMunicipio}"`);
        }

        // Crear o buscar Provincia
        let provincia = await ProvinciaModel.findOne({ nombre: String(NombreProvincia || '') });
        if (!provincia && NombreProvincia) {
          const codigoProvincia = String(NombreProvincia).substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '');
          provincia = await ProvinciaModel.create({
            codigo: codigoProvincia || 'UNK',
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
            provinciaId: provincia?._id,
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
          });
        }

        // Crear Mesa
        const numeroMesa = typeof NumeroMesa === 'number' ? NumeroMesa : parseInt(String(NumeroMesa)) || (i + 1);
        
        const mesa = await MesaModel.findOneAndUpdate(
          {
            numeroMesa,
            recintoId: recinto?._id,
          },
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

        // Importar actas ALCALDE y CONCEJAL
        const votoFields = ['voto1', 'voto2', 'voto3', 'voto4', 'voto5', 'voto6', 'voto7', 'voto8', 'voto9', 'voto10', 'voto11', 'voto12', 'voto13'];
        
        // Calcular votos para ALCALDE (asumimos que vote1-3 son para alcalde en este formato)
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
            votoBlanco: Number(mapped.votoBlanco) || 0,
            votoNuloDirecto: Number(mapped.votoNuloDirecto) || 0,
            votoNuloDeclinacion: Number(mapped.votoNuloDeclinacion) || 0,
            totalVotoNulo: Number(mapped.totalVotoNulo) || 0,
            votoEmitido: Number(mapped.votoEmitido) || 0,
            status: ActaDigitadaStatus.VALIDA,
            digitadorId: req.user!._id,
          },
          { upsert: true, new: true }
        );

        // Crear Acta CONCEJAL (todos los votos 1-13)
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
            votoBlanco: Number(mapped.votoBlanco) || 0,
            votoNuloDirecto: Number(mapped.votoNuloDirecto) || 0,
            votoNuloDeclinacion: Number(mapped.votoNuloDeclinacion) || 0,
            totalVotoNulo: Number(mapped.totalVotoNulo) || 0,
            votoEmitido: Number(mapped.votoEmitido) || 0,
            status: ActaDigitadaStatus.VALIDA,
            digitadorId: req.user!._id,
          },
          { upsert: true, new: true }
        );

        importados++;
      } catch (err) {
        errores++;
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        errors.push(`Fila ${i + 2}: ${errorMsg}`);
        console.log(`[IMPORT ERROR] Fila ${i + 2}:`, err);
      }
    }

    // Limpiar archivo temporal
    fs.unlinkSync(filePath);

    // Actualizar estados de mesas
    const actasValidas = await ActaDigitadaModel.find({ status: ActaDigitadaStatus.VALIDA });
    for (const acta of actasValidas) {
      await MesaModel.updateOne(
        { _id: acta.mesaId },
        { 
          estadoAlcalde: acta.tipo === CandidaturaTipo.ALCALDE ? 'COMPLETADA' : undefined,
          estadoConcejal: acta.tipo === CandidaturaTipo.CONCEJAL ? 'COMPLETADA' : undefined,
        }
      );
    }

    console.log(`[IMPORT] Mesas - Importados: ${importados}, Errores: ${errores}`);

    res.json({
      success: errores === 0,
      message: `Importación completada: ${importados} importados, ${errores} errores`,
      data: {
        importados,
        errores,
        errors: errors,
      },
    });
  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
});

// ============ RESTO DE FUNCIONES (STATS, ETC) ============

export const getStats = asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const [
    provincias,
    municipios,
    recintos,
    mesas,
    actas,
    candidatos,
    partidos,
  ] = await Promise.all([
    ProvinciaModel.countDocuments(),
    MunicipioModel.countDocuments(),
    RecintoModel.countDocuments(),
    MesaModel.countDocuments(),
    ActaDigitadaModel.countDocuments({ status: ActaDigitadaStatus.VALIDA }),
    CandidaturaModel.countDocuments(),
    PartidoModel.countDocuments(),
  ]);

  // Contar actas por tipo
  const actasAlcalde = await ActaDigitadaModel.countDocuments({ 
    status: ActaDigitadaStatus.VALIDA,
    tipo: CandidaturaTipo.ALCALDE 
  });
  const actasConcejal = await ActaDigitadaModel.countDocuments({ 
    status: ActaDigitadaStatus.VALIDA,
    tipo: CandidaturaTipo.CONCEJAL 
  });

  res.json({
    success: true,
    data: {
      ubicaciones: {
        provincias,
        municipios,
        localidades: 0, // No hay localidades separadas en este modelo
        recinto: recintos,
        mesas,
      },
      candidatos: {
        partidos,
        candidaturas: candidatos,
      },
      actas: {
        totalMesas: mesas,
        pendienteAlcalde: Math.max(0, mesas - actasAlcalde),
        pendienteConcejal: Math.max(0, mesas - actasConcejal),
        completadaAlcalde: actasAlcalde,
        completadaConcejal: actasConcejal,
        progresoAlcalde: mesas > 0 ? Math.round((actasAlcalde / mesas) * 100) : 0,
        progresoConcejal: mesas > 0 ? Math.round((actasConcejal / mesas) * 100) : 0,
      },
    },
  });
});

export const getProvincias = asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const provincias = await ProvinciaModel.find().sort({ nombre: 1 });
  res.json({ success: true, data: provincias });
});

export const getMunicipios = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { provinciaId } = req.query;
  const query = provinciaId ? { provinciaId: new mongoose.Types.ObjectId(provinciaId as string) } : {};
  const municipios = await MunicipioModel.find(query).sort({ nombre: 1 });
  res.json({ success: true, data: municipios });
});

export const getLocalidads = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { municipioId } = req.query;
  // Localidades en este modelo son los recintos
  const query = municipioId ? { municipioId: new mongoose.Types.ObjectId(municipioId as string) } : {};
  const localidades = await RecintoModel.find(query).sort({ nombre: 1 });
  res.json({ success: true, data: localidades });
});

export const getRecintos = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { municipioId } = req.query;
  const query = municipioId ? { municipioId: new mongoose.Types.ObjectId(municipioId as string) } : {};
  const recintos = await RecintoModel.find(query).sort({ nombre: 1 });
  res.json({ success: true, data: recintos });
});

export const getMesas = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { recintoId, municipioId } = req.query;
  const query: Record<string, unknown> = {};
  if (recintoId) query.recintoId = new mongoose.Types.ObjectId(recintoId as string);
  if (municipioId) query.municipioId = new mongoose.Types.ObjectId(municipioId as string);
  const mesas = await MesaModel.find(query).sort({ numeroMesa: 1 });
  res.json({ success: true, data: mesas });
});
