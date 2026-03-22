import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Shield, RefreshCw, CheckCircle, XCircle, Database, Plus, Pencil, Trash2, X, PartyPopper, Users, Grid3X3, Download, Trash, AlertTriangle } from 'lucide-react';
import { adminService, type AdminStats } from '@/services/admin.service';
import { partidoService, type Partido } from '@/services/partido.service';
import { candidaturaService, type Candidatura } from '@/services/candidatura.service';
import { mesaService, type Mesa } from '@/services/mesa-crud.service';
import { useAuthStore } from '@/stores/auth.store';
import clsx from 'clsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type TabType = 'stats' | 'carga' | 'partidos' | 'candidaturas' | 'mesas';

export const AdminPage = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [uploading, setUploading] = useState<'candidaturas' | 'mesas' | null>(null);
  const [dragActive, setDragActive] = useState<'candidaturas' | 'mesas' | null>(null);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [limpiando, setLimpiando] = useState(false);
  const [showLimpiarModal, setShowLimpiarModal] = useState(false);
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Partidos state
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loadingPartidos, setLoadingPartidos] = useState(false);
  const [showPartidoModal, setShowPartidoModal] = useState(false);
  const [editingPartido, setEditingPartido] = useState<Partido | null>(null);
  const [partidoForm, setPartidoForm] = useState({ nombre: '', sigla: '', color: '#3B82F6' });
  const [partidoError, setPartidoError] = useState('');

  // Candidaturas state
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [loadingCandidaturas, setLoadingCandidaturas] = useState(false);
  const [showCandidaturaModal, setShowCandidaturaModal] = useState(false);
  const [editingCandidatura, setEditingCandidatura] = useState<Candidatura | null>(null);
  const [candidaturaFilter, setCandidaturaFilter] = useState<'ALCALDE' | 'CONCEJAL' | 'TODOS'>('ALCALDE');
  const [candidaturaForm, setCandidaturaForm] = useState({
    partidoId: '', municipioId: '', tipo: 'ALCALDE' as 'ALCALDE' | 'CONCEJAL',
    numeroPapeleta: 1, nombreCandidato: '', esTitular: true
  });
  const [candidaturaError, setCandidaturaError] = useState('');

  // Mesas state
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loadingMesas, setLoadingMesas] = useState(false);
  const [showMesaModal, setShowMesaModal] = useState(false);
  const [editingMesa, setEditingMesa] = useState<Mesa | null>(null);
  const [mesaFilter, setMesaFilter] = useState<'TODOS' | 'PENDIENTE' | 'COMPLETADA'>('TODOS');
  const [mesaForm, setMesaForm] = useState({
    numeroMesa: 1, municipioId: '', recintoId: '', provinciaId: '', inscritosHabilitados: 0
  });
  const [mesaError, setMesaError] = useState('');

  const isAdmin = user?.rol === 'ADMIN';

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await adminService.getStats();
      if (res.success && res.data) setStats(res.data);
    } catch (err) { console.error('Error cargando stats:', err); }
    finally { setLoadingStats(false); }
  };

  const fetchPartidos = async () => {
    setLoadingPartidos(true);
    try {
      const res = await partidoService.getAll();
      if (res.success && res.data) setPartidos(res.data);
    } catch (err) { console.error('Error cargando partidos:', err); }
    finally { setLoadingPartidos(false); }
  };

  const fetchCandidaturas = async () => {
    setLoadingCandidaturas(true);
    try {
      const tipo = candidaturaFilter !== 'TODOS' ? candidaturaFilter : undefined;
      const res = await candidaturaService.getAll(tipo);
      if (res.success && res.data) setCandidaturas(res.data);
    } catch (err) { console.error('Error cargando candidaturas:', err); }
    finally { setLoadingCandidaturas(false); }
  };

  const fetchMesas = async () => {
    setLoadingMesas(true);
    try {
      const res = await mesaService.getAll();
      if (res.success && res.data) setMesas(res.data);
    } catch (err) { console.error('Error cargando mesas:', err); }
    finally { setLoadingMesas(false); }
  };

  // Partidos CRUD
  const handleSavePartido = async () => {
    if (!partidoForm.nombre.trim()) { setPartidoError('El nombre es requerido'); return; }
    try {
      if (editingPartido) await partidoService.update(editingPartido._id, partidoForm);
      else await partidoService.create(partidoForm);
      setShowPartidoModal(false); setEditingPartido(null);
      setPartidoForm({ nombre: '', sigla: '', color: '#3B82F6' }); setPartidoError('');
      fetchPartidos();
    } catch (err: any) { setPartidoError(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDeletePartido = async (id: string) => {
    if (confirm('¿Eliminar este partido?')) {
      try { await partidoService.delete(id); fetchPartidos(); }
      catch (err) { console.error('Error eliminando:', err); }
    }
  };

  const openEditPartido = (partido: Partido) => {
    setEditingPartido(partido); setPartidoForm({ nombre: partido.nombre, sigla: partido.sigla, color: partido.color });
    setPartidoError(''); setShowPartidoModal(true);
  };

  // Candidaturas CRUD
  const handleSaveCandidatura = async () => {
    if (!candidaturaForm.partidoId || !candidaturaForm.municipioId || !candidaturaForm.numeroPapeleta) {
      setCandidaturaError('Partido, Municipio y Posición son requeridos'); return;
    }
    try {
      if (editingCandidatura) await candidaturaService.update(editingCandidatura._id, candidaturaForm);
      else await candidaturaService.create(candidaturaForm as any);
      setShowCandidaturaModal(false); setEditingCandidatura(null);
      setCandidaturaForm({ partidoId: '', municipioId: '', tipo: 'ALCALDE', numeroPapeleta: 1, nombreCandidato: '', esTitular: true });
      setCandidaturaError(''); fetchCandidaturas();
    } catch (err: any) { setCandidaturaError(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDeleteCandidatura = async (id: string) => {
    if (confirm('¿Eliminar esta candidatura?')) {
      try { await candidaturaService.delete(id); fetchCandidaturas(); }
      catch (err) { console.error('Error eliminando:', err); }
    }
  };

  const openEditCandidatura = (c: Candidatura) => {
    setEditingCandidatura(c);
    setCandidaturaForm({
      partidoId: c.partidoId._id, municipioId: c.municipioId._id,
      tipo: c.tipo, numeroPapeleta: c.numeroPapeleta,
      nombreCandidato: c.nombreCandidato, esTitular: c.esTitular
    });
    setCandidaturaError(''); setShowCandidaturaModal(true);
  };

  // Mesas CRUD
  const handleSaveMesa = async () => {
    if (!mesaForm.numeroMesa || !mesaForm.municipioId) {
      setMesaError('Número de mesa y Municipio son requeridos'); return;
    }
    try {
      if (editingMesa) await mesaService.update(editingMesa._id, mesaForm as any);
      else await mesaService.create(mesaForm as any);
      setShowMesaModal(false); setEditingMesa(null);
      setMesaForm({ numeroMesa: 1, municipioId: '', recintoId: '', provinciaId: '', inscritosHabilitados: 0 });
      setMesaError(''); fetchMesas();
    } catch (err: any) { setMesaError(err.response?.data?.message || 'Error al guardar'); }
  };

  const handleDeleteMesa = async (id: string) => {
    if (confirm('¿Eliminar esta mesa y sus actas?')) {
      try { await mesaService.delete(id); fetchMesas(); }
      catch (err) { console.error('Error eliminando:', err); }
    }
  };

  const openEditMesa = (m: Mesa) => {
    setEditingMesa(m);
    setMesaForm({
      numeroMesa: m.numeroMesa, municipioId: m.municipioId._id,
      recintoId: m.recintoId?._id || '', provinciaId: m.provinciaId || '', inscritosHabilitados: m.inscritosHabilitados
    });
    setMesaError(''); setShowMesaModal(true);
  };

  useEffect(() => {
    if (activeTab === 'stats') fetchStats();
    else if (activeTab === 'partidos') fetchPartidos();
    else if (activeTab === 'candidaturas') fetchCandidaturas();
    else if (activeTab === 'mesas') fetchMesas();
  }, [activeTab, candidaturaFilter]);

  const handleDrag = (e: React.DragEvent, type: 'candidaturas' | 'mesas') => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(type);
    else if (e.type === 'dragleave') setDragActive(null);
  };

  const handleDrop = (e: React.DragEvent, type: 'candidaturas' | 'mesas') => {
    e.preventDefault(); setDragActive(null);
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) handleUpload(file, type);
      else setUploadResult({ success: false, message: 'Solo archivos CSV' });
    }
  };

  const handleUpload = async (file: File, type: 'candidaturas' | 'mesas') => {
    setUploading(type); setUploadResult(null);
    try {
      const res = type === 'candidaturas'
        ? await adminService.importarCandidaturas(file)
        : await adminService.importarMesas(file);
      if (res.success) {
        setUploadResult({ success: true, message: `Importados: ${res.data?.importados || 0}, Errores: ${res.data?.errores || 0}` });
        fetchStats(); fetchCandidaturas(); fetchMesas();
      } else setUploadResult({ success: false, message: res.error || 'Error en importación' });
    } catch (err) { setUploadResult({ success: false, message: err instanceof Error ? err.message : 'Error' }); }
    finally { setUploading(null); }
  };

  const handleLimpiarDatos = async () => {
    setLimpiando(true);
    try {
      const res = await adminService.limpiarDatos();
      if (res.success) {
        setUploadResult({ success: true, message: 'Datos limpiados exitosamente. Ahora puedes importar el CSV oficial.' });
        fetchStats();
        setShowLimpiarModal(false);
      } else {
        setUploadResult({ success: false, message: res.error || 'Error al limpiar datos' });
      }
    } catch (err) {
      setUploadResult({ success: false, message: err instanceof Error ? err.message : 'Error' });
    } finally {
      setLimpiando(false);
    }
  };

  if (!isAdmin) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Acceso Restringido</h2>
        <p className="text-gray-500 mt-2">Solo administradores.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto pb-1">
        {[
          { id: 'stats', icon: Database, label: 'Estadísticas' },
          { id: 'carga', icon: Upload, label: 'Carga CSV' },
          { id: 'partidos', icon: PartyPopper, label: 'Partidos' },
          { id: 'candidaturas', icon: Users, label: 'Candidaturas' },
          { id: 'mesas', icon: Grid3X3, label: 'Mesas' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
            className={clsx('flex items-center gap-2 px-4 py-2 font-medium border-b-2 rounded-t-lg transition-colors whitespace-nowrap',
              activeTab === tab.id ? 'border-primary-600 text-primary-600 bg-primary-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Estadísticas */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-primary-600" /></div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Provincias', value: stats.ubicaciones.provincias },
                  { label: 'Municipios', value: stats.ubicaciones.municipios },
                  { label: 'Recintos', value: stats.ubicaciones.recinto },
                  { label: 'Mesas', value: stats.ubicaciones.mesas },
                  { label: 'Partidos', value: stats.candidatos.partidos },
                ].map(item => (
                  <div key={item.label} className="card p-4 text-center">
                    <p className="text-2xl font-bold text-primary-600">{item.value}</p>
                    <p className="text-sm text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['ALCALDE', 'CONCEJAL'].map(tipo => {
                  const prop = tipo === 'ALCALDE' ? 'progresoAlcalde' : 'progresoConcejal';
                  const comp = tipo === 'ALCALDE' ? 'completadaAlcalde' : 'completadaConcejal';
                  const pend = tipo === 'ALCALDE' ? 'pendienteAlcalde' : 'pendienteConcejal';
                  return (
                    <div key={tipo} className="card p-6">
                      <h3 className="font-semibold mb-4">Votación {tipo}</h3>
                      <div className="text-4xl font-bold text-center mb-4" style={{ color: tipo === 'ALCALDE' ? '#10B981' : '#3B82F6' }}>
                        {stats.actas[prop]}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div className="h-3 rounded-full transition-all" style={{ width: `${stats.actas[prop]}%`, backgroundColor: tipo === 'ALCALDE' ? '#10B981' : '#3B82F6' }} />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Completadas: {stats.actas[comp]}</span>
                        <span className="text-gray-500">Pendientes: {stats.actas[pend]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : <div className="card p-12 text-center text-gray-500">Sin datos. Importa desde CSV.</div>}
        </div>
      )}

      {/* Tab: Carga CSV */}
      {activeTab === 'carga' && (
        <div className="space-y-6">
          {/* Botón limpiar datos */}
          <div className="card p-4 bg-red-50 border-red-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">Limpiar Datos Electorales</h3>
                  <p className="text-sm text-red-600">Borra todas las mesas, actas, partidos y candidaturas. Los usuarios se mantienen.</p>
                </div>
              </div>
              <button
                onClick={() => setShowLimpiarModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                <Trash className="w-4 h-4" />
                Limpiar Todo
              </button>
            </div>
          </div>

          {[{ title: 'Candidaturas (ALCALDES)', type: 'candidaturas' as const, download: 'candidatos_ejemplo.csv' },
           { title: 'Mesas (DATOS)', type: 'mesas' as const, download: 'mesas_ejemplo.csv' }].map(item => (
            <div key={item.type} className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-primary-600" />
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                </div>
                <a href={`${API_URL}/downloads/${item.download}`} download className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm">
                  <Download className="w-4 h-4" />Ejemplo
                </a>
              </div>
              <div onDragEnter={(e) => handleDrag(e, item.type)} onDragLeave={(e) => handleDrag(e, item.type)}
                onDragOver={(e) => handleDrag(e, item.type)} onDrop={(e) => handleDrop(e, item.type)}
                onClick={() => document.getElementById(`${item.type}-file`)?.click()}
                className={clsx('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  dragActive === item.type ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400',
                  uploading === item.type && 'opacity-50 pointer-events-none')}>
                <input type="file" id={`${item.type}-file`} className="hidden" accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], item.type)} />
                {uploading === item.type ? (
                  <div className="flex items-center justify-center gap-2"><RefreshCw className="w-5 h-5 animate-spin" />Procesando...</div>
                ) : (
                  <><Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <span className="text-primary-600 font-medium">Clic o arrastra el CSV</span></>
                )}
              </div>
            </div>
          ))}
          {uploadResult && (
            <div className={clsx('card p-4 flex items-center gap-3', uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
              {uploadResult.success ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
              <span className={uploadResult.success ? 'text-green-700' : 'text-red-700'}>{uploadResult.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab: Partidos */}
      {activeTab === 'partidos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Partidos Políticos</h2>
            <button onClick={() => { setEditingPartido(null); setPartidoForm({ nombre: '', sigla: '', color: '#3B82F6' }); setPartidoError(''); setShowPartidoModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <Plus className="w-5 h-5" />Nuevo Partido
            </button>
          </div>
          {loadingPartidos ? <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary-600" /></div> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {partidos.map(p => (
                <div key={p._id} className="card p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: p.color }}>
                    {p.sigla.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" title={p.nombre}>{p.nombre}</p>
                    <p className="text-xs text-gray-500">{p.sigla}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditPartido(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDeletePartido(p._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {partidos.length === 0 && !loadingPartidos && <div className="text-center py-12 text-gray-500">No hay partidos.</div>}
        </div>
      )}

      {/* Tab: Candidaturas */}
      {activeTab === 'candidaturas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-xl font-semibold">Candidaturas</h2>
            <div className="flex gap-2 items-center">
              <select value={candidaturaFilter} onChange={(e) => setCandidaturaFilter(e.target.value as any)}
                className="px-3 py-1.5 border rounded-lg text-sm">
                <option value="TODOS">Todos</option>
                <option value="ALCALDE">Alcalde</option>
                <option value="CONCEJAL">Concejal</option>
              </select>
              <button onClick={() => { setEditingCandidatura(null); setCandidaturaForm({ partidoId: '', municipioId: '', tipo: 'ALCALDE', numeroPapeleta: 1, nombreCandidato: '', esTitular: true }); setCandidaturaError(''); setShowCandidaturaModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <Plus className="w-5 h-5" />Nueva
              </button>
            </div>
          </div>
          {loadingCandidaturas ? <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary-600" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Pos</th>
                    <th className="px-3 py-2 text-left">Partido</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Candidato</th>
                    <th className="px-3 py-2 text-left">Titular</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {candidaturas.map((c, idx) => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
                          {c.numeroPapeleta}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: c.partidoId.color }} />
                          <span className="font-medium">{c.partidoId.sigla}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', c.tipo === 'ALCALDE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                          {c.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2">{c.nombreCandidato || '-'}</td>
                      <td className="px-3 py-2">{c.esTitular ? 'Sí' : 'No'}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => openEditCandidatura(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteCandidatura(c._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {candidaturas.length === 0 && !loadingCandidaturas && <div className="text-center py-12 text-gray-500">No hay candidaturas.</div>}
        </div>
      )}

      {/* Tab: Mesas */}
      {activeTab === 'mesas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-xl font-semibold">Mesas Electorales</h2>
            <div className="flex gap-2 items-center">
              <select value={mesaFilter} onChange={(e) => setMesaFilter(e.target.value as any)}
                className="px-3 py-1.5 border rounded-lg text-sm">
                <option value="TODOS">Todas</option>
                <option value="COMPLETADA">Completadas</option>
                <option value="PENDIENTE">Pendientes</option>
              </select>
              <button onClick={() => { setEditingMesa(null); setMesaForm({ numeroMesa: 1, municipioId: '', recintoId: '', provinciaId: '', inscritosHabilitados: 0 }); setMesaError(''); setShowMesaModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <Plus className="w-5 h-5" />Nueva Mesa
              </button>
            </div>
          </div>
          {loadingMesas ? <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary-600" /></div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {mesas.filter(m => mesaFilter === 'TODOS' || m.estadoAlcalde === mesaFilter).map(m => (
                <div key={m._id} className="card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-lg">Mesa #{m.numeroMesa}</p>
                      <p className="text-sm text-gray-500">{m.municipioId?.nombre || 'Sin municipio'}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditMesa(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteMesa(m._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {m.recintoId && <p className="text-sm text-gray-600 mb-2">{m.recintoId.nombre}</p>}
                  <div className="flex gap-2 text-xs">
                    <span className={clsx('px-2 py-1 rounded', m.estadoAlcalde === 'COMPLETADA' ? 'bg-green-100 text-green-700' : m.estadoAlcalde === 'PARCIAL' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>
                      Alc: {m.estadoAlcalde}
                    </span>
                    <span className={clsx('px-2 py-1 rounded', m.estadoConcejal === 'COMPLETADA' ? 'bg-green-100 text-green-700' : m.estadoConcejal === 'PARCIAL' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>
                      Con: {m.estadoConcejal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {mesas.length === 0 && !loadingMesas && <div className="text-center py-12 text-gray-500">No hay mesas.</div>}
        </div>
      )}

      {/* Modal Partido */}
      {showPartidoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{editingPartido ? 'Editar Partido' : 'Nuevo Partido'}</h3>
              <button onClick={() => setShowPartidoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {partidoError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{partidoError}</div>}
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input type="text" value={partidoForm.nombre} onChange={(e) => setPartidoForm({ ...partidoForm, nombre: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Nombre del partido" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sigla</label>
                <input type="text" value={partidoForm.sigla} onChange={(e) => setPartidoForm({ ...partidoForm, sigla: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="Hasta 6 caracteres" maxLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <div className="flex gap-2">
                  <input type="color" value={partidoForm.color} onChange={(e) => setPartidoForm({ ...partidoForm, color: e.target.value })} className="w-12 h-10 border rounded cursor-pointer" />
                  <input type="text" value={partidoForm.color} onChange={(e) => setPartidoForm({ ...partidoForm, color: e.target.value })} className="flex-1 px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPartidoModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSavePartido} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{editingPartido ? 'Actualizar' : 'Crear'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Candidatura */}
      {showCandidaturaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{editingCandidatura ? 'Editar Candidatura' : 'Nueva Candidatura'}</h3>
              <button onClick={() => setShowCandidaturaModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {candidaturaError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{candidaturaError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Partido *</label>
                  <select value={candidaturaForm.partidoId} onChange={(e) => setCandidaturaForm({ ...candidaturaForm, partidoId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Seleccionar...</option>
                    {partidos.map(p => <option key={p._id} value={p._id}>{p.nombre} ({p.sigla})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select value={candidaturaForm.tipo} onChange={(e) => setCandidaturaForm({ ...candidaturaForm, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg">
                    <option value="ALCALDE">Alcalde</option>
                    <option value="CONCEJAL">Concejal</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Posición *</label>
                  <input type="number" min="1" value={candidaturaForm.numeroPapeleta}
                    onChange={(e) => setCandidaturaForm({ ...candidaturaForm, numeroPapeleta: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Titular</label>
                  <select value={String(candidaturaForm.esTitular)} onChange={(e) => setCandidaturaForm({ ...candidaturaForm, esTitular: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border rounded-lg">
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre Candidato</label>
                <input type="text" value={candidaturaForm.nombreCandidato}
                  onChange={(e) => setCandidaturaForm({ ...candidaturaForm, nombreCandidato: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg" placeholder="Nombre completo" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCandidaturaModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSaveCandidatura} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{editingCandidatura ? 'Actualizar' : 'Crear'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mesa */}
      {showMesaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{editingMesa ? 'Editar Mesa' : 'Nueva Mesa'}</h3>
              <button onClick={() => setShowMesaModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {mesaError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{mesaError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Número Mesa *</label>
                  <input type="number" min="1" value={mesaForm.numeroMesa}
                    onChange={(e) => setMesaForm({ ...mesaForm, numeroMesa: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Inscritos</label>
                  <input type="number" min="0" value={mesaForm.inscritosHabilitados}
                    onChange={(e) => setMesaForm({ ...mesaForm, inscritosHabilitados: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowMesaModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSaveMesa} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{editingMesa ? 'Actualizar' : 'Crear'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Limpiar Datos */}
      {showLimpiarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-bold text-red-800">Confirmar Limpieza</h3>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                ¿Está seguro que desea borrar <strong>TODOS</strong> los datos electorales?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Se borrarán:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                  <li>• Todas las actas digitadas</li>
                  <li>• Todas las mesas electorales</li>
                  <li>• Todas las localidades y recintos</li>
                  <li>• Todos los partidos y candidaturas</li>
                </ul>
                <p className="text-sm text-yellow-800 mt-3 font-medium">
                  ✅ Los usuarios admin/operadores se mantendrán.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowLimpiarModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleLimpiarDatos}
                disabled={limpiando}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {limpiando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Limpiando...
                  </>
                ) : (
                  <>
                    <Trash className="w-4 h-4" />
                    Sí, Limpiar Todo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
