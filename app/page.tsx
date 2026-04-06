import ReclamacionForm from '@/app/components/ReclamacionForm';

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ⚖️ Reclamación Accidentes de Tráfico
          </h1>
          <p className="text-lg text-gray-600">
            Genera cartas de reclamación extrajudicial a aseguradoras basadas en legislación española
          </p>
        </div>
      </header>

      {/* Aviso Legal */}
      <div className="max-w-4xl mx-auto px-4 py-4 w-full">
        <p className="text-xs text-gray-500 italic">
          💡 Aplicación de uso privado. El documento generado es orientativo y no constituye asesoramiento legal.
        </p>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <ReclamacionForm />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>© {currentYear} Reclamación Accidentes de Tráfico. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
