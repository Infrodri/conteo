import Tesseract from 'tesseract.js';

/**
 * Estructura completa del acta electoral boliviana
 */
export interface ActaElectoral {
  identificacion: {
    mesa: string | null;
    codigoMesa: string | null;
    departamento: string | null;
    provincia: string | null;
    localidad: string | null;
    recinto: string | null;
  };
  votosAlcalde: Record<string, number>;
  votosConcejal: Record<string, number>;
  resumen: {
    validosAlcalde: number | null;
    validosConcejal: number | null;
    blancosAlcalde: number | null;
    blancosConcejal: number | null;
    nulosAlcalde: number | null;
    nulosConcejal: number | null;
    habilitados: number | null;
    papeletasAnfora: number | null;
    papeletasNoUtilizadas: number | null;
  };
  textoExtraido: string;
  confianza: number;
}

/**
 * Keywords para identificar campos en el texto OCR
 */
const KEYWORDS = {
  mesa: ['MESA', 'mesa:', 'Mesa:', 'NUMERO DE MESA'],
  codigo: ['CODIGO', 'COD.', 'Código', 'CÓDIGO'],
  validos: ['VALIDOS', 'VOTOS VALIDOS', 'VOTOS VÁLIDOS', 'VOTO VALIDO'],
  blancos: ['BLANCOS', 'VOTOS EN BLANCO', 'BLANCO'],
  nulos: ['NULOS', 'VOTOS NULOS', 'NULO'],
  habilitados: ['HABILITADOS', 'ELECTORES HABILITADOS', 'HABILITADAS'],
  anfora: ['ÁNFORA', 'ANFORA', 'EN ÁNFORA', 'EN ANFORA'],
  noUtilizadas: ['NO UTILIZADAS', 'NO UTILIZADO', 'SIN USAR', 'NO USADAS'],
};

function extraerNumeroCercaDeKeyword(texto: string, keywords: string[]): number | null {
  const lineas = texto.split('\n');
  const numerosRegex = /\d{1,5}/g;

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].toUpperCase();
    for (const keyword of keywords) {
      if (linea.includes(keyword.toUpperCase())) {
        for (let j = i; j < Math.min(i + 5, lineas.length); j++) {
          const numeros = lineas[j].match(numerosRegex);
          if (numeros && numeros.length > 0) {
            return parseInt(numeros[0], 10);
          }
        }
        const idx = linea.indexOf(keyword.toUpperCase());
        const restoLinea = lineas[i].substring(idx + keyword.length);
        const numeros = restoLinea.match(numerosRegex);
        if (numeros && numeros.length > 0) {
          return parseInt(numeros[0], 10);
        }
      }
    }
  }
  return null;
}

function extraerCodigoMesa(texto: string): string | null {
  const patrones = [
    /\b(\d{6,10}[-\s]\d)\b/g,
    /\b(800\d{3}[-\s]\d)\b/g,
    /CÓDIGO[:\s]*(\d{6,10}[-\s]\d)/gi,
    /CODIGO[:\s]*(\d{6,10}[-\s]\d)/gi,
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match && match[0]) {
      return match[0].replace(/CÓDIGO|CODIGO|CÓD\./gi, '').trim();
    }
  }
  return null;
}

function extraerNumeroMesa(texto: string): string | null {
  const patrones = [
    /MESA[:\s#]*(\d+)/gi,
    /NUMERO DE MESA[:\s]*(\d+)/gi,
    /N°\s*MESA[:\s]*(\d+)/gi,
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match && match[0]) {
      const numero = match[0].match(/\d+/);
      if (numero) return numero[0];
    }
  }
  return null;
}

function extraerUbicacion(texto: string) {
  const resultado = {
    departamento: null as string | null,
    provincia: null as string | null,
    localidad: null as string | null,
    recinto: null as string | null,
  };

  const lineas = texto.split('\n');
  for (const linea of lineas) {
    const l = linea.toUpperCase();
    if (l.includes('POTOSÍ') || l.includes('POTOSI')) resultado.departamento = 'POTOSÍ';
    else if (l.includes('LA PAZ')) resultado.departamento = 'LA PAZ';
    else if (l.includes('COCHABAMBA')) resultado.departamento = 'COCHABAMBA';
    else if (l.includes('SANTA CRUZ')) resultado.departamento = 'SANTA CRUZ';
    else if (l.includes('ORURO')) resultado.departamento = 'ORURO';
    else if (l.includes('BENI')) resultado.departamento = 'BENI';
    else if (l.includes('TARIJA')) resultado.departamento = 'TARIJA';
    else if (l.includes('CHUQUISACA')) resultado.departamento = 'CHUQUISACA';
    else if (l.includes('PANDO')) resultado.departamento = 'PANDO';

    if (l.includes('JOSÉ MARÍA LINARES') || l.includes('JOSE MARIA LINARES')) {
      resultado.provincia = 'José María Linares';
    }
    if (l.includes('PUNA')) resultado.localidad = 'Puna';
  }
  return resultado;
}

function extraerVotosSeccion(
  texto: string,
  _seccion: 'ALCALDE' | 'CONCEJAL'
): { votos: Record<string, number>; validos: number | null; blancos: number | null; nulos: number | null } {
  const votos: Record<string, number> = {};
  for (let i = 1; i <= 19; i++) {
    votos[`sigla_${i}`] = 0;
  }

  const numerosRegex = /\b(\d{1,4})\b/g;
  const lineas = texto.split('\n');
  let enSeccion = false;
  let contadorPartidos = 0;

  for (const linea of lineas) {
    const l = linea.toUpperCase();
    if (l.includes('ALCALDE') || l.includes('CONCEJAL')) {
      enSeccion = true;
      continue;
    }
    if (enSeccion && (l.includes('TOTAL') || l.includes('RESUMEN') || l.includes('ELECTOR'))) {
      enSeccion = false;
    }

    if (enSeccion) {
      const numeros = linea.match(numerosRegex);
      if (numeros) {
        for (const num of numeros) {
          const valor = parseInt(num, 10);
          if (valor >= 0 && valor <= 500 && contadorPartidos < 19) {
            votos[`sigla_${contadorPartidos + 1}`] = valor;
            contadorPartidos++;
          }
        }
      }
    }
  }

  if (contadorPartidos < 5) {
    const todosNumeros = texto.match(numerosRegex) || [];
    let idx = 0;
    for (let i = 1; i <= 19 && idx < todosNumeros.length; i++) {
      const valor = parseInt(todosNumeros[idx], 10);
      if (valor >= 0 && valor <= 500) {
        votos[`sigla_${i}`] = valor;
      }
      idx++;
    }
  }

  return {
    votos,
    validos: extraerNumeroCercaDeKeyword(texto, KEYWORDS.validos),
    blancos: extraerNumeroCercaDeKeyword(texto, KEYWORDS.blancos),
    nulos: extraerNumeroCercaDeKeyword(texto, KEYWORDS.nulos),
  };
}

export async function procesarImagenBase64(base64Image: string): Promise<ActaElectoral> {
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(cleanBase64, 'base64');

  console.log('🔍 Iniciando OCR...');

  const { data } = await Tesseract.recognize(imageBuffer, 'spa', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\r📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  console.log('\n');

  const texto = data.text;
  const confianza = data.confidence / 100;

  console.log('=== Texto Extraído ===');
  console.log(texto.substring(0, 1000) + (texto.length > 1000 ? '...' : ''));
  console.log('=====================');
  console.log(`Confianza: ${(confianza * 100).toFixed(1)}%`);

  const votosAlcalde = extraerVotosSeccion(texto, 'ALCALDE');
  const votosConcejal = extraerVotosSeccion(texto, 'CONCEJAL');

  return {
    identificacion: {
      mesa: extraerNumeroMesa(texto),
      codigoMesa: extraerCodigoMesa(texto),
      ...extraerUbicacion(texto),
    },
    votosAlcalde: votosAlcalde.votos,
    votosConcejal: votosConcejal.votos,
    resumen: {
      validosAlcalde: votosAlcalde.validos,
      validosConcejal: votosConcejal.validos,
      blancosAlcalde: votosAlcalde.blancos,
      blancosConcejal: votosConcejal.blancos,
      nulosAlcalde: votosAlcalde.nulos,
      nulosConcejal: votosConcejal.nulos,
      habilitados: extraerNumeroCercaDeKeyword(texto, KEYWORDS.habilitados),
      papeletasAnfora: extraerNumeroCercaDeKeyword(texto, KEYWORDS.anfora),
      papeletasNoUtilizadas: extraerNumeroCercaDeKeyword(texto, KEYWORDS.noUtilizadas),
    },
    textoExtraido: texto,
    confianza,
  };
}

export async function procesarLoteBase64(
  imagenes: { base64: string; seccion?: 'ALCALDE' | 'CONCEJAL' }[]
): Promise<ActaElectoral[]> {
  const resultados: ActaElectoral[] = [];

  for (let i = 0; i < imagenes.length; i++) {
    console.log(`\n📷 Procesando imagen ${i + 1}/${imagenes.length}`);
    const resultado = await procesarImagenBase64(imagenes[i].base64);
    resultados.push(resultado);
  }

  return resultados;
}
