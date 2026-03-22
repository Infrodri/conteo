import { useState, useRef } from 'react';
import { Upload, Image, Loader2, Check, X, AlertCircle, Save, Trash2, MapPin, FileText } from 'lucide-react';
import { procesarOcr, type ActaElectoral } from '@/services/ocr.service';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  base64: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: ActaElectoral;
  error?: string;
  editedAlcalde: Record<string, string>;
  editedConcejal: Record<string, string>;
  editedResumen: {
    validosAlcalde: string;
    validosConcejal: string;
    blancosAlcalde: string;
    blancosConcejal: string;
    nulosAlcalde: string;
    nulosConcejal: string;
    habilitados: string;
    papeletasAnfora: string;
    papeletasNoUtilizadas: string;
  };
}

const inicializarPartidos = (): Record<string, string> => {
  const obj: Record<string, string> = {};
  for (let i = 1; i <= 19; i++) {
    obj[`sigla_${i}`] = '';
  }
  return obj;
};

const inicializarResumen = () => ({
  validosAlcalde: '',
  validosConcejal: '',
  blancosAlcalde: '',
  blancosConcejal: '',
  nulosAlcalde: '',
  nulosConcejal: '',
  habilitados: '',
  papeletasAnfora: '',
  papeletasNoUtilizadas: '',
});

export const OcrPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [processing, setProcessing] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages: ImageFile[] = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        base64: await fileToBase64(file),
        status: 'pending' as const,
        editedAlcalde: inicializarPartidos(),
        editedConcejal: inicializarPartidos(),
        editedResumen: inicializarResumen(),
      }))
    );

    setImages((prev) => [...prev, ...newImages]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const procesarUnaImagen = async (image: ImageFile): Promise<ActaElectoral> => {
    const response = await procesarOcr(image.base64);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error en OCR');
    }
    return response.data;
  };

  const inicializarEditables = (result: ActaElectoral) => {
    const editedAlcalde: Record<string, string> = {};
    const editedConcejal: Record<string, string> = {};

    for (let i = 1; i <= 19; i++) {
      const key = `sigla_${i}`;
      editedAlcalde[key] = result.votosAlcalde[key]?.toString() || '';
      editedConcejal[key] = result.votosConcejal[key]?.toString() || '';
    }

    return {
      editedAlcalde,
      editedConcejal,
      editedResumen: {
        validosAlcalde: result.resumen.validosAlcalde?.toString() || '',
        validosConcejal: result.resumen.validosConcejal?.toString() || '',
        blancosAlcalde: result.resumen.blancosAlcalde?.toString() || '',
        blancosConcejal: result.resumen.blancosConcejal?.toString() || '',
        nulosAlcalde: result.resumen.nulosAlcalde?.toString() || '',
        nulosConcejal: result.resumen.nulosConcejal?.toString() || '',
        habilitados: result.resumen.habilitados?.toString() || '',
        papeletasAnfora: result.resumen.papeletasAnfora?.toString() || '',
        papeletasNoUtilizadas: result.resumen.papeletasNoUtilizadas?.toString() || '',
      },
    };
  };

  const procesarTodas = async () => {
    const pendientes = images.filter((i) => i.status === 'pending');
    if (pendientes.length === 0) return;

    setProcessing(true);

    for (const image of pendientes) {
      setImages((prev) =>
        prev.map((i) => (i.id === image.id ? { ...i, status: 'processing' as const } : i))
      );

      try {
        const result = await procesarUnaImagen(image);
        const editables = inicializarEditables(result);

        setImages((prev) =>
          prev.map((i) =>
            i.id === image.id
              ? { ...i, status: 'done' as const, result, ...editables }
              : i
          )
        );
      } catch (err) {
        setImages((prev) =>
          prev.map((i) =>
            i.id === image.id
              ? { ...i, status: 'error' as const, error: (err as Error).message }
              : i
          )
        );
      }
    }

    setProcessing(false);
  };

  const updateValue = (
    id: string,
    field: string,
    seccion: 'alcalde' | 'concejal' | 'resumen',
    value: string
  ) => {
    setImages((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (seccion === 'alcalde') {
          return { ...i, editedAlcalde: { ...i.editedAlcalde, [field]: value } };
        }
        if (seccion === 'concejal') {
          return { ...i, editedConcejal: { ...i.editedConcejal, [field]: value } };
        }
        return { ...i, editedResumen: { ...i.editedResumen, [field]: value } };
      })
    );
  };

  const validarSuma = (image: ImageFile, seccion: 'alcalde' | 'concejal') => {
    const editables = seccion === 'alcalde' ? image.editedAlcalde : image.editedConcejal;
    const resumen = image.editedResumen;

    const votosPartidos = Object.values(editables).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
    const blancos = parseInt(seccion === 'alcalde' ? resumen.blancosAlcalde : resumen.blancosConcejal) || 0;
    const nulos = parseInt(seccion === 'alcalde' ? resumen.nulosAlcalde : resumen.nulosConcejal) || 0;
    const validos = parseInt(seccion === 'alcalde' ? resumen.validosAlcalde : resumen.validosConcejal) || 0;

    const suma = votosPartidos + blancos + nulos;
    return { valido: suma === validos && validos > 0, suma, total: validos };
  };

  const cantidadProcesadas = images.filter((i) => i.status === 'done').length;
  const cantidadError = images.filter((i) => i.status === 'error').length;
  const cantidadPendientes = images.filter((i) => i.status === 'pending').length;

  const PartidosEditor = ({ image, seccion, votos }: { image: ImageFile; seccion: 'alcalde' | 'concejal'; votos: Record<string, string> }) => (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-1">
      {Array.from({ length: 19 }, (_, i) => {
        const key = `sigla_${i + 1}`;
        return (
          <div key={key} className="text-center">
            <label className="text-xs text-gray-500 block mb-1">{key.replace('sigla_', 'P')}</label>
            <input
              type="number"
              min="0"
              value={votos[key]}
              onChange={(e) => updateValue(image.id, key, seccion, e.target.value)}
              className="w-full px-1 py-1 text-xs text-center border rounded focus:ring-1 focus:ring-primary-500"
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procesamiento OCR de Actas</h1>
          <p className="text-sm text-gray-500 mt-1">Subí fotos de actas para extraer los votos automáticamente</p>
        </div>
        <div className="text-sm text-gray-500">Formato: Acta Electoral Bolivia</div>
      </div>

      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700">Arrastrá las imágenes aquí o hacé clic para seleccionar</p>
        <p className="text-sm text-gray-500 mt-2">Formatos: JPG, PNG, WEBP • Máximo 52 imágenes por batch</p>
      </div>

      {images.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><Image className="w-4 h-4 text-gray-500" />{images.length} imágenes</span>
            <span className="flex items-center gap-1 text-green-600"><Check className="w-4 h-4" />{cantidadProcesadas} procesadas</span>
            {cantidadError > 0 && <span className="flex items-center gap-1 text-red-600"><X className="w-4 h-4" />{cantidadError} errores</span>}
            {cantidadPendientes > 0 && <span className="flex items-center gap-1 text-yellow-600"><AlertCircle className="w-4 h-4" />{cantidadPendientes} pendientes</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setImages([])} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />Limpiar todo
            </button>
            <button onClick={procesarTodas} disabled={processing || cantidadPendientes === 0} className="btn btn-primary flex items-center gap-2 disabled:opacity-50">
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</> : <><Upload className="w-4 h-4" />Procesar {cantidadPendientes > 0 ? `(${cantidadPendientes})` : ''}</>}
            </button>
          </div>
        </div>
      )}

      {images.filter((i) => i.status === 'done').length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Resultados Extraídos</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {images.filter((i) => i.status === 'done').map((image) => {
              const validacionAlcalde = validarSuma(image, 'alcalde');
              const validacionConcejal = validarSuma(image, 'concejal');

              return (
                <div key={image.id} className="card overflow-hidden">
                  <div className="relative h-40 bg-gray-100">
                    <img src={image.preview} alt={`Acta ${image.file.name}`} className="w-full h-full object-contain" />
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${(image.result?.confianza || 0) > 0.8 ? 'bg-green-100 text-green-800' : (image.result?.confianza || 0) > 0.5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {Math.round((image.result?.confianza || 0) * 100)}% confianza
                      </span>
                      <button onClick={() => removeImage(image.id)} className="p-1 bg-white rounded-full shadow hover:bg-gray-100">
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {image.result?.identificacion && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-900">Identificación</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          <div><span className="text-gray-500">Mesa:</span> <span className="font-medium">{image.result.identificacion.mesa || '—'}</span></div>
                          <div><span className="text-gray-500">Código:</span> <span className="font-medium">{image.result.identificacion.codigoMesa || '—'}</span></div>
                          <div><span className="text-gray-500">Provincia:</span> <span className="font-medium">{image.result.identificacion.provincia || '—'}</span></div>
                          <div><span className="text-gray-500">Localidad:</span> <span className="font-medium">{image.result.identificacion.localidad || '—'}</span></div>
                          <div className="col-span-2"><span className="text-gray-500">Recinto:</span> <span className="font-medium">{image.result.identificacion.recinto || '—'}</span></div>
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg p-3">
                      <h3 className="font-semibold text-gray-900 mb-2">ALCALDE</h3>
                      <PartidosEditor image={image} seccion="alcalde" votos={image.editedAlcalde} />
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t">
                        <div>
                          <label className="text-xs text-gray-500 block">Válidos</label>
                          <input type="number" value={image.editedResumen.validosAlcalde} onChange={(e) => updateValue(image.id, 'validosAlcalde', 'resumen', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">Blancos</label>
                          <input type="number" value={image.editedResumen.blancosAlcalde} onChange={(e) => updateValue(image.id, 'blancosAlcalde', 'resumen', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">Nulos</label>
                          <input type="number" value={image.editedResumen.nulosAlcalde} onChange={(e) => updateValue(image.id, 'nulosAlcalde', 'resumen', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                        </div>
                      </div>
                      {validacionAlcalde.total > 0 && (
                        <div className={`mt-2 text-xs text-center py-1 rounded ${validacionAlcalde.valido ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {validacionAlcalde.valido ? '✓ Validación correcta' : `⚠ Suma: ${validacionAlcalde.suma} / ${validacionAlcalde.total}`}
                        </div>
                      )}
                    </div>

                    <div className="border rounded-lg p-3">
                      <h3 className="font-semibold text-gray-900 mb-2">CONCEJAL</h3>
                      <PartidosEditor image={image} seccion="concejal" votos={image.editedConcejal} />
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t">
                        <div>
                          <label className="text-xs text-gray-500 block">Válidos</label>
                          <input type="number" value={image.editedResumen.validosConcejal} onChange={(e) => updateValue(image.id, 'validosConcejal', 'resumen', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">Blancos</label>
                          <input type="number" value={image.editedResumen.blancosConcejal} onChange={(e) => updateValue(image.id, 'blancosConcejal', 'resumen', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block">Nulos</label>
                          <input type="number" value={image.editedResumen.nulosConcejal} onChange={(e) => updateValue(image.id, 'nulosConcejal', 'resumen', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                        </div>
                      </div>
                      {validacionConcejal.total > 0 && (
                        <div className={`mt-2 text-xs text-center py-1 rounded ${validacionConcejal.valido ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {validacionConcejal.valido ? '✓ Validación correcta' : `⚠ Suma: ${validacionConcejal.suma} / ${validacionConcejal.total}`}
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-700">Datos de Control</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-gray-500 block">Habilitados</label>
                          <input type="number" value={image.editedResumen.habilitados} onChange={(e) => updateValue(image.id, 'habilitados', 'resumen', e.target.value)} className="w-full px-2 py-1 border rounded" />
                        </div>
                        <div>
                          <label className="text-gray-500 block">Papeletas en Ánfora</label>
                          <input type="number" value={image.editedResumen.papeletasAnfora} onChange={(e) => updateValue(image.id, 'papeletasAnfora', 'resumen', e.target.value)} className="w-full px-2 py-1 border rounded" />
                        </div>
                        <div>
                          <label className="text-gray-500 block">No Utilizadas</label>
                          <input type="number" value={image.editedResumen.papeletasNoUtilizadas} onChange={(e) => updateValue(image.id, 'papeletasNoUtilizadas', 'resumen', e.target.value)} className="w-full px-2 py-1 border rounded" />
                        </div>
                      </div>
                    </div>

                    <button className="btn btn-primary w-full flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />Guardar Acta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {images.filter((i) => i.status === 'processing').length > 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-3 text-gray-600">Procesando imágenes con OCR...</span>
        </div>
      )}

      {images.filter((i) => i.status === 'error').length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-red-700">Imágenes con errores</h3>
          {images.filter((i) => i.status === 'error').map((image) => (
            <div key={image.id} className="flex items-center justify-between bg-red-50 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <img src={image.preview} alt="" className="w-12 h-12 object-cover rounded" />
                <div>
                  <p className="text-sm font-medium text-red-900">{image.file.name}</p>
                  <p className="text-xs text-red-600">{image.error}</p>
                </div>
              </div>
              <button onClick={() => removeImage(image.id)} className="p-2 hover:bg-red-100 rounded">
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
