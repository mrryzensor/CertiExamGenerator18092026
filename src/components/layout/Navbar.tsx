import React from 'react';
import { Award, Plus, Sparkles, ExternalLink, Settings } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate }) => {
  const titles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Panel Principal',
      subtitle: 'Resumen general, métricas y accesos directos',
    },
    templates: {
      title: 'Plantillas de Certificados',
      subtitle: 'Administra diseños, tamaños Carta, A4, Oficio, A3 y proporciones',
    },
    editor: {
      title: 'Editor Visual WYSIWYG',
      subtitle: 'Diseña y posiciona nombres, fechas, ID único y QR con precisión',
    },
    certificates: {
      title: 'Certificados Emitidos',
      subtitle: 'Emisión masiva, importación Excel, búsqueda y revocación',
    },
    exams: {
      title: 'Exámenes con Gemini AI',
      subtitle: 'Generación con modelos Flash-Lite, calificación y claves de respuesta',
    },
    results: {
      title: 'Resultados & Analíticas',
      subtitle: 'Registro de intentos, notas y emisión automática al aprobar',
    },
    settings: {
      title: 'Configuración & API Keys',
      subtitle: 'Gestión local segura de Gemini API Keys con failover automático',
    },
  };

  const currentMeta = titles[currentTab] || {
    title: 'CertiExam Generator',
    subtitle: 'Plataforma integral de certificación y evaluación',
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 select-none">
      <div className="flex items-center gap-3">
        <div className="md:hidden w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <Award className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
            {currentMeta.title}
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block leading-tight">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick action buttons depending on tab */}
        {currentTab !== 'editor' && (
          <button
            onClick={() => onNavigate('editor')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-950 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nuevo Certificado</span>
          </button>
        )}

        {currentTab !== 'exams' && (
          <button
            onClick={() => onNavigate('exams')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 font-medium text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Crear Examen IA</span>
          </button>
        )}

        <button
          onClick={() => onNavigate('settings')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
          title="Configuración de API Keys"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
