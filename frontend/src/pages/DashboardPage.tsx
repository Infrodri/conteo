import { useState, useEffect } from 'react';
import { Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FileCheck, FileX, FileClock, Users, RefreshCw } from 'lucide-react';
import { dashboardService, type ResumenData, type ResultadosData } from '@/services/dashboard.service';

type TabType = 'alcalde' | 'concejal';

export const DashboardPage = () => {
  const [tab, setTab] = useState<TabType>('alcalde');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [resultados, setResultados] = useState<ResultadosData | null>(null);

  const fetchData = async (isRefresh = false) => {
    const tipo = tab === 'alcalde' ? 'ALCALDE' : 'CONCEJAL';
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const [resumenRes, resultadosRes] = await Promise.all([
        dashboardService.getResumen(),
        dashboardService.getResultados(tipo),
      ]);
      
      if (resumenRes.success && resumenRes.data) setResumen(resumenRes.data);
      if (resultadosRes.success && resultadosRes.data) setResultados(resultadosRes.data);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [tab]);

  const estadisticas = resumen ? [
    { label: 'Válidos', value: resumen.totales.votoValido.toLocaleString(), icon: FileCheck, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Blancos', value: resumen.totales.votoBlanco.toLocaleString(), icon: FileClock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { label: 'Nulos', value: resumen.totales.totalVotoNulo.toLocaleString(), icon: FileX, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Emitidos', value: resumen.totales.votoEmitido.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  ] : [];

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-gray-500">Cargando resultados...</p>
      </div>
    </div>
  );

  const chartData = resultados?.resultados.map(r => ({
    name: r.sigla,
    nombre: r.partido || r.sigla,
    sigla: r.sigla,
    votos: r.votos,
    color: r.color,
    porcentaje: r.porcentaje,
  })) || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Electoral</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => fetchData(true)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <span className="text-xs text-gray-400">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {estadisticas.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`${bg} p-2 rounded-lg`}><Icon className={`w-5 h-5 ${color}`} /></div>
              <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold">{value}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Participación */}
      {resumen && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Participación</h2>
            <span className="text-xl font-bold text-primary-600">{resumen.porcentajes.participacion}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${Math.min(resumen.porcentajes.participacion, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Emitidos: {resumen.totales.votoEmitido.toLocaleString()}</span>
            <span>Inscritos: {resumen.inscritos.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        {[{ id: 'alcalde', label: 'ALCALDE' }, { id: 'concejal', label: 'CONCEJALES' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as TabType)}
            className={`px-4 py-2 font-medium border-b-2 text-sm ${tab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Charts para muchos partidos */}
      {chartData.length > 0 ? (
        <div className="space-y-4">
          {/* Gráfico de barras horizontal - mejor para muchos items */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">Distribución de Votos - {tab === 'alcalde' ? 'ALCALDE' : 'CONCEJALES'}</h3>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="sigla" width={50} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="votos" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, formatter: (v: number) => v > 0 ? v.toLocaleString() : '' }}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla compacta */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <p className="text-sm font-semibold">Detalle de Resultados</p>
              <p className="text-xs text-gray-500">{resultados?.totalActas || resultados?.actasComputadas || 0} actas | {resultados?.totalVotos.toLocaleString() || 0} votos</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Partido</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Votos</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">%</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Barra</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {chartData.sort((a, b) => b.votos - a.votos).map((item, index) => (
                    <tr key={item.sigla} className={index === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2"><span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${index === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{index + 1}</span></td>
                      <td className="px-3 py-2">
                        <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold">{item.sigla}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{item.votos.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{item.porcentaje.toFixed(1)}%</td>
                      <td className="px-3 py-2 w-24">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${item.porcentaje}%`, backgroundColor: item.color }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center"><p className="text-gray-500">No hay datos disponibles.</p></div>
      )}
    </div>
  );
};
