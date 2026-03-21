import { useState, useEffect } from 'react';
import { Eye, Unlock, AlertTriangle, CheckCircle2, Clock, Lock, Loader2 } from 'lucide-react';
import { mesaService, adminService } from '@/services';
import type { MesaObservada, MesasObservadasFiltros } from '@/services/mesa.service';

interface UbicacionItem {
  id: string;
  nombre: string;
  codigo?: string;
}

export const ObservacionPage = () => {
  // Estado
  const [mesas, setMesas] = useState<MesaObservada[]>([]);
  const [loading, setLoading] = useState(true);
  const [desbloqueando, setDesbloqueando] = useState<string | null>(null);
  
  // Filtros
  const [localidades, setLocalized] = useState<UbicacionItem[]>([]);
  const [recintos, setRecintos] = useState<UbicacionItem[]>([]);
  const [filtros, setFiltros] = useState<MesasObservadasFiltros>({});
  
  // Modal de desbloqueo
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<{ mesaId: string; tipo: 'ALCALDE' | 'CONCEJAL'; mesaNumero: number } | null>(null);
  
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
    if (!filtros.localidadId) {
      setRecintos([]);
      return;
    }
    
    const fetchRecintos = async () => {
      try {
        const res = await adminService.getRecintos(filtros.localidadId!);
        if (res.success && res.data) {
          setRecintos(res.data);
        }
      } catch (err) {
        console.error('Error cargando recintos:', err);
      }
    };
    fetchRecintos();
  }, [filtros.localidadId]);
  
  // Cargar mesas observadas
  useEffect(() => {
    const fetchMesas = async () => {
      setLoading(true);
      try {
        const res = await mesaService.getMesasObservadas(filtros);
        if (res.success && res.data) {
          setMesas(res.data);
        }
      } catch (err) {
        console.error('Error cargando mesas observadas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMesas();
  }, [filtros]);
  
  // Abrir modal de desbloqueo
  const handleDesbloquear = (mesaId: string, tipo: 'ALCALDE' | 'CONCEJAL', mesaNumero: number) => {
    setUnlockTarget({ mesaId, tipo, mesaNumero });
    setShowUnlockModal(true);
  };
  
  // Confirmar desbloqueo
  const confirmarDesbloqueo = async () => {
    if (!unlockTarget) return;
    
    setDesbloqueando(unlockTarget.mesaId + unlockTarget.tipo);
    try {
      await mesaService.desbloquearMesa(unlockTarget.mesaId, unlockTarget.tipo);
      // Recargar lista
      const res = await mesaService.getMesasObservadas(filtros);
      if (res.success && res.data) {
        setMesas(res.data);
      }
      setShowUnlockModal(false);
      setUnlockTarget(null);
    } catch (err) {
      console.error('Error al desbloquear:', err);
    } finally {
      setDesbloqueando(null);
    }
  };
  
  // Helpers para badges de estado
  const getEstadoBadge = (estado: string, digitador?: string | null) => {
    if (estado === 'COMPLETADA') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Completada
        </span>
      );
    }
    if (digitador) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Bloqueada
        </span>
      );
    }
    if (estado === 'PARCIAL') {
      return (
        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          En progreso
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
        Pendiente
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Observación de Actas</h1>
            <p className="text-gray-500 mt-1">Revisar y corregir digitaciones de operadores</p>
          </div>
          <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            Modo Administrador
          </span>
        </div>
        
        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Localidad</label>
              <select
                value={filtros.localidadId || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, localidadId: e.target.value || undefined, recintoId: undefined }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Todas</option>
                {localidades.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.codigo ? `${l.codigo} - ` : ''}{l.nombre}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recinto</label>
              <select
                value={filtros.recintoId || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, recintoId: e.target.value || undefined }))}
                disabled={!filtros.localidadId}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl disabled:bg-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Todos</option>
                {recintos.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado Alcaldía</label>
              <select
                value={filtros.estadoAlcalde || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, estadoAlcalde: e.target.value || undefined }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PARCIAL">En progreso</option>
                <option value="COMPLETADA">Completada</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado Concejos</label>
              <select
                value={filtros.estadoConcejal || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, estadoConcejal: e.target.value || undefined }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PARCIAL">En progreso</option>
                <option value="COMPLETADA">Completada</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Tabla de mesas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"># Mesa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Localidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Recinto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Alcaldía</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Concejos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Última Actualización</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
                      <p className="mt-2 text-gray-500">Cargando mesas...</p>
                    </td>
                  </tr>
                ) : mesas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      No se encontraron mesas con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  mesas.map((mesa) => (
                    <tr key={mesa.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-semibold text-gray-900">
                        Mesa {mesa.numeroMesa}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {mesa.codigoLocalidad ? `${mesa.codigoLocalidad} - ` : ''}{mesa.localidad}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {mesa.recinto}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {getEstadoBadge(mesa.estadoAlcalde, mesa.digitadorIdAlcalde)}
                          {mesa.digitadorNombreAlcalde && (
                            <span className="text-xs text-gray-500">{mesa.digitadorNombreAlcalde}</span>
                          )}
                          {mesa.digitadorIdAlcalde && (
                            <button
                              onClick={() => handleDesbloquear(mesa.id, 'ALCALDE', mesa.numeroMesa)}
                              disabled={desbloqueando === mesa.id + 'ALCALDE'}
                              className="mt-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded flex items-center gap-1 disabled:opacity-50"
                            >
                              {desbloqueando === mesa.id + 'ALCALDE' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Unlock className="w-3 h-3" />
                              )}
                              Desbloquear
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {getEstadoBadge(mesa.estadoConcejal, mesa.digitadorIdConcejal)}
                          {mesa.digitadorNombreConcejal && (
                            <span className="text-xs text-gray-500">{mesa.digitadorNombreConcejal}</span>
                          )}
                          {mesa.digitadorIdConcejal && (
                            <button
                              onClick={() => handleDesbloquear(mesa.id, 'CONCEJAL', mesa.numeroMesa)}
                              disabled={desbloqueando === mesa.id + 'CONCEJAL'}
                              className="mt-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded flex items-center gap-1 disabled:opacity-50"
                            >
                              {desbloqueando === mesa.id + 'CONCEJAL' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Unlock className="w-3 h-3" />
                              )}
                              Desbloquear
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(mesa.updatedAt).toLocaleString('es-BO')}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <a
                          href={`/digitacion?mesaId=${mesa.id}`}
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Modal de confirmación de desbloqueo */}
        {showUnlockModal && unlockTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
              <div className="bg-red-50 px-6 py-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-bold text-red-800">Confirmar Desbloqueo</h3>
              </div>
              
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  ¿Está seguro que desea desbloquear la sección <strong>{unlockTarget.tipo}</strong> de la Mesa <strong>{unlockTarget.mesaNumero}</strong>?
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ El operador podrá editar nuevamente esta sección. Los cambios anteriores podrían sobrescribirse.
                  </p>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowUnlockModal(false);
                    setUnlockTarget(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarDesbloqueo}
                  disabled={!!desbloqueando}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {desbloqueando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Desbloqueando...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      Desbloquear
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};
