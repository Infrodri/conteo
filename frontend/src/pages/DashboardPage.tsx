import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileCheck, FileX, FileClock, Users, TrendingUp } from 'lucide-react';

// Mock data para demostración
const MOCK_DATA = {
  resumen: {
    votosValidos: 125000,
    votosBlancos: 3200,
    votosNulos: 1800,
    votosEmitidos: 130000,
    porcentajeParticipacion: 78.5,
    actasComputadas: 450,
    totalActas: 500,
  },
  alcalde: [
    { nombre: 'Juan Pérez', partido: 'Movimiento A', sigla: 'MA', votos: 45000, color: '#2563eb' },
    { nombre: 'María García', partido: 'Unidos B', sigla: 'UB', votos: 38000, color: '#dc2626' },
    { nombre: 'Carlos López', partido: 'Progreso C', sigla: 'PC', votos: 25000, color: '#16a34a' },
    { nombre: 'Ana Martínez', partido: 'Renovación D', sigla: 'RD', votos: 17000, color: '#9333ea' },
  ],
  concejal: [
    { nombre: 'Partido A', sigla: 'PA', votos: 32000, color: '#0891b2' },
    { nombre: 'Partido B', sigla: 'PB', votos: 28000, color: '#ea580c' },
    { nombre: 'Partido C', sigla: 'PC', votos: 22000, color: '#4f46e5' },
    { nombre: 'Partido D', sigla: 'PD', votos: 18000, color: '#db2777' },
    { nombre: 'Partido E', sigla: 'PE', votos: 15000, color: '#65a30d' },
  ],
};

type TabType = 'alcalde' | 'concejal';

export const DashboardPage = () => {
  const [tab, setTab] = useState<TabType>('alcalde');

  const data = MOCK_DATA;
  const chartData = tab === 'alcalde' ? data.alcalde : data.concejal;

  const estadisticas = [
    {
      label: 'Votos Válidos',
      value: data.resumen.votosValidos.toLocaleString(),
      icon: FileCheck,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Votos Blancos',
      value: data.resumen.votosBlancos.toLocaleString(),
      icon: FileClock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
    {
      label: 'Votos Nulos',
      value: data.resumen.votosNulos.toLocaleString(),
      icon: FileX,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
    {
      label: 'Votos Emitidos',
      value: data.resumen.votosEmitidos.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Electoral</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <TrendingUp className="w-4 h-4" />
          Actualizado en tiempo real
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {estadisticas.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-6">
            <div className="flex items-center gap-4">
              <div className={`${bg} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Participation indicator */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Participación Electoral</h2>
          <span className="text-2xl font-bold text-primary-600">
            {data.resumen.porcentajeParticipacion}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-primary-600 h-4 rounded-full transition-all"
            style={{ width: `${data.resumen.porcentajeParticipacion}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {data.resumen.actasComputadas} de {data.resumen.totalActas} actas computadas
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setTab('alcalde')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            tab === 'alcalde'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Resultados ALCALDE
        </button>
        <button
          onClick={() => setTab('concejal')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            tab === 'concejal'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Resultados CONCEJALES
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Distribución de Votos</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="votos"
                  nameKey="nombre"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Comparativa de Votos</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
                <YAxis type="category" dataKey="sigla" width={60} />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Bar dataKey="votos" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            Detalle de Resultados - {tab === 'alcalde' ? 'ALCALDE' : 'CONCEJALES'}
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidato/Partido</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sigla</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Votos</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {chartData
              .sort((a, b) => b.votos - a.votos)
              .map((item, index) => (
                <tr key={index} className={index === 0 ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                      index === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{item.nombre}</td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-block px-2 py-1 text-xs font-semibold rounded"
                      style={{ backgroundColor: item.color, color: 'white' }}
                    >
                      {item.sigla}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">{item.votos.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    {((item.votos / data.resumen.votosEmitidos) * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
