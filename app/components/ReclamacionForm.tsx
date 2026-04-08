'use client';

import { useState } from 'react';

interface FormDataType {
  descripcion: string;
  tiposDanos: string[];
}

const MIME_TYPES_ADMITIDOS = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
]);

const EXTENSIONES_ADMITIDAS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.tiff',
  '.tif',
  '.heic',
  '.heif',
];

function esArchivoAdmitido(file: File): boolean {
  const type = file.type.toLowerCase();
  if (MIME_TYPES_ADMITIDOS.has(type)) {
    return true;
  }

  const name = file.name.toLowerCase();
  return EXTENSIONES_ADMITIDAS.some((ext) => name.endsWith(ext));
}

export default function ReclamacionForm() {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [carta, setCarta] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'generating' | 'result'>('form');
  const [formData, setFormData] = useState<FormDataType>({
    descripcion: '',
    tiposDanos: [],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter((f) => !esArchivoAdmitido(f));

    if (invalidFiles.length > 0) {
      setError('Formato no admitido. Usa PDF, Word, Excel o imagen (JPG, PNG, etc.)');
      return;
    }

    setArchivos((prev) => [...prev, ...files]);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter((f) => !esArchivoAdmitido(f));

    if (invalidFiles.length > 0) {
      setError('Formato no admitido. Usa PDF, Word, Excel o imagen (JPG, PNG, etc.)');
      return;
    }

    setArchivos((prev) => [...prev, ...files]);
    setError(null);
  };

  const removeArchivo = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (tipo: string) => {
    setFormData((prev) => ({
      ...prev,
      tiposDanos: prev.tiposDanos.includes(tipo)
        ? prev.tiposDanos.filter((t) => t !== tipo)
        : [...prev.tiposDanos, tipo],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (archivos.length === 0) {
      setError('Por favor suba al menos un archivo');
      return;
    }

    setStep('generating');
    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      archivos.forEach((archivo) => {
        formDataToSend.append('archivos', archivo);
      });
      formDataToSend.append('datosAdicionales', JSON.stringify(formData));

      const response = await fetch('/api/reclamacion', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Error al generar la reclamacion');
      }

      const data = await response.json();
      setCarta(data.carta);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDescargarDocx = async () => {
    try {
      const response = await fetch('/api/generar-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carta,
          nombreReclamante: 'Reclamante',
        }),
      });

      if (!response.ok) {
        throw new Error('Error al descargar el documento');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const hoy = new Date().toISOString().split('T')[0];
      a.download = `reclamacion_${hoy}.docx`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar');
    }
  };

  const handleVolver = () => {
    setArchivos([]);
    setCarta('');
    setError(null);
    setStep('form');
    setFormData({
      descripcion: '',
      tiposDanos: [],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {step === 'form' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Generador de Reclamaciones por Accidente de Trafico
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-8 text-center cursor-pointer transition"
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,.heic,.heif"
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="text-gray-600">
                    <p className="text-lg font-medium mb-2">
                      Arrastra archivos aqui o haz clic para seleccionar
                    </p>
                    <p className="text-sm text-gray-500">
                      Formatos aceptados: PDF, Word, Excel e imagen (puedes subir varios)
                    </p>
                  </div>
                </label>
              </div>

              {archivos.length > 0 && (
                <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-3">
                    {archivos.length} archivo{archivos.length !== 1 ? 's' : ''}{' '}
                    seleccionado{archivos.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="space-y-2">
                    {archivos.map((archivo, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-white p-2 rounded"
                      >
                        <span className="text-sm text-gray-700">{archivo.name}</span>
                        <button
                          type="button"
                          onClick={() => removeArchivo(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Tipos de Danos
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'materiales', label: 'Danos materiales' },
                    { id: 'personales', label: 'Danos personales' },
                    { id: 'lucro_cesante', label: 'Lucro cesante' },
                  ].map((tipo) => (
                    <label key={tipo.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.tiposDanos.includes(tipo.id)}
                        onChange={() => handleCheckboxChange(tipo.id)}
                        className="w-4 h-4 text-[#1e3a5f] rounded focus:ring-2 focus:ring-[#1e3a5f]"
                      />
                      <span className="ml-2 text-sm text-gray-700">{tipo.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripcion del Accidente
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleFormChange}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  placeholder="Describe los hechos del accidente, fecha, hora, lugar, etc."
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1e3a5f] hover:bg-[#152a45] text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                Generar Reclamacion
              </button>
            </form>
          </div>
        )}

        {step === 'generating' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="animate-spin">
                <svg
                  className="w-12 h-12 text-[#1e3a5f]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Generando su reclamacion...
            </h2>
            <p className="text-gray-600">
              Claude esta redactando la carta basandose en la legislacion espanola
            </p>
          </div>
        )}

        {step === 'result' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Su Reclamacion Esta Lista
            </h2>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                Puede editar el texto de la carta antes de descargar
              </p>
            </div>

            <textarea
              value={carta}
              onChange={(e) => setCarta(e.target.value)}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent mb-6 font-mono text-sm"
            />

            <div className="flex gap-4">
              <button
                onClick={handleDescargarDocx}
                className="flex-1 bg-[#1e3a5f] hover:bg-[#152a45] text-white font-bold py-3 rounded-lg transition"
              >
                Descargar Word (.docx)
              </button>
              <button
                onClick={handleVolver}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition"
              >
                Nueva Reclamacion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
