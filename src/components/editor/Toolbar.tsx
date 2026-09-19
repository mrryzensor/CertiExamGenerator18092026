import React from 'react';
import {
  User,
  Calendar,
  Type,
  Hash,
  QrCode,
  Tag,
  Save,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Upload,
  Share2,
} from 'lucide-react';

interface ToolbarProps {
  onAddElement: (
    type: 'full_name' | 'first_name' | 'last_name' | 'date' | 'custom_text' | 'certificate_id' | 'qr_code' | 'field'
  ) => void;
  onSave: () => void;
  isSaving: boolean;
  previewSampleData: boolean;
  onTogglePreview: () => void;
  onToggleMobileDrawer: () => void;
  onTriggerUpload: () => void;
  onOpenPublicLink?: () => void;
  hasSavedTemplate?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddElement,
  onSave,
  isSaving,
  previewSampleData,
  onTogglePreview,
  onToggleMobileDrawer,
  onTriggerUpload,
  onOpenPublicLink,
  hasSavedTemplate,
}) => {
  return (
    <div className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 z-20 shrink-0 select-none overflow-x-auto">
      {/* Add Element Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden xl:inline mr-1">
          Agregar:
        </span>

        <button
          type="button"
          onClick={() => onAddElement('full_name')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          title="Agregar Nombre Completo del Participante"
        >
          <User className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Nombre Completo</span>
        </button>

        <button
          type="button"
          onClick={() => onAddElement('date')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          title="Agregar Fecha de Emisión"
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Fecha</span>
        </button>

        <button
          type="button"
          onClick={() => onAddElement('certificate_id')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          title="Agregar ID Único Impredecible"
        >
          <Hash className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">ID Certificado</span>
        </button>

        <button
          type="button"
          onClick={() => onAddElement('qr_code')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition-colors"
          title="Agregar Código QR Oficial"
        >
          <QrCode className="w-3.5 h-3.5 text-indigo-400" />
          <span>Código QR</span>
        </button>

        <button
          type="button"
          onClick={() => onAddElement('custom_text')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          title="Agregar Texto Libre"
        >
          <Type className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden lg:inline">Texto Fijo</span>
        </button>

        <button
          type="button"
          onClick={() => onAddElement('field')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          title="Agregar Campo Dinámico de Formulario"
        >
          <Tag className="w-3.5 h-3.5 text-violet-400" />
          <span className="hidden lg:inline">Campo Dinámico</span>
        </button>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Replace Template Background */}
        <button
          type="button"
          onClick={onTriggerUpload}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          title="Subir o reemplazar imagen de fondo"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Fondo WebP</span>
        </button>

        {/* Toggle Sample Preview */}
        <button
          type="button"
          onClick={onTogglePreview}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
            previewSampleData
              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title="Alternar entre etiquetas y datos de muestra reales"
        >
          {previewSampleData ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">
            {previewSampleData ? 'Vista Real' : 'Variables'}
          </span>
        </button>

        {/* Open mobile drawer */}
        <button
          type="button"
          onClick={onToggleMobileDrawer}
          className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          title="Abrir propiedades"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Enlace Público button if template is saved */}
        {hasSavedTemplate && onOpenPublicLink && (
          <button
            type="button"
            onClick={onOpenPublicLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-colors"
            title="Generar o consultar enlace público de registro"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Enlace Público</span>
          </button>
        )}

        {/* Save Template Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-900/40 transition-all disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
        </button>
      </div>
    </div>
  );
};
