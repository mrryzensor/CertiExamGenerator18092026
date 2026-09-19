import React from 'react';
import {
  Template,
  TemplateElement,
  PaperSize,
  Orientation,
  ImageFitMode,
} from '../../types';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Palette,
  Sliders,
  Maximize,
  Copy,
  Trash2,
  FileText,
  QrCode,
  Image,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface PropertiesPanelProps {
  template: Partial<Template>;
  selectedElement: TemplateElement | null;
  onUpdateElement: (id: string, updates: Partial<TemplateElement>) => void;
  onUpdateTemplate: (updates: Partial<Template>) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onCloseMobileDrawer?: () => void;
}

const FONT_OPTIONS = [
  { label: 'Inter (Moderna y Limpia)', value: 'Inter' },
  { label: 'Cinzel (Elegante Clásica)', value: 'Cinzel' },
  { label: 'Playfair Display (Serif Distinguida)', value: '"Playfair Display"' },
  { label: 'Montserrat (Geométrica Premium)', value: 'Montserrat' },
  { label: 'Merriweather (Académica)', value: 'Merriweather' },
  { label: 'Dancing Script (Firma / Manuscrita)', value: '"Dancing Script"' },
  { label: 'Roboto (Estándar)', value: 'Roboto' },
];

const PRESET_COLORS = [
  '#0f172a', // Slate 900
  '#1e293b', // Slate 800
  '#1e1b4b', // Indigo 950
  '#312e81', // Indigo 900
  '#4338ca', // Indigo 700
  '#065f46', // Emerald 800
  '#78350f', // Amber 900
  '#831843', // Pink 900
  '#7f1d1d', // Red 900
  '#ffffff', // White
  '#f8fafc', // Slate 50
  '#cbd5e1', // Slate 300
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  template,
  selectedElement,
  onUpdateElement,
  onUpdateTemplate,
  onDuplicateElement,
  onDeleteElement,
}) => {
  // If an element is persistently selected, show ELEMENT properties
  if (selectedElement) {
    const isQr = selectedElement.type === 'qr_code';

    return (
      <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto space-y-6 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              {isQr ? <QrCode className="w-4 h-4" /> : <Type className="w-4 h-4" />}
              Propiedades del Elemento
            </h3>
            <span className="text-xs text-slate-300 font-medium">{selectedElement.label || selectedElement.type}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDuplicateElement(selectedElement.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Duplicar elemento"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteElement(selectedElement.id)}
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
              title="Eliminar elemento"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Text / Label configuration if not QR */}
        {!isQr && (
          <div className="space-y-3">
            {selectedElement.type === 'custom_text' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Texto Fijo
                </label>
                <textarea
                  rows={2}
                  value={selectedElement.staticText || ''}
                  onChange={(e) => onUpdateElement(selectedElement.id, { staticText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {selectedElement.type === 'field' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Clave del Campo Personalizado
                </label>
                <input
                  type="text"
                  value={selectedElement.fieldKey || ''}
                  onChange={(e) => onUpdateElement(selectedElement.id, { fieldKey: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="ej. institucion, curso, horas"
                />
              </div>
            )}

            {/* Font Family */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Tipografía
              </label>
              <select
                value={selectedElement.fontFamily || 'Inter'}
                onChange={(e) => onUpdateElement(selectedElement.id, { fontFamily: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Tamaño de Fuente</span>
                <span className="font-mono text-slate-200">{selectedElement.fontSize || 18} pt</span>
              </div>
              <input
                type="range"
                min="8"
                max="80"
                step="1"
                value={selectedElement.fontSize || 18}
                onChange={(e) => onUpdateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Text Styles & Alignment */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold',
                    })
                  }
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-colors ${
                    selectedElement.fontWeight === 'bold'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Negrita"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                    })
                  }
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-colors ${
                    selectedElement.fontStyle === 'italic'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Cursiva"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      textDecoration:
                        selectedElement.textDecoration === 'underline' ? 'none' : 'underline',
                    })
                  }
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-colors ${
                    selectedElement.textDecoration === 'underline'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Subrayado"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Alignments */}
              <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-xl p-1">
                {(['left', 'center', 'right'] as const).map((align) => {
                  const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                  return (
                    <button
                      key={align}
                      type="button"
                      onClick={() => onUpdateElement(selectedElement.id, { textAlign: align })}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-colors ${
                        (selectedElement.textAlign || 'center') === align
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title={`Alinear a la ${align}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Letter spacing & Color */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Color del Texto
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="color"
                  value={selectedElement.color || '#1e293b'}
                  onChange={(e) => onUpdateElement(selectedElement.id, { color: e.target.value })}
                  className="w-8 h-8 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={selectedElement.color || '#1e293b'}
                  onChange={(e) => onUpdateElement(selectedElement.id, { color: e.target.value })}
                  className="flex-1 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onUpdateElement(selectedElement.id, { color: c })}
                    className="w-5 h-5 rounded-full border border-slate-600 shadow-sm transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* QR Code specific properties */}
        {isQr && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Tamaño del QR</span>
                <span className="font-mono text-slate-200">{selectedElement.qrSize || 25} mm</span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="1"
                value={selectedElement.qrSize || 25}
                onChange={(e) => onUpdateElement(selectedElement.id, { qrSize: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* QR Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Color QR (Oscuro)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={selectedElement.qrDarkColor || '#000000'}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { qrDarkColor: e.target.value })
                    }
                    className="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={selectedElement.qrDarkColor || '#000000'}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { qrDarkColor: e.target.value })
                    }
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Fondo QR (Claro)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={selectedElement.qrLightColor || '#ffffff'}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { qrLightColor: e.target.value })
                    }
                    className="w-7 h-7 rounded border border-slate-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={selectedElement.qrLightColor || '#ffffff'}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { qrLightColor: e.target.value })
                    }
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-300">
              <p className="text-[11px] leading-relaxed text-slate-400">
                Cada QR redirige automáticamente a la página pública de verificación{' '}
                <span className="font-mono text-indigo-400">/verify/:id</span> para comprobar autenticidad y descargar el PDF oficial.
              </p>
            </div>
          </div>
        )}

        {/* Position Relative Coordinates (X%, Y%) */}
        <div className="border-t border-slate-800 pt-4">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Posición Relativa (%)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 uppercase">Posición X</span>
              <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={selectedElement.xPercent}
                  onChange={(e) =>
                    onUpdateElement(selectedElement.id, { xPercent: Number(e.target.value) })
                  }
                  className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase">Posición Y</span>
              <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={selectedElement.yPercent}
                  onChange={(e) =>
                    onUpdateElement(selectedElement.id, { yPercent: Number(e.target.value) })
                  }
                  className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If NO element is selected, show DOCUMENT & BACKGROUND SETTINGS
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto space-y-6 select-none">
      <div className="border-b border-slate-800 pb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          Ajustes del Documento
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Configuración global del tamaño y la plantilla de fondo
        </p>
      </div>

      {/* Document Size Selector */}
      <div className="space-y-3">
        <label className="block text-xs font-medium text-slate-300">
          Tamaño Físico del Certificado
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'letter', label: 'Carta (Letter)', size: '279 × 216 mm' },
              { id: 'a4', label: 'A4', size: '297 × 210 mm' },
              { id: 'legal', label: 'Oficio (Legal)', size: '356 × 216 mm' },
              { id: 'a3', label: 'A3', size: '420 × 297 mm' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onUpdateTemplate({ page_size: item.id as PaperSize })}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                template.page_size === item.id
                  ? 'border-indigo-500 bg-indigo-600/15 text-white shadow-sm'
                  : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="text-xs font-semibold">{item.label}</div>
              <div className="text-[10px] text-slate-400">{item.size}</div>
            </button>
          ))}
        </div>

        {/* Custom Paper Size */}
        <button
          type="button"
          onClick={() => onUpdateTemplate({ page_size: 'custom' })}
          className={`w-full p-2.5 rounded-xl border text-left transition-all ${
            template.page_size === 'custom'
              ? 'border-indigo-500 bg-indigo-600/15 text-white shadow-sm'
              : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <div className="text-xs font-semibold">Personalizado (Custom mm)</div>
          <div className="text-[10px] text-slate-400">Define ancho y alto exactos</div>
        </button>

        {template.page_size === 'custom' && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
            <div>
              <span className="text-[10px] text-slate-400">Ancho (mm)</span>
              <input
                type="number"
                min="50"
                max="1000"
                value={template.custom_width || 280}
                onChange={(e) =>
                  onUpdateTemplate({ custom_width: Number(e.target.value) })
                }
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Alto (mm)</span>
              <input
                type="number"
                min="50"
                max="1000"
                value={template.custom_height || 200}
                onChange={(e) =>
                  onUpdateTemplate({ custom_height: Number(e.target.value) })
                }
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Orientation */}
      <div className="space-y-2 border-t border-slate-800 pt-4">
        <label className="block text-xs font-medium text-slate-300">
          Orientación del Documento
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onUpdateTemplate({ orientation: 'landscape' })}
            className={`p-2.5 rounded-xl border text-center transition-all ${
              (template.orientation || 'landscape') === 'landscape'
                ? 'border-indigo-500 bg-indigo-600/15 text-white font-semibold'
                : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-slate-400'
            }`}
          >
            Horizontal (Landscape)
          </button>
          <button
            type="button"
            onClick={() => onUpdateTemplate({ orientation: 'portrait' })}
            className={`p-2.5 rounded-xl border text-center transition-all ${
              template.orientation === 'portrait'
                ? 'border-indigo-500 bg-indigo-600/15 text-white font-semibold'
                : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-slate-400'
            }`}
          >
            Vertical (Portrait)
          </button>
        </div>
      </div>

      {/* Background Image Fit Mode */}
      <div className="space-y-2 border-t border-slate-800 pt-4">
        <label className="block text-xs font-medium text-slate-300">
          Ajuste de la Imagen de Fondo
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'fit', label: 'Fit / Contain', desc: 'Muestra completa sin recortar' },
            { id: 'cover', label: 'Cover / Fill', desc: 'Cubre 100% recortando excedente' },
            { id: 'stretch', label: 'Stretch', desc: 'Estira al tamaño exacto' },
            { id: 'custom', label: 'Original / Custom', desc: 'Escala y posición manual' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onUpdateTemplate({ image_fit: mode.id as ImageFitMode })}
              className={`p-2 rounded-xl border text-left transition-all ${
                (template.image_fit || 'fit') === mode.id
                  ? 'border-indigo-500 bg-indigo-600/15 text-white'
                  : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-slate-400'
              }`}
            >
              <div className="text-xs font-medium text-slate-200">{mode.label}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{mode.desc}</div>
            </button>
          ))}
        </div>

        {/* Custom fit options: scale slider & offset */}
        {template.image_fit === 'custom' && (
          <div className="space-y-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700 mt-2">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Escala de Fondo</span>
                <span className="font-mono text-slate-200">
                  {Math.round((template.image_custom_scale ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="3"
                step="0.05"
                value={template.image_custom_scale ?? 1}
                onChange={(e) =>
                  onUpdateTemplate({ image_custom_scale: Number(e.target.value) })
                }
                className="w-full accent-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Offset X (px)</span>
                <input
                  type="number"
                  value={template.image_custom_x ?? 0}
                  onChange={(e) =>
                    onUpdateTemplate({ image_custom_x: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Offset Y (px)</span>
                <input
                  type="number"
                  value={template.image_custom_y ?? 0}
                  onChange={(e) =>
                    onUpdateTemplate({ image_custom_y: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 leading-relaxed">
        <p>
          💡 <strong className="text-slate-300">Selección Persistente:</strong> Haz un solo clic o tap sobre cualquier elemento en el lienzo para seleccionarlo y editar sus controles.
        </p>
      </div>
    </div>
  );
};
