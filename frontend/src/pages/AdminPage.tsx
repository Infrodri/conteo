import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, Shield, History } from 'lucide-react';
import clsx from 'clsx';

// Mock data para demostración
const MOCK_ACTAS = [
  { id: '1', mesa: 'MESA-001', tipo: 'ALCALDE', status: 'VALIDA', digitador: 'Juan Pérez', fecha: '2024-01-15 10:30' },
  { id: '2', mesa: 'MESA-002', tipo: 'CONCEJAL', status: 'ANULADA', digitador: 'María García', fecha: '2024-01-15 11:45' },
  { id: '3', mesa: 'MESA-003', tipo: 'ALCALDE', status: 'VALIDA', digitador: 'Carlos López', fecha: '2024-01-15 12:00' },
  { id: '4', mesa: 'MESA-004', tipo: 'CONCEJAL', status: 'VALIDA', digitador: 'Ana Martínez', fecha: '2024-01-15 13:15' },
];

export const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<'carga' | 'actas'>('carga');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        handleUpload(file);
      } else {
        alert('Por favor, sube un archivo CSV');
      }
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    // Simular upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUploading(false);
    alert(`Archivo ${file.name} cargado exitosamente`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('carga')}
          className={clsx(
            'px-6 py-3 font-medium border-b-2 transition-colors',
            activeTab === 'carga'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <FileSpreadsheet className="w-5 h-5 inline mr-2" />
          Carga Masiva
        </button>
        <button
          onClick={() => setActiveTab('actas')}
          className={clsx(
            'px-6 py-3 font-medium border-b-2 transition-colors',
            activeTab === 'actas'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <Shield className="w-5 h-5 inline mr-2" />
          Gestionar Actas
        </button>
      </div>

      {/* Tab: Carga Masiva */}
      {activeTab === 'carga' && (
        <div className="card p-8">
          <div className="text-center mb-8">
            <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Carga Masiva de Datos</h2>
            <p className="text-gray-500">
              Sube archivos CSV con los datos de mesas, padrones electorales o actas pre-ingresadas.
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={clsx(
              'border-2 border-dashed rounded-xl p-12 text-center transition-colors',
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-primary-600 font-medium hover:underline">
                Haz clic para subir
              </span>
              <span className="text-gray-500"> o arrastra y suelta</span>
              <p className="text-sm text-gray-400 mt-2">Archivos CSV únicamente</p>
            </label>
          </div>

          {uploading && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg">
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                Procesando archivo...
              </div>
            </div>
          )}

          {/* Template download */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Formato esperado</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  El archivo CSV debe contener las siguientes columnas:
                </p>
                <code className="block mt-2 p-2 bg-yellow-100 rounded text-sm overflow-x-auto">
                  codigoMesa,recinto,municipio,inscritosHabilitados
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Gestionar Actas */}
      {activeTab === 'actas' && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Digitador</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {MOCK_ACTAS.map((acta) => (
                  <tr key={acta.id}>
                    <td className="px-6 py-4 font-medium">{acta.mesa}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded bg-gray-100">
                        {acta.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'px-2 py-1 text-xs rounded font-medium',
                        acta.status === 'VALIDA'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      )}>
                        {acta.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{acta.digitador}</td>
                    <td className="px-6 py-4 text-gray-500">{acta.fecha}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                          <History className="w-4 h-4 inline mr-1" />
                          Ver
                        </button>
                        {acta.status === 'VALIDA' && (
                          <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                            Anular
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Mostrando {MOCK_ACTAS.length} registros
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
                Anterior
              </button>
              <button className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
