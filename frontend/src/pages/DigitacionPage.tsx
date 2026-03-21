import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { adminService, mesaService } from '@/services';
import type { MesaInfo, CandidaturaForm, ActaDigitadaPayload } from '@/services/mesa.service';
import clsx from 'clsx';

export const DigitacionPage = () => {
  
  // Dropdowns de ubicación
  const [provincias, setProvincias] = useState<Array<{ id: string; nombre: string }>>([]);
  const [municipios, setMunicipios] = useState<Array<{ id: string; nombre: string }>>([]);
  const [localidades, setLocalidades] = useState<Array<{ id: string; nombre: string }>>([]);
  const [recintos, setRecintos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [mesas, setMesas] = useState<Array<{ id: string; numeroMesa: number; estadoAlcalde: string; estadoConcejal: string }>>([]);
  
  const [selectedProvincia, setSelectedProvincia] = useState('');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState('');
  const [selectedRecinto, setSelectedRecinto] = useState('');
  const [selectedMesa, setSelectedMesa] = useState<MesaInfo | null>(null);
  const [, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  
  // Candidaturas
  const [alcaldeCandidaturas, setAlcaldeCandidaturas] = useState<CandidaturaForm[]>([]);
  const [concejalCandidaturas, setConcejalCandidaturas] = useState<CandidaturaForm[]>([]);
  
  // Datos del acta
  const [votosEmitidos, setVotosEmitidos] = useState('');
  const [alcaldeData, setAlcaldeData] = useState<Record<string, number>>({});
  const [concejalData, setConcejalData] = useState<Record<string, number>>({});
  const [blancosData, setBlancosData] = useState({ alcalde: 0, edil: 0 });
  const [nulosDirectoData, setNulosDirectoData] = useState({ alcalde: 0, edil: 0 });
  const [nulosDeclinacionData, setNulosDeclinacionData] = useState({ alcalde: 0, edil: 0 });
  
  const [guardando, setGuardando] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Cargar provincias al iniciar
  useEffect(() => {
    const fetchProvincias = async () => {
      try {
        const res = await adminService.getProvincias();
        if (res.success && res.data) {
          setProvincias(res.data);
        }
      } catch (err) {
        console.error('Error cargando provincias:', err);
      }
    };
    fetchProvincias();
  }, []);

  // Cargar municipios al seleccionar provincia
  useEffect(() => {
    if (!selectedProvincia) {
      setMunicipios([]);
      setSelectedMunicipio('');
      return;
    }
    
    const fetchMunicipios = async () => {
      try {
        const res = await adminService.getMunicipios(selectedProvincia);
        if (res.success && res.data) {
          setMunicipios(res.data);
        }
      } catch (err) {
        console.error('Error cargando municipios:', err);
      }
    };
    fetchMunicipios();
  }, [selectedProvincia]);

  // Cargar localidades al seleccionar municipio
  useEffect(() => {
    if (!selectedMunicipio) {
      setLocalidades([]);
      setSelectedLocalidad('');
      return;
    }
    
    const fetchLocalidads = async () => {
      try {
        const res = await adminService.getLocalidads(selectedMunicipio);
        if (res.success && res.data) {
          setLocalidades(res.data);
        }
      } catch (err) {
        console.error('Error cargando localidades:', err);
      }
    };
    fetchLocalidads();
  }, [selectedMunicipio]);

  // Cargar recintoes al seleccionar localidad
  useEffect(() => {
    if (!selectedMunicipio) {
      setRecintos([]);
      setSelectedRecinto('');
      return;
    }
    
    const fetchRecintos = async () => {
      try {
        const res = await adminService.getRecintos(selectedMunicipio, selectedLocalidad || undefined);
        if (res.success && res.data) {
          setRecintos(res.data);
        }
      } catch (err) {
        console.error('Error cargando recintoes:', err);
      }
    };
    fetchRecintos();
  }, [selectedMunicipio, selectedLocalidad]);

  // Cargar mesas al seleccionar recinto
  useEffect(() => {
    if (!selectedRecinto) {
      setMesas([]);
      setSelectedMesa(null);
      return;
    }
    
    const fetchMesas = async () => {
      try {
        const res = await adminService.getMesas(selectedRecinto);
        if (res.success && res.data) {
          setMesas(res.data);
        }
      } catch (err) {
        console.error('Error cargando mesas:', err);
      }
    };
    fetchMesas();
  }, [selectedRecinto]);

  // Seleccionar mesa y cargar candidaturas
  const seleccionarMesa = async (mesaId: string) => {
    const mesaData = mesas.find(m => m.id === mesaId);
    if (!mesaData) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    setCargandoDatos(true);
    
    try {
      // Buscar datos de la mesa
      const mesaRes = await mesaService.buscarMesa(mesaId);
      if (!mesaRes.success || !mesaRes.data) {
        throw new Error('Mesa no encontrada');
      }
      
      setSelectedMesa(mesaRes.data);
      
      // Cargar candidaturas
      const [alcaldeRes, edilRes] = await Promise.all([
        mesaService.getCandidaturas(selectedMunicipio, 'ALCALDE'),
        mesaService.getCandidaturas(selectedMunicipio, 'CONCEJAL'),
      ]);
      
      if (alcaldeRes.success && alcaldeRes.data) {
        setAlcaldeCandidaturas(alcaldeRes.data);
        // Inicializar datos
        const initAlcalde: Record<string, number> = {};
        alcaldeRes.data.forEach(c => { initAlcalde[c.id] = 0; });
        setAlcaldeData(initAlcalde);
      }
      
      if (edilRes.success && edilRes.data) {
        setConcejalCandidaturas(edilRes.data);
        const initConcejal: Record<string, number> = {};
        edilRes.data.forEach(c => { initConcejal[c.id] = 0; });
        setConcejalData(initConcejal);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
      setCargandoDatos(false);
    }
  };

  // Validación
  const validarSeccion = (
    data: Record<string, number>,
    blancos: number,
    nulosDirecto: number,
    nulosDeclinacion: number,
   emitidos: number
  ): { valido: boolean; suma: number; falta: number } => {
    const suma = Object.values(data).reduce((sum, v) => sum + (v || 0), 0);
    const total = suma + blancos + nulosDirecto + nulosDeclinacion;
    return {
      valido: total === emitidos,
      suma: total,
      falta: emitidos - total,
    };
  };

  const emitidos = parseInt(votosEmitidos, 10) || 0;
  const valAlcalde = validarSeccion(alcaldeData, blancosData.alcalde, nulosDirectoData.alcalde, nulosDeclinacionData.alcalde, emitidos);
  const valConcejal = validarSeccion(concejalData, blancosData.edil, nulosDirectoData.edil, nulosDeclinacionData.edil, emitidos);
  const esValido = valAlcalde.valido && valConcejal.valido && emitidos <= (selectedMesa?.inscritosHabilitados || 0);

  // Guardar acta
  const guardarActa = async (confirmar: boolean) => {
    if (!selectedMesa) return;
    
    setGuardando(true);
    setSuccess('');
    setError('');

    try {
      // Preparar payload para ALCALDE
      const votoFields = ['voto1', 'voto2', 'voto3', 'voto4', 'voto5', 'voto6', 'voto7', 'voto8', 'voto9', 'voto10', 'voto11', 'voto12', 'voto13'];
      const payloadAlcalde: ActaDigitadaPayload = {
        mesaId: selectedMesa.id,
        tipo: 'ALCALDE',
        votoValido: Object.values(alcaldeData).reduce((s, v) => s + (v || 0), 0),
        votoBlanco: blancosData.alcalde,
        votoNuloDirecto: nulosDirectoData.alcalde,
        votoNuloDeclinacion: nulosDeclinacionData.alcalde,
        totalVotoNulo: nulosDirectoData.alcalde + nulosDeclinacionData.alcalde,
        votoEmitido: emitidos,
        confirmar,
      };
      
      // Asignar votos por posición
      alcaldeCandidaturas.forEach((c, idx) => {
        const field = votoFields[idx];
        if (field) (payloadAlcalde as unknown as Record<string, number | undefined>)[field] = alcaldeData[c.id] || 0;
      });

      // Preparar payload para CONCEJAL
      const payloadConcejal: ActaDigitadaPayload = {
        mesaId: selectedMesa.id,
        tipo: 'CONCEJAL',
        votoValido: Object.values(concejalData).reduce((s, v) => s + (v || 0), 0),
        votoBlanco: blancosData.edil,
        votoNuloDirecto: nulosDirectoData.edil,
        votoNuloDeclinacion: nulosDeclinacionData.edil,
        totalVotoNulo: nulosDirectoData.edil + nulosDeclinacionData.edil,
        votoEmitido: emitidos,
        confirmar,
      };
      
      concejalCandidaturas.forEach((c, idx) => {
        const field = votoFields[idx];
        if (field) (payloadConcejal as unknown as Record<string, number | undefined>)[field] = concejalData[c.id] || 0;
      });

      // Guardar ambas secciones
      await Promise.all([
        mesaService.guardarActa(payloadAlcalde),
        mesaService.guardarActa(payloadConcejal),
      ]);
      
      setSuccess(confirmar ? '¡Acta confirmada exitosamente!' : 'Avance guardado');
      
      if (confirmar) {
        // Resetear formulario
        setSelectedMesa(null);
        setVotosEmitidos('');
        setAlcaldeData({});
        setConcejalData({});
        setBlancosData({ alcalde: 0, edil: 0 });
        setNulosDirectoData({ alcalde: 0, edil: 0 });
        setNulosDeclinacionData({ alcalde: 0, edil: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Digitación de Actas</h1>

      {/* Selector de ubicación */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Seleccionar Ubicación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Provincia */}
          <div>
            <label className="block text-sm font-medium mb-1">Provincia</label>
            <div className="relative">
              <select
                value={selectedProvincia}
                onChange={(e) => setSelectedProvincia(e.target.value)}
                className="input w-full appearance-none pr-10"
              >
                <option value="">Seleccionar...</option>
                {provincias.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Municipio */}
          <div>
            <label className="block text-sm font-medium mb-1">Municipio</label>
            <div className="relative">
              <select
                value={selectedMunicipio}
                onChange={(e) => setSelectedMunicipio(e.target.value)}
                className="input w-full appearance-none pr-10"
                disabled={!selectedProvincia}
              >
                <option value="">Seleccionar...</option>
                {municipios.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Localidad */}
          <div>
            <label className="block text-sm font-medium mb-1">Localidad</label>
            <div className="relative">
              <select
                value={selectedLocalidad}
                onChange={(e) => setSelectedLocalidad(e.target.value)}
                className="input w-full appearance-none pr-10"
                disabled={!selectedMunicipio}
              >
                <option value="">Todas</option>
                {localidades.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Recinto */}
          <div>
            <label className="block text-sm font-medium mb-1">Recinto</label>
            <div className="relative">
              <select
                value={selectedRecinto}
                onChange={(e) => setSelectedRecinto(e.target.value)}
                className="input w-full appearance-none pr-10"
                disabled={!selectedMunicipio}
              >
                <option value="">Seleccionar...</option>
                {recintos.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Mesa */}
          <div>
            <label className="block text-sm font-medium mb-1">Mesa</label>
            <div className="relative">
              <select
                value=""
                onChange={(e) => seleccionarMesa(e.target.value)}
                className="input w-full appearance-none pr-10"
                disabled={!selectedRecinto}
              >
                <option value="">Seleccionar...</option>
                {mesas.map(m => (
                  <option key={m.id} value={m.id}>
                    Mesa {m.numeroMesa} 
                    ({m.estadoAlcalde === 'COMPLETADA' ? '✓' : '○'}, {m.estadoConcejal === 'COMPLETADA' ? '✓' : '○'})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
      </div>

      {/* Info de la mesa */}
      {selectedMesa && (
        <div className="card p-6 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold">Mesa Encontrada</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Número Mesa</p>
              <p className="font-semibold">{selectedMesa.numeroMesa}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Recinto</p>
              <p className="font-semibold">{selectedMesa.recinto}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Municipio</p>
              <p className="font-semibold">{selectedMesa.municipio}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Inscritos</p>
              <p className="font-semibold">{selectedMesa.inscritosHabilitados}</p>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      {selectedMesa && (
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
                max={selectedMesa.inscritosHabilitados}
              />
              {emitidos > selectedMesa.inscritosHabilitados && (
                <p className="text-sm text-red-600 mt-1">
                  No puede exceder {selectedMesa.inscritosHabilitados} inscritos
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
                  ? `✓ Válido (${valAlcalde.suma}/${emitidos})`
                  : `✗ Faltan: ${valAlcalde.falta > 0 ? valAlcalde.falta : 'sobran ' + Math.abs(valAlcalde.falta)}`
                }
              </span>
            </div>
            
            {cargandoDatos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Partido</div>
                  <div className="col-span-2 text-center">Votos</div>
                  <div className="col-span-2 text-center">Blancos</div>
                  <div className="col-span-2 text-center">Nulos</div>
                </div>
                
                {/* Candidatos */}
                {alcaldeCandidaturas.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-lg items-center">
                    <div className="col-span-1">
                      <span 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: c.partidoColor }}
                      >
                        {c.numeroPapeleta}
                      </span>
                    </div>
                    <div className="col-span-5">
                      <p className="font-medium">{c.partido}</p>
                      <p className="text-xs text-gray-500">{c.nombreCandidato}</p>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={alcaldeData[c.id] || 0}
                        onChange={(e) => setAlcaldeData(prev => ({ ...prev, [c.id]: parseInt(e.target.value) || 0 }))}
                        className="input w-full text-center"
                        min="0"
                      />
                    </div>
                    <div className="col-span-2">
                      {alcaldeCandidaturas.indexOf(c) === 0 && (
                        <input
                          type="number"
                          value={blancosData.alcalde}
                          onChange={(e) => setBlancosData(prev => ({ ...prev, alcalde: parseInt(e.target.value) || 0 }))}
                          className="input w-full text-center"
                          min="0"
                        />
                      )}
                    </div>
                    <div className="col-span-2">
                      {alcaldeCandidaturas.indexOf(c) === 0 && (
                        <>
                          <input
                            type="number"
                            value={nulosDirectoData.alcalde}
                            onChange={(e) => setNulosDirectoData(prev => ({ ...prev, alcalde: parseInt(e.target.value) || 0 }))}
                            className="input w-full text-center mb-1"
                            min="0"
                            placeholder="Directo"
                          />
                          <input
                            type="number"
                            value={nulosDeclinacionData.alcalde}
                            onChange={(e) => setNulosDeclinacionData(prev => ({ ...prev, alcalde: parseInt(e.target.value) || 0 }))}
                            className="input w-full text-center"
                            min="0"
                            placeholder="Declin."
                          />
                        </>
                      )}
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
                  ? `✓ Válido (${valConcejal.suma}/${emitidos})`
                  : `✗ Faltan: ${valConcejal.falta > 0 ? valConcejal.falta : 'sobran ' + Math.abs(valConcejal.falta)}`
                }
              </span>
            </div>
            
            {cargandoDatos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Partido</div>
                  <div className="col-span-2 text-center">Votos</div>
                  <div className="col-span-2 text-center">Blancos</div>
                  <div className="col-span-2 text-center">Nulos</div>
                </div>
                
                {/* Candidatos */}
                {concejalCandidaturas.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-lg items-center">
                    <div className="col-span-1">
                      <span 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: c.partidoColor }}
                      >
                        {c.numeroPapeleta}
                      </span>
                    </div>
                    <div className="col-span-5">
                      <p className="font-medium">{c.partido}</p>
                      <p className="text-xs text-gray-500">{c.nombreCandidato}</p>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={concejalData[c.id] || 0}
                        onChange={(e) => setConcejalData(prev => ({ ...prev, [c.id]: parseInt(e.target.value) || 0 }))}
                        className="input w-full text-center"
                        min="0"
                      />
                    </div>
                    <div className="col-span-2">
                      {concejalCandidaturas.indexOf(c) === 0 && (
                        <input
                          type="number"
                          value={blancosData.edil}
                          onChange={(e) => setBlancosData(prev => ({ ...prev, edil: parseInt(e.target.value) || 0 }))}
                          className="input w-full text-center"
                          min="0"
                        />
                      )}
                    </div>
                    <div className="col-span-2">
                      {concejalCandidaturas.indexOf(c) === 0 && (
                        <>
                          <input
                            type="number"
                            value={nulosDirectoData.edil}
                            onChange={(e) => setNulosDirectoData(prev => ({ ...prev, edil: parseInt(e.target.value) || 0 }))}
                            className="input w-full text-center mb-1"
                            min="0"
                            placeholder="Directo"
                          />
                          <input
                            type="number"
                            value={nulosDeclinacionData.edil}
                            onChange={(e) => setNulosDeclinacionData(prev => ({ ...prev, edil: parseInt(e.target.value) || 0 }))}
                            className="input w-full text-center"
                            min="0"
                            placeholder="Declin."
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-between items-center">
            <div>
              {success && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  {success}
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => guardarActa(false)}
                disabled={guardando || !emitidos}
                className="btn px-6 py-3 border-2 border-gray-300 hover:bg-gray-50"
              >
                💾 Guardar Avance
              </button>
              <button
                onClick={() => guardarActa(true)}
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
                  '✅ Confirmar Acta'
                )}
              </button>
            </div>
          </div>

          {!esValido && emitidos > 0 && (
            <p className="text-center text-gray-500">
              Complete ambas secciones para habilitar la confirmación.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
