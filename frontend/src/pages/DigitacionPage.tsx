import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, MapPin, Home, Users, FileText, Lock } from 'lucide-react';
import { adminService, mesaService } from '@/services';
import type { MesaInfo, CandidaturaForm, ActaDigitadaPayload } from '@/services/mesa.service';
import { useAuthStore } from '@/stores/auth.store';
import clsx from 'clsx';

interface UbicacionItem {
  id: string;
  nombre: string;
  codigo?: string;
}

export const DigitacionPage = () => {
  // Usuario actual
  const { user } = useAuthStore();
  const isAdmin = user?.rol === 'ADMIN';
  const userId = user?.id;
  
  // Estado de ubicación
  const [localidades, setLocalized] = useState<UbicacionItem[]>([]);
  const [recintos, setRecintos] = useState<UbicacionItem[]>([]);
  const [mesas, setMesas] = useState<Array<{ id: string; numeroMesa: number; estadoAlcalde: string; estadoConcejal: string }>>([]);
  
  const [selectedLocalidad, setSelectedLocalidad] = useState('');
  const [selectedRecinto, setSelectedRecinto] = useState('');
  const [selectedMesa, setSelectedMesa] = useState<MesaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Candidaturas
  const [alcaldeCandidaturas, setAlcaldeCandidaturas] = useState<CandidaturaForm[]>([]);
  const [concejalCandidaturas, setConcejalCandidaturas] = useState<CandidaturaForm[]>([]);
  
  // Datos del acta
  const [votosEmitidos, setVotosEmitidos] = useState<number>(0);
  const [alcaldeData, setAlcaldeData] = useState<Record<string, number>>({});
  const [concejalData, setConcejalData] = useState<Record<string, number>>({});
  const [blancosAlcalde, setBlancosAlcalde] = useState(0);
  const [blancosConcejal, setBlancosConcejal] = useState(0);
  const [nulosAlcalde, setNulosAlcalde] = useState(0);
  const [nulosConcejal, setNulosConcejal] = useState(0);
  
  const [guardando, setGuardando] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Cargar localidades al iniciar
  useEffect(() => {
    const fetchLocalidads = async () => {
      try {
        const res = await adminService.getLocalidads();
        if (res.success && res.data) {
          setLocalized(res.data);
        }
      } catch (err) {
        console.error('Error cargando localidades:', err);
      }
    };
    fetchLocalidads();
  }, []);

  // Cargar recintos al seleccionar localidad
  useEffect(() => {
    if (!selectedLocalidad) {
      setRecintos([]);
      setSelectedRecinto('');
      return;
    }
    
    const fetchRecintos = async () => {
      try {
        const res = await adminService.getRecintos(selectedLocalidad);
        if (res.success && res.data) {
          setRecintos(res.data);
        }
      } catch (err) {
        console.error('Error cargando recintos:', err);
      }
    };
    fetchRecintos();
  }, [selectedLocalidad]);

  // Cargar mesas al seleccionar recinto
  useEffect(() => {
    if (!selectedRecinto) {
      setMesas([]);
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
    setSelectedMesa(null);
    
    try {
      const mesaRes = await mesaService.buscarMesa(mesaId);
      if (!mesaRes.success || !mesaRes.data) {
        throw new Error('Mesa no encontrada');
      }
      
      setSelectedMesa(mesaRes.data);
      setVotosEmitidos(mesaRes.data.inscritosHabilitados);
      
      // Cargar candidaturas
      const [alcaldeRes, concejalRes] = await Promise.all([
        mesaService.getCandidaturas(mesaRes.data.municipioId, 'ALCALDE'),
        mesaService.getCandidaturas(mesaRes.data.municipioId, 'CONCEJAL'),
      ]);
      
      if (alcaldeRes.success && alcaldeRes.data) {
        setAlcaldeCandidaturas(alcaldeRes.data);
        const init: Record<string, number> = {};
        alcaldeRes.data.forEach(c => { init[c.id] = 0; });
        setAlcaldeData(init);
      }
      
      if (concejalRes.success && concejalRes.data) {
        setConcejalCandidaturas(concejalRes.data);
        const init: Record<string, number> = {};
        concejalRes.data.forEach(c => { init[c.id] = 0; });
        setConcejalData(init);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Validación
  const validarSeccion = (data: Record<string, number>, blancos: number, nulos: number) => {
    const suma = Object.values(data).reduce((sum, v) => sum + (v || 0), 0);
    const total = suma + blancos + nulos;
    return { valido: total === votosEmitidos, total };
  };

  const valAlcalde = validarSeccion(alcaldeData, blancosAlcalde, nulosAlcalde);
  const valConcejal = validarSeccion(concejalData, blancosConcejal, nulosConcejal);
  const esValido = valAlcalde.valido && valConcejal.valido;

  // Determinar si cada sección es editable
  // Regla: OPERADOR solo puede editar si NO hay digitador asignado
  // ADMIN puede editar siempre
  const puedeEditarAlcalde = isAdmin || !selectedMesa?.digitadorIdAlcalde;
  const puedeEditarConcejal = isAdmin || !selectedMesa?.digitadorIdConcejal;

  // Guardar acta
  const guardarActa = async (confirmar: boolean) => {
    if (!selectedMesa) return;
    
    setGuardando(true);
    setSuccess('');
    setError('');

    try {
      const votoFields = ['voto1', 'voto2', 'voto3', 'voto4', 'voto5', 'voto6', 'voto7', 'voto8', 'voto9', 'voto10', 'voto11', 'voto12', 'voto13'];
      
      // Payload ALCALDE
      const payloadAlcalde: ActaDigitadaPayload = {
        mesaId: selectedMesa.id,
        tipo: 'ALCALDE',
        votoValido: valAlcalde.total,
        votoBlanco: blancosAlcalde,
        votoNuloDirecto: nulosAlcalde,
        votoNuloDeclinacion: 0,
        totalVotoNulo: nulosAlcalde,
        votoEmitido: votosEmitidos,
        confirmar,
      };
      
      // Asignar votos ALCALDE
      alcaldeCandidaturas.forEach((c, idx) => {
        const field = votoFields[idx];
        if (field) (payloadAlcalde as unknown as Record<string, number>)[field] = alcaldeData[c.id] || 0;
      });

      // Payload CONCEJAL
      const payloadConcejal: ActaDigitadaPayload = {
        mesaId: selectedMesa.id,
        tipo: 'CONCEJAL',
        votoValido: valConcejal.total,
        votoBlanco: blancosConcejal,
        votoNuloDirecto: nulosConcejal,
        votoNuloDeclinacion: 0,
        totalVotoNulo: nulosConcejal,
        votoEmitido: votosEmitidos,
        confirmar,
      };
      
      // Asignar votos CONCEJAL
      concejalCandidaturas.forEach((c, idx) => {
        const field = votoFields[idx];
        if (field) (payloadConcejal as unknown as Record<string, number>)[field] = concejalData[c.id] || 0;
      });

      await Promise.all([
        mesaService.guardarActa(payloadAlcalde),
        mesaService.guardarActa(payloadConcejal),
      ]);
      
      setSuccess(confirmar ? '¡Acta confirmada exitosamente!' : 'Avance guardado');
      
      if (confirmar) {
        setSelectedMesa(null);
        setVotosEmitidos(0);
        setAlcaldeData({});
        setConcejalData({});
        setBlancosAlcalde(0);
        setBlancosConcejal(0);
        setNulosAlcalde(0);
        setNulosConcejal(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. ENCABEZADO */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Digitación de Actas</h1>
          <p className="text-gray-500 mt-1">Complete los datos de cada mesa electoral</p>
        </div>

        {/* 2. SECCIÓN: SELECCIONAR UBICACIÓN */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Seleccionar Ubicación
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Localidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Localidad</label>
              <select
                value={selectedLocalidad}
                onChange={(e) => {
                  setSelectedLocalidad(e.target.value);
                  setSelectedRecinto('');
                  setSelectedMesa(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="">Seleccionar...</option>
                {localidades.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.codigo ? `${l.codigo} - ` : ''}{l.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Recinto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recinto</label>
              <select
                value={selectedRecinto}
                onChange={(e) => {
                  setSelectedRecinto(e.target.value);
                  setSelectedMesa(null);
                }}
                disabled={!selectedLocalidad}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="">Seleccionar...</option>
                {recintos.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            {/* Mesa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mesa</label>
              <select
                onChange={(e) => seleccionarMesa(e.target.value)}
                disabled={!selectedRecinto}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="">Seleccionar...</option>
                {mesas.map(m => (
                  <option key={m.id} value={m.id}>
                    Mesa {m.numeroMesa} 
                    ({m.estadoAlcalde === 'COMPLETADA' ? '✓' : '○'}, {m.estadoConcejal === 'COMPLETADA' ? '✓' : '○'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
            <p className="mt-3 text-gray-500">Cargando datos de la mesa...</p>
          </div>
        )}

        {/* 3. ALERTA DE MESA ENCONTRADA */}
        {selectedMesa && !loading && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-500 p-2 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-emerald-800">Mesa Encontrada</h2>
              {isAdmin && (
                <span className="ml-auto px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  Modo Administrador
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/60 rounded-xl p-4 text-center">
                <FileText className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{selectedMesa.numeroMesa}</p>
                <p className="text-sm text-gray-500">Número Mesa</p>
              </div>
              <div className="bg-white/60 rounded-xl p-4 text-center">
                <Home className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-lg font-semibold text-gray-900 truncate">{selectedMesa.recinto}</p>
                <p className="text-sm text-gray-500">Recinto</p>
              </div>
              <div className="bg-white/60 rounded-xl p-4 text-center">
                <MapPin className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-lg font-semibold text-gray-900">{selectedMesa.municipio}</p>
                <p className="text-sm text-gray-500">Municipio</p>
              </div>
              <div className="bg-white/60 rounded-xl p-4 text-center">
                <Users className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{selectedMesa.inscritosHabilitados}</p>
                <p className="text-sm text-gray-500">Inscritos</p>
              </div>
            </div>
            
            {/* Indicadores de estado por sección */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={clsx(
                'rounded-xl p-3 flex items-center justify-between',
                selectedMesa.estadoAlcalde === 'PENDIENTE' ? 'bg-yellow-100' : 
                selectedMesa.estadoAlcalde === 'COMPLETADA' ? 'bg-green-100' : 'bg-orange-100'
              )}>
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'w-3 h-3 rounded-full',
                    selectedMesa.estadoAlcalde === 'PENDIENTE' ? 'bg-yellow-500' : 
                    selectedMesa.estadoAlcalde === 'COMPLETADA' ? 'bg-green-500' : 'bg-orange-500'
                  )}></span>
                  <span className="font-medium">Sección ALCALDE</span>
                </div>
                <span className="text-sm">
                  {selectedMesa.estadoAlcalde === 'PENDIENTE' && !selectedMesa.digitadorIdAlcalde && 'Sin digitador'}
                  {selectedMesa.estadoAlcalde === 'PENDIENTE' && selectedMesa.digitadorIdAlcalde && 'En progreso'}
                  {selectedMesa.estadoAlcalde === 'COMPLETADA' && '✓ Completada'}
                </span>
              </div>
              
              <div className={clsx(
                'rounded-xl p-3 flex items-center justify-between',
                selectedMesa.estadoConcejal === 'PENDIENTE' ? 'bg-yellow-100' : 
                selectedMesa.estadoConcejal === 'COMPLETADA' ? 'bg-green-100' : 'bg-orange-100'
              )}>
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'w-3 h-3 rounded-full',
                    selectedMesa.estadoConcejal === 'PENDIENTE' ? 'bg-yellow-500' : 
                    selectedMesa.estadoConcejal === 'COMPLETADA' ? 'bg-green-500' : 'bg-orange-500'
                  )}></span>
                  <span className="font-medium">Sección CONCEJAL</span>
                </div>
                <span className="text-sm">
                  {selectedMesa.estadoConcejal === 'PENDIENTE' && !selectedMesa.digitadorIdConcejal && 'Sin digitador'}
                  {selectedMesa.estadoConcejal === 'PENDIENTE' && selectedMesa.digitadorIdConcejal && 'En progreso'}
                  {selectedMesa.estadoConcejal === 'COMPLETADA' && '✓ Completada'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. INFORMACIÓN GENERAL */}
        {selectedMesa && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Información General</h3>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">Votos Emitidos</label>
              <input
                type="number"
                value={votosEmitidos}
                onChange={(e) => setVotosEmitidos(parseInt(e.target.value) || 0)}
                className="w-full px-6 py-4 text-2xl font-bold text-center border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max={selectedMesa.inscritosHabilitados}
              />
            </div>
          </div>
        )}

        {/* 5. SECCIÓN PRINCIPAL DE VOTACIÓN */}
        {selectedMesa && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* A) SECCIÓN ALCALDE */}
            <div className={clsx(
              'bg-white rounded-2xl shadow-sm overflow-hidden',
              !puedeEditarAlcalde ? 'border-2 border-red-300' : 'border border-gray-200'
            )}>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">Sección ALCALDE</h3>
                  {!puedeEditarAlcalde && (
                    <Lock className="w-5 h-5 text-yellow-300" />
                  )}
                </div>
                <span className={clsx(
                  'px-3 py-1 rounded-full text-sm font-semibold',
                  valAlcalde.valido ? 'bg-emerald-400 text-emerald-900' : 'bg-red-400 text-red-900'
                )}>
                  {valAlcalde.valido 
                    ? `✔ Válido (${valAlcalde.total}/${votosEmitidos})`
                    : `✘ Faltan: ${Math.max(0, votosEmitidos - valAlcalde.total)}`}
                </span>
              </div>
              
              {/* Mensaje de bloqueo */}
              {!puedeEditarAlcalde && (
                <div className="bg-red-50 border-b border-red-200 px-6 py-3">
                  <p className="text-red-700 text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Esta sección ya fue digitada por otro operador. Solo un administrador puede modificarla.
                  </p>
                </div>
              )}
              
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold text-gray-600">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-7">Partido</div>
                  <div className="col-span-4 text-center">Votos</div>
                </div>
                
                {/* Candidatos */}
                {alcaldeCandidaturas.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 rounded-xl items-center">
                    <div className="col-span-1 text-center">
                      <span 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: c.partidoColor }}
                      >
                        {c.numeroPapeleta}
                      </span>
                    </div>
                    <div className="col-span-7">
                      <p className="font-semibold text-gray-900">{c.partido}</p>
                      <p className="text-xs text-gray-500">{c.nombreCandidato}</p>
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        value={alcaldeData[c.id] || 0}
                        onChange={(e) => setAlcaldeData(prev => ({ ...prev, [c.id]: parseInt(e.target.value) || 0 }))}
                        disabled={!puedeEditarAlcalde}
                        className={clsx(
                          'w-full px-4 py-2 text-center font-bold border-2 rounded-lg',
                          puedeEditarAlcalde 
                            ? 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                            : 'border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed'
                        )}
                        min="0"
                      />
                    </div>
                  </div>
                ))}
                
                {/* Blancos y Nulos */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-yellow-50 rounded-xl p-3">
                    <label className="block text-xs font-medium text-yellow-700 mb-1">Blancos</label>
                    <input
                      type="number"
                      value={blancosAlcalde}
                      onChange={(e) => setBlancosAlcalde(parseInt(e.target.value) || 0)}
                      disabled={!puedeEditarAlcalde}
                      className={clsx(
                        'w-full px-3 py-2 text-center font-bold border-2 rounded-lg',
                        puedeEditarAlcalde 
                          ? 'border-yellow-200 focus:border-yellow-500' 
                          : 'border-yellow-100 bg-yellow-100 text-gray-500 cursor-not-allowed'
                      )}
                      min="0"
                    />
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <label className="block text-xs font-medium text-red-700 mb-1">Nulos</label>
                    <input
                      type="number"
                      value={nulosAlcalde}
                      onChange={(e) => setNulosAlcalde(parseInt(e.target.value) || 0)}
                      disabled={!puedeEditarAlcalde}
                      className={clsx(
                        'w-full px-3 py-2 text-center font-bold border-2 rounded-lg',
                        puedeEditarAlcalde 
                          ? 'border-red-200 focus:border-red-500' 
                          : 'border-red-100 bg-red-100 text-gray-500 cursor-not-allowed'
                      )}
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* B) SECCIÓN CONCEJAL */}
            <div className={clsx(
              'bg-white rounded-2xl shadow-sm overflow-hidden',
              !puedeEditarConcejal ? 'border-2 border-red-300' : 'border border-gray-200'
            )}>
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">Sección CONCEJAL</h3>
                  {!puedeEditarConcejal && (
                    <Lock className="w-5 h-5 text-yellow-300" />
                  )}
                </div>
                <span className={clsx(
                  'px-3 py-1 rounded-full text-sm font-semibold',
                  valConcejal.valido ? 'bg-emerald-400 text-emerald-900' : 'bg-red-400 text-red-900'
                )}>
                  {valConcejal.valido 
                    ? `✔ Válido (${valConcejal.total}/${votosEmitidos})`
                    : `✘ Faltan: ${Math.max(0, votosEmitidos - valConcejal.total)}`}
                </span>
              </div>
              
              {/* Mensaje de bloqueo */}
              {!puedeEditarConcejal && (
                <div className="bg-red-50 border-b border-red-200 px-6 py-3">
                  <p className="text-red-700 text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Esta sección ya fue digitada por otro operador. Solo un administrador puede modificarla.
                  </p>
                </div>
              )}
              
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold text-gray-600">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-7">Partido</div>
                  <div className="col-span-4 text-center">Votos</div>
                </div>
                
                {/* Candidatos */}
                {concejalCandidaturas.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 rounded-xl items-center">
                    <div className="col-span-1 text-center">
                      <span 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: c.partidoColor }}
                      >
                        {c.numeroPapeleta}
                      </span>
                    </div>
                    <div className="col-span-7">
                      <p className="font-semibold text-gray-900">{c.partido}</p>
                      <p className="text-xs text-gray-500">{c.nombreCandidato}</p>
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        value={concejalData[c.id] || 0}
                        onChange={(e) => setConcejalData(prev => ({ ...prev, [c.id]: parseInt(e.target.value) || 0 }))}
                        disabled={!puedeEditarConcejal}
                        className={clsx(
                          'w-full px-4 py-2 text-center font-bold border-2 rounded-lg',
                          puedeEditarConcejal 
                            ? 'border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500' 
                            : 'border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed'
                        )}
                        min="0"
                      />
                    </div>
                  </div>
                ))}
                
                {/* Blancos y Nulos */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-yellow-50 rounded-xl p-3">
                    <label className="block text-xs font-medium text-yellow-700 mb-1">Blancos</label>
                    <input
                      type="number"
                      value={blancosConcejal}
                      onChange={(e) => setBlancosConcejal(parseInt(e.target.value) || 0)}
                      disabled={!puedeEditarConcejal}
                      className={clsx(
                        'w-full px-3 py-2 text-center font-bold border-2 rounded-lg',
                        puedeEditarConcejal 
                          ? 'border-yellow-200 focus:border-yellow-500' 
                          : 'border-yellow-100 bg-yellow-100 text-gray-500 cursor-not-allowed'
                      )}
                      min="0"
                    />
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <label className="block text-xs font-medium text-red-700 mb-1">Nulos</label>
                    <input
                      type="number"
                      value={nulosConcejal}
                      onChange={(e) => setNulosConcejal(parseInt(e.target.value) || 0)}
                      disabled={!puedeEditarConcejal}
                      className={clsx(
                        'w-full px-3 py-2 text-center font-bold border-2 rounded-lg',
                        puedeEditarConcejal 
                          ? 'border-red-200 focus:border-red-500' 
                          : 'border-red-100 bg-red-100 text-gray-500 cursor-not-allowed'
                      )}
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. BOTONES */}
        {selectedMesa && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            {!puedeEditarAlcalde && !puedeEditarConcejal && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
                <Lock className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Sin permisos de edición</p>
                  <p className="text-sm text-yellow-700">Ambas secciones ya fueron digitadas por otros operadores.</p>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              {success && (
                <div className="flex items-center gap-2 text-emerald-600 mr-auto">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">{success}</span>
                </div>
              )}
              
              {(puedeEditarAlcalde || puedeEditarConcejal) && (
                <>
                  <button
                    onClick={() => guardarActa(false)}
                    disabled={guardando}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    💾 Guardar Avance
                  </button>
                  
                  <button
                    onClick={() => guardarActa(true)}
                    disabled={!esValido || guardando}
                    className={clsx(
                      'px-8 py-3 font-bold rounded-xl transition flex items-center justify-center gap-2',
                      esValido 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    )}
                  >
                    {guardando ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        ✅ Confirmar Acta
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
            
            {!esValido && votosEmitidos > 0 && (puedeEditarAlcalde || puedeEditarConcejal) && (
              <p className="text-center text-gray-500 mt-4">
                Complete ambas secciones para habilitar la confirmación
              </p>
            )}
          </div>
        )}
        
      </div>
    </div>
  );
};
