import React, { useState } from 'react';
import { Template, EventItem } from '../../types';
import {
  parseExcelFile,
  parsePastedSpreadsheetText,
  ColumnMapping,
  ParsedSpreadsheetResult,
} from '../../utils/excelParser';
import { api } from '../../services/apiService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import {
  FileSpreadsheet,
  ClipboardPaste,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Upload,
  Table,
} from 'lucide-react';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  events: EventItem[];
  onSuccess: () => void;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  isOpen,
  onClose,
  templates,
  events,
  onSuccess,
}) => {
  const toast = useToast();

  const [step, setStep] = useState<'input' | 'map' | 'processing'>('input');
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedSpreadsheetResult | null>(null);

  // Selections
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || ''
  );
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const resetState = () => {
    setStep('input');
    setPastedText('');
    setParsedData(null);
    setMappings([]);
    setIsProcessing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    try {
      const file = e.target.files[0];
      toast.info('Analizando archivo Excel...');
      const result = await parseExcelFile(file);
      if (result.rows.length === 0) {
        toast.error('El archivo no contiene filas de datos');
        return;
      }
      setParsedData(result);
      setMappings(result.suggestedMappings);
      setStep('map');
    } catch (err: any) {
      toast.error('Error al procesar el archivo Excel');
    }
  };

  const handleParsePasted = () => {
    if (!pastedText.trim()) {
      toast.error('Pega contenido copiado de Excel o Google Sheets');
      return;
    }
    try {
      const result = parsePastedSpreadsheetText(pastedText);
      if (result.rows.length === 0) {
        toast.error('No se detectaron datos tabulados');
        return;
      }
      setParsedData(result);
      setMappings(result.suggestedMappings);
      setStep('map');
    } catch (err: any) {
      toast.error('Error al procesar el texto pegado');
    }
  };

  const handleUpdateMapping = (header: string, targetField: string, customKeyName?: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.originalHeader === header
          ? { ...m, targetField, customKeyName: customKeyName ?? m.customKeyName }
          : m
      )
    );
  };

  const handleExecuteImport = async () => {
    if (!selectedTemplateId) {
      toast.error('Selecciona una plantilla de certificado para emitir');
      return;
    }

    if (!parsedData || parsedData.rows.length === 0) return;

    // Check that at least recipient_name and recipient_identifier are mapped
    const hasName = mappings.some((m) => m.targetField === 'recipient_name');
    const hasIdentifier = mappings.some((m) => m.targetField === 'recipient_identifier');

    if (!hasName || !hasIdentifier) {
      toast.error(
        'Debes asignar al menos las columnas "Nombre Completo" y "Documento / Identificador"'
      );
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      // Build normalized recipient objects
      const recipients = parsedData.rows.map((row) => {
        const item: Record<string, any> = {
          custom_fields: {},
        };

        mappings.forEach((m) => {
          const val = row[m.originalHeader];
          if (m.targetField === 'recipient_name') item.recipient_name = val;
          else if (m.targetField === 'recipient_identifier') item.recipient_identifier = val;
          else if (m.targetField === 'recipient_email') item.recipient_email = val;
          else if (m.targetField === 'issue_date') item.issue_date = val;
          else if (m.targetField === 'custom') {
            const key = m.customKeyName || m.originalHeader;
            item.custom_fields[key] = val;
          }
        });

        return item;
      });

      const response = await api.batchIssueCertificates({
        template_id: selectedTemplateId,
        event_id: selectedEventId || undefined,
        recipients,
      });

      toast.success(
        `Emisión completada: ${response.issued} emitidos, ${response.skippedDuplicates} duplicados omitidos.`
      );
      onSuccess();
      onClose();
      resetState();
    } catch (err: any) {
      toast.error(err.message || 'Error en la emisión en lote');
      setStep('map');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        resetState();
      }}
      title="Emisión Masiva de Certificados"
      description="Carga un Excel o pega celdas directamente para emitir certificados masivamente con detección de columnas."
      maxWidth="4xl"
    >
      {/* STEP 1: INPUT (UPLOAD OR PASTE) */}
      {step === 'input' && (
        <div className="space-y-6">
          {/* Tabs: Upload vs Paste */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveInputTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeInputTab === 'upload'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              Subir Archivo Excel (.xlsx, .csv)
            </button>
            <button
              onClick={() => setActiveInputTab('paste')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeInputTab === 'paste'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              Pegar Directamente desde Excel / Sheets
            </button>
          </div>

          {activeInputTab === 'upload' ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-10 text-center transition-colors bg-slate-950/40">
              <FileSpreadsheet className="w-12 h-12 text-indigo-400 mb-3" />
              <h4 className="text-sm font-semibold text-white mb-1">
                Selecciona o arrastra tu archivo Excel
              </h4>
              <p className="text-xs text-slate-400 mb-5">
                Soporta archivos .xlsx, .xls y .csv con cabeceras de columnas
              </p>
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-950 transition-all">
                Examinar Archivo
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Pega las celdas copiadas directamente de Excel o Google Sheets (Ctrl+V):
              </label>
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Nombre Completo	Documento	Correo	Institución
Juan Pérez	12345678	juan@ejemplo.com	Universidad Nacional
María Gómez	87654321	maria@ejemplo.com	Instituto Tecnológico"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParsePasted}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950 transition-colors"
                >
                  Continuar con la Asignación
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: MAPPING & DATA PREVIEW */}
      {step === 'map' && parsedData && (
        <div className="space-y-6">
          {/* Target Template & Event Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Plantilla de Certificado a Utilizar *
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.page_size} - {t.orientation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Evento Asociado (Opcional para control de duplicados)
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Sin evento específico (Emisión directa)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Column Mappings */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <Table className="w-4 h-4" />
              Asignación y Validación de Columnas Detectadas ({parsedData.headers.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {mappings.map((m) => (
                <div
                  key={m.originalHeader}
                  className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">
                      "{m.originalHeader}"
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {parsedData.rows[0]?.[m.originalHeader] || 'ejemplo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={m.targetField}
                      onChange={(e) => handleUpdateMapping(m.originalHeader, e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="recipient_name">Nombre Completo</option>
                      <option value="recipient_identifier">Documento / DNI / ID</option>
                      <option value="recipient_email">Correo Electrónico</option>
                      <option value="issue_date">Fecha de Emisión</option>
                      <option value="custom">Campo Personalizado</option>
                      <option value="ignore">Ignorar Columna</option>
                    </select>

                    {m.targetField === 'custom' && (
                      <input
                        type="text"
                        value={m.customKeyName || ''}
                        onChange={(e) =>
                          handleUpdateMapping(m.originalHeader, 'custom', e.target.value)
                        }
                        placeholder="clave_campo"
                        className="w-28 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview Table (First 5 rows) */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-400">
              Vista previa de las primeras filas ({parsedData.rows.length} filas detectadas):
            </span>
            <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    {parsedData.headers.map((h) => (
                      <th key={h} className="px-3 py-2 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50 font-mono text-[11px]">
                  {parsedData.rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      {parsedData.headers.map((h) => (
                        <td key={h} className="px-3 py-1.5 whitespace-nowrap">
                          {row[h] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-400 hover:text-white"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950 transition-all"
            >
              Emitir {parsedData.rows.length} Certificados
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PROCESSING */}
      {step === 'processing' && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <h4 className="text-base font-semibold text-white">
            Generando Certificados y PDFs Físicos en Disco...
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Generando IDs únicos permanentes, calculando códigos QR y almacenando físicamente los archivos.
          </p>
        </div>
      )}
    </Modal>
  );
};
