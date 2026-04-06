'use client';

import { useState } from 'react';

interface FormDataType {
  nombre: string;
  apellidos: string;
  dni: string;
  direccion: string;
  telefono: string;
  email: string;
  aseguradora: string;
  numeroPóliza: string;
  matricula: string;
  descripcion: string;
  tiposDaños: string[];
}

export default function ReclamacionForm() {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [carta, setCarta] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'generating' | 'result'>('form');
  const [formData, setFormData] = useState<FormDataType>({
    nombre: '',
    apellidos: '',
    dni: '',
    direccion: '',
    telefono: '',
    email: '',
    aseguradora: '',
    numeroPóliza: '',
    matricula: '',
    descripcion: '',
    tiposDaños: [],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));

    if (invalidFiles.length > 0) {
      setError('Todos los archivos deben ser PDF o DOCX');
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

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));

    if (invalidFiles.length > 0) {
      setError('Todos los archivos deben ser PDF o DOCX');
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
      tiposDaños: prev.tiposDaños.includes(tipo)
        ? prev.tiposDaños.filter((t) => t !== tipo)
        : [...prev.tiposDaños, tipo],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!formData.nombre || !formData.apellidos || !formData.dni || archivos.length === 0) {
      setError('Por favor complete los campos requeridos y suba al menos un archivo');
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
        throw new Error('Error al generar la reclamación');
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
          nombreReclamante: `${formData.nombre} ${formData.apellidos}`,
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
      a.download = `reclamacion_${formData.apellidos.replace(/\s+/g, '_')}_${hoy}.docx`;

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
      nombre: '',
      apellidos: '',
      dni: '',
      direccion: '',
      telefono: '',
      email: '',
      aseguradora: '',
      numeroPóliza: '',
      matricula: '',
      descripcion: '',
      tiposDaños: [],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {step === 'form' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Generador de Reclamaciones por Accidente de Tráfico
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Drag & Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-8 text-center cursor-pointer transition"
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="text-gray-600">
                    <p className="text-lg font-medium mb-2">
                      Arrastra archivos aquí o haz clic para seleccionar
                    </p>
                    <p className="text-sm text-gray-500">
                      Formatos aceptados: PDF, DOCX (puedes subir varios)
                    </p>
                  </div>
                </label>
              </div>

              {/* Archivos seleccionados */}
              {archivos.length > 0 && (
                <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-3">
                    ✓ {archivos.length} archivo{archivos.length !== 1 ? 's' : ''} seleccionado{archivos.length !== 1 ? 's' : ''}:
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

              {/* Formulario en dos columnas */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    DNI *
                  </label>
                  <input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aseguradora
                  </label>
                  <input
                    type="text"
                    name="aseguradora"
                    value={formData.aseguradora}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Póliza
                  </label>
                  <input
                    type="text"
                    name="numeroPóliza"
                    value={formData.numeroPóliza}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Matrícula del Vehículo
                  </label>
                  <input
                    type="text"
                    name="matricula"
                    value={formData.matricula}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Checkboxes de daños */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Tipos de Daños
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'materiales', label: 'Daños materiales' },
                    { id: 'personales', label: 'Daños personales' },
                    { id: 'lucro_cesante', label: 'Lucro cesante' },
                  ].map((tipo) => (
                    <label key={tipo.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.tiposDaños.includes(tipo.id)}
                        onChange={() => handleCheckboxChange(tipo.id)}
                        className="w-4 h-4 text-[#1e3a5f] rounded focus:ring-2 focus:ring-[#1e3a5f]"
                      />
                      <span className="ml-2 text-sm text-gray-700">{tipo.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Textarea descripción */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción del Accidente
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

              {/* Botón submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1e3a5f] hover:bg-[#152a45] text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                Generar Reclamación
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
              Generando su reclamación...
            </h2>
            <p className="text-gray-600">
              Claude está redactando la carta basándose en la legislación española
            </p>
          </div>
        )}

        {step === 'result' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Su Reclamación Está Lista
            </h2>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                📝 Puede editar el texto de la carta antes de descargar
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
                Nueva Reclamación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
