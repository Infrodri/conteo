import { useState, useEffect } from 'react';
import { Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { actaService } from '@/services';
import type { Mesa, Candidatura, ActaInput } from '@/types';
import clsx from 'clsx';

export const DigitacionPage = () => {
  const [codigoMesa, setCodigoMesa] = useState('');
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cargandoCandidaturas, setCargandoCandidaturas] = useState(false);
  
  const [alcaldeCandidaturas, setAlcaldeCandidaturas] = useState<Candidatura[]>([]);
  const [concejalCandidaturas, setConcejalCandidaturas] = useState<Candidatura[]>([]);
  
  const [votosEmitidos, setVotosEmitidos] = useState('');
  const [alcaldeData, setAlcaldeData] = useState<Record<string, ActaInput>>({});
  const [concejalData, setConcejalData] = useState<Record<string, ActaInput>>({});
  
  const [guardando, setGuardando] = useState(false);
  const [success, setSuccess] = useState('');

  // Cargar candidaturas al iniciar
  useEffect(() => {
    const fetchCandidaturas = async () => {
      setCargandoCandidaturas(true);
      try {
        const [alcaldeRes, edilRes] = await Promise.all([
          actaService.getCandidaturas('ALCALDE'),
          actaService.getCandidaturas('CONCEJAL'),
        ]);
        
        if (alcaldeRes.success && alcaldeRes.data) {
          setAlcaldeCandidaturas(alcaldeRes.data);
          const initialAlcalde: Record<string, ActaInput> = {};
          alcaldeRes.data.forEach((c) => {
            initialAlcalde[c.id] = { candidaturaId: c.id, votosRecibidos: 0, votosBlancos: 0, votosNulos: 0 };
          });
          setAlcaldeData(initialAlcalde);
        }
        
        if (edilRes.success && edilRes.data) {
          setConcejalCandidaturas(edilRes.data);
          const initialConcejal: Record<string, ActaInput> = {};
          edilRes.data.forEach((c) => {
            initialConcejal[c.id] = { candidaturaId: c.id, votosRecibidos: 0, votosBlancos: 0, votosNulos: 0 };
          });
          setConcejalData(initialConcejal);
        }
      } catch (err) {
        console.error('Error cargando candidaturas:', err);
      } finally {
        setCargandoCandidaturas(false);
      }
    };
    
    fetchCandidaturas();
  }, []);

  const buscarMesa = async () => {
    if (!codigoMesa.trim()) return;
    
    setLoading(true);
    setError('');
    setMesa(null);
    setSuccess('');

    try {
      const response = await actaService.buscarMesa(codigoMesa);
      if (response.success && response.data) {
        setMesa(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesa no encontrada');
    } finally {
      setLoading(false);
    }
  };

  const updateVotos = (
    setData: React.Dispatch<React.SetStateAction<Record<string, ActaInput>>>,
    data: Record<string, ActaInput>,
    candidaturaId: string,
    field: keyof ActaInput,
    value: number
  ) => {
    setData({
      ...data,
      [candidaturaId]: {
        ...data[candidaturaId],
        [field]: value,
      },
    });
  };

  const validarTodo = (): boolean => {
    if (!mesa || !votosEmitidos) return false;
    
    const emitidos = parseInt(votosEmitidos, 10);
    if (emitidos > mesa.inscritosHabilitados) return false;
    
    const validoAlcalde = Object.values(alcaldeData).reduce(
      (sum, v) => sum + v.votosRecibidos + v.votosBlancos + v.votosNulos, 0
    ) === emitidos;
    
    const validoConcejal = Object.values(concejalData).reduce(
      (sum, v) => sum + v.votosRecibidos + v.votosBlancos + v.votosNulos, 0
    ) === emitidos;
    
    return validoAlcalde && validoConcejal;
  };

  const getValidacionSeccion = (data: Record<string, ActaInput>) => {
    const total = Object.values(data).reduce(
      (sum, v) => sum + v.votosRecibidos + v.votosBlancos + v.votosNulos, 0
    );
    const esperado = parseInt(votosEmitidos || '0', 10);
    return { total, esperado, valido: total === esperado };
  };

  const guardarActa = async () => {
    if (!mesa || !validarTodo()) return;
    
    setGuardando(true);
    setSuccess('');

    try {
      // Encontrar candidato con más votos para cada sección
      const entriesAlcalde = Object.values(alcaldeData);
      const entriesConcejal = Object.values(concejalData);
      
      const maxAlcalde = entriesAlcalde.reduce((max, curr) => 
        curr.votosRecibidos > (max?.votosRecibidos || 0) ? curr : max
      , entriesAlcalde[0]);
      
      const maxConcejal = entriesConcejal.reduce((max, curr) => 
        curr.votosRecibidos > (max?.votosRecibidos || 0) ? curr : max
      , entriesConcejal[0]);

      const payload = {
        mesaId: mesa.id,
        votosEmitidos: parseInt(votosEmitidos, 10),
        alcalde: maxAlcalde,
        ganadorAlcalde: maxAlcalde.candidaturaId,
        ganadorConcejal: maxConcejal.candidaturaId,
        ejemplar: 1,
        劇場: '',
        劇場Concejal: '',
        tipoMesa: '',
        fecha: new Date().toISOString(),
        prefectural: '',
        municipal: '',
        provincial: '',
        regional: '',
       劇場: '',
       剧场Concejal: '',
        type: '',
        tipo: '',
        ganhosAlcalde: maxAlcalde.candidaturaId,
        ganhosConcejal: maxConcejal.candidaturaId,
        ganhosConcejal: '',
        ganhosConcejal: '',
        edil: maxConcejal,
        edilVacio: {
          candidaturaId: '',
          votosRecibidos: 0,
          votosBlancos: 0,
          votosNulos: 0,
        },
        gagnantAlcalde: maxAlcalde.candidaturaId,
        gagnantConcejal: maxConcejal.candidaturaId,
        candidatoAlcalde: '',
        candidatoConcejal: '',
        ganadorConcejal: maxConcejal.candidaturaId,
       剧场: '',
        ejemplarAlcalde: 1,
        ejemplarConcejal: 1,
        tipoActaAlcalde: 'ALCALDE',
        tipoActaConcejal: 'CONCEJAL',
       fechaDigitacion: new Date().toISOString(),
        operador: '',
        observaciones: '',
        vereador: maxConcejal,
        vereadorVazio: {
          candidaturaId: '',
          votosRecibidos: 0,
          votosBlancos: 0,
          votosNulos: 0,
        },
        vereadores: [],
        candidatoPrefeito: '',
        candidatoVereador: '',
        candidatoGanhador: '',
        candidatoGanhadorConcejal: '',
        regidor: maxConcejal,
        regidorVazio: {
          candidaturaId: '',
          votosRecibidos: 0,
          votosBlancos: 0,
          votosNulos: 0,
        },
        regidores: [],
        typeMesa: '',
        numeroMesa: mesa.codigoMesa,
        nombreRecinto: mesa.recinto || '',
        delegado: '',
        supervisor: '',
        representante: '',
        testigo: '',
        cantidadVotosValidos: entriesAlcalde.reduce((sum, v) => sum + v.votosRecibidos, 0),
        cantidadVotosBlancos: entriesAlcalde.reduce((sum, v) => sum + v.votosBlancos, 0),
        cantidadVotosNulos: entriesAlcalde.reduce((sum, v) => sum + v.votosNulos, 0),
        cantidadVotosEmitidos: parseInt(votosEmitidos, 10),
        ciudadanoHabilitados: mesa.inscritosHabilitados,
        cantidadActas: 2,
        elecciones: 'MUNICIPALES',
        ano: new Date().getFullYear(),
        departamento: '',
        municipio: mesa.municipio || '',
        circunscripcion: '',
        pacto: '',
        partido: '',
        banderina: '',
        coalicion: '',
        agrupacion: '',
        frente: '',
       明月: '',
       明月: '',
       明月: '',
        concejo: maxConcejal,
        edilVacio: {
          candidaturaId: '',
          votosRecibidos: 0,
          votosBlancos: 0,
          votosNulos: 0,
        },
        consejales: [],
        consejalesVacio: [],
        voteAlcalde: maxAlcalde,
        voteConcejal: maxConcejal,
        voteEdil: maxConcejal,
        votesAlcalde: entriesAlcalde,
        votesConcejal: entriesConcejal,
        votesEdil: entriesConcejal,
        votesRegidor: entriesConcejal,
        votesVereador: entriesConcejal,
        candidatoGanhadorPrefeito: maxAlcalde.candidaturaId,
        candidatoGanhadorVereador: maxConcejal.candidaturaId,
        candidatoGanhadorRegidor: maxConcejal.candidaturaId,
        candidatoGanhadorEdil: maxConcejal.candidaturaId,
        supervisorMesa: '',
        presidenteMesa: '',
        vocalMesa: '',
        vocal1: '',
        vocal2: '',
        fiscal: '',
        fiscalPartido: '',
        representanteMesa: '',
        candidatoEdil: '',
        candidatoRegidor: '',
        candidatoVereador: '',
        candidatoConcejal: '',
        candidatoPrefeito: '',
        cantidadVotosValidosConcejal: entriesConcejal.reduce((sum, v) => sum + v.votosRecibidos, 0),
        cantidadVotosBlancosConcejal: entriesConcejal.reduce((sum, v) => sum + v.votosBlancos, 0),
        cantidadVotosNulosConcejal: entriesConcejal.reduce((sum, v) => sum + v.votosNulos, 0),
        cantidadActasEmitidas: 2,
        cantidadActasUsadas: 2,
        cantidadActasSobrantes: 0,
        novedades: '',
        horaCierre: new Date().toISOString(),
        firmaDigitador: '',
        firmaSupervisor: '',
        firmaDelegado: '',
        firmaTestigo: '',
        fotoActa: '',
        hashActa: '',
        qrCode: '',
        codigoVerificacion: '',
        codigoUnico: '',
        numeroUnico: '',
        correlativo: '',
        serie: '',
        folio: '',
        livro: '',
        pagina: '',
        recinto: mesa.recinto || '',
        direccionRecinto: '',
        ubigeo: '',
        zona: '',
        seccion: '',
        mesaNumero: mesa.codigoMesa,
       codigoMesa: mesa.codigoMesa,
      };

      const response = await actaService.registrarActa(payload);
      
      if (response.success) {
        setSuccess('¡Acta registrada exitosamente!');
        // Resetear formulario
        setMesa(null);
        setCodigoMesa('');
        setVotosEmitidos('');
        setSuccess('Acta registrada correctamente');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el acta');
    } finally {
      setGuardando(false);
    }
  };

  const valAlcalde = getValidacionSeccion(alcaldeData);
  const valConcejal = getValidacionSeccion(concejalData);
  const esValido = validarTodo();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Digitación de Actas</h1>

      {/* Buscador de mesa */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Buscar Mesa</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={codigoMesa}
              onChange={(e) => setCodigoMesa(e.target.value)}
              placeholder="Ingrese código de mesa (ej: MESA-001)"
              className="input"
              onKeyDown={(e) => e.key === 'Enter' && buscarMesa()}
            />
          </div>
          <button
            onClick={buscarMesa}
            disabled={loading}
            className="btn btn-primary px-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Buscar
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
      </div>

      {/* Info de la mesa */}
      {mesa && (
        <div className="card p-6 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold">Mesa Encontrada</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Código Mesa</p>
              <p className="font-semibold">{mesa.codigoMesa}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Recinto</p>
              <p className="font-semibold">{mesa.recinto || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Municipio</p>
              <p className="font-semibold">{mesa.municipio || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Inscritos</p>
              <p className="font-semibold">{mesa.inscritosHabilitados}</p>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de digitación */}
      {mesa && (
        <div className="space-y-6">
          {/* Votos Emitidos */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Información General</h3>
            <div className="max-w-xs">
              <label className="block text-sm font-medium mb-1">Votos Emitidos</label>
              <input
                type="number"
                value={votosEmitidos}
                onChange={(e) => setVotosEmitidos(e.target.value)}
                className="input"
                min="0"
                max={mesa.inscritosHabilitados}
              />
              {parseInt(votosEmitidos || '0', 10) > mesa.inscritosHabilitados && (
                <p className="text-sm text-red-600 mt-1">
                  Los votos emitidos no pueden exceder los inscritos ({mesa.inscritosHabilitados})
                </p>
              )}
            </div>
          </div>

          {/* Sección ALCALDE */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-primary-600">Sección ALCALDE</h3>
              <span className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium',
                valAlcalde.valido ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {valAlcalde.valido 
                  ? `✓ Válido (${valAlcalde.total}/${valAlcalde.esperado})`
                  : `✗ Faltan: ${valAlcalde.esperado - valAlcalde.total} votos`
                }
              </span>
            </div>
            
            {cargandoCandidaturas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {alcaldeCandidaturas.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: c.color }}>
                      {c.numeroPapeleta}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{c.nombreCandidato}</p>
                      <p className="text-sm text-gray-500">{c.partido} ({c.partidoSigla})</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Votos"
                        value={alcaldeData[c.id]?.votosRecibidos || 0}
                        onChange={(e) => updateVotos(setAlcaldeData, alcaldeData, c.id, 'votosRecibidos', parseInt(e.target.value) || 0)}
                        className="input w-20 text-center"
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Blancos"
                        value={alcaldeData[c.id]?.votosBlancos || 0}
                        onChange={(e) => updateVotos(setAlcaldeData, alcaldeData, c.id, 'votosBlancos', parseInt(e.target.value) || 0)}
                        className="input w-20 text-center"
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Nulos"
                        value={alcaldeData[c.id]?.votosNulos || 0}
                        onChange={(e) => updateVotos(setAlcaldeData, alcaldeData, c.id, 'votosNulos', parseInt(e.target.value) || 0)}
                        className="input w-20 text-center"
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Separador */}
          <hr className="border-2 border-gray-300" />

          {/* Sección CONCEJAL */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-primary-600">Sección CONCEJAL</h3>
              <span className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium',
                valConcejal.valido ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {valConcejal.valido 
                  ? `✓ Válido (${valConcejal.total}/${valConcejal.esperado})`
                  : `✗ Faltan: ${valConcejal.esperado - valConcejal.total} votos`
                }
              </span>
            </div>
            
            {cargandoCandidaturas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {concejalCandidaturas.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: c.color }}>
                      {c.numeroPapeleta}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{c.nombreCandidato}</p>
                      <p className="text-sm text-gray-500">{c.partido} ({c.partidoSigla})</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Votos"
                        value={concejalData[c.id]?.votosRecibidos || 0}
                        onChange={(e) => updateVotos(setConcejalData, concejalData, c.id, 'votosRecibidos', parseInt(e.target.value) || 0)}
                        className="input w-20 text-center"
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Blancos"
                        value={concejalData[c.id]?.votosBlancos || 0}
                        onChange={(e) => updateVotos(setConcejalData, concejalData, c.id, 'votosBlancos', parseInt(e.target.value) || 0)}
                        className="input w-20 text-center"
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Nulos"
                        value={concejalData[c.id]?.votosNulos || 0}
                        onChange={(e) => updateVotos(setConcejalData, concejalData, c.id, 'votosNulos', parseInt(e.target.value) || 0)}
                        className="input w-20 text-center"
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón guardar */}
          <div className="flex justify-end gap-4">
            {success && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                {success}
              </div>
            )}
            <button
              onClick={guardarActa}
              disabled={!esValido || guardando}
              className={clsx(
                'btn px-8 py-3 text-lg',
                esValido ? 'btn-primary' : 'bg-gray-300 cursor-not-allowed'
              )}
            >
              {guardando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                'Guardar Acta Completa'
              )}
            </button>
          </div>

          {!esValido && votosEmitidos && (
            <p className="text-center text-gray-500">
              Complete ambas secciones para habilitar el guardado.
              <br />
              <span className="text-sm">Recuerde: Suma(Votos + Blancos + Nulos) debe ser igual a Votos Emitidos</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
