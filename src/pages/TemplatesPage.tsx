import React, { useState, useEffect } from 'react';
import { Template, EventItem } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import {
  FileBadge,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Share2,
  Calendar,
  Layers,
  Copy,
  Check,
  Globe,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface TemplatesPageProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const TemplatesPage: React.FC<TemplatesPageProps> = ({ onNavigate }) => {
  const toast = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals & Dialogs
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [selectedTemplateForEvent, setSelectedTemplateForEvent] = useState<Template | null>(null);
  const [isCreatingNewEvent, setIsCreatingNewEvent] = useState<boolean>(false);
  const [generatedEventResult, setGeneratedEventResult] = useState<EventItem | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    unique_field_name: 'documento',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tList, eList] = await Promise.all([api.getTemplates(), api.getEvents()]);
      setTemplates(tList);
      setEvents(eList);
    } catch (err: any) {
      toast.error('Error al cargar plantillas y eventos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      await api.deleteTemplate(templateToDelete.id);
      toast.success('Plantilla eliminada');
      setTemplateToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar plantilla');
    }
  };

  const handleOpenEventModal = (tmpl: Template) => {
    setSelectedTemplateForEvent(tmpl);
    setGeneratedEventResult(null);
    setCopiedSlug(null);

    const tmplEvents = events.filter((e) => e.template_id === tmpl.id);
    if (tmplEvents.length === 0) {
      setIsCreatingNewEvent(true);
      setEventForm({
        name: `Convocatoria: ${tmpl.name}`,
        description: 'Completa tus datos para emitir y descargar tu certificado oficial.',
        unique_field_name: 'documento',
      });
    } else {
      setIsCreatingNewEvent(false);
      setEventForm({
        name: `Convocatoria: ${tmpl.name}`,
        description: 'Completa tus datos para emitir y descargar tu certificado oficial.',
        unique_field_name: 'documento',
      });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateForEvent || !eventForm.name.trim()) return;

    try {
      const newEvent = await api.createEvent({
        name: eventForm.name,
        description: eventForm.description,
        template_id: selectedTemplateForEvent.id,
        unique_field_name: eventForm.unique_field_name,
        is_public_registration: 1,
      });

      toast.success(`¡Enlace público generado con éxito!`);
      // Display the generated event result directly inside the modal!
      setGeneratedEventResult(newEvent);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear evento');
    }
  };

  const copyToClipboard = (slug: string) => {
    const fullUrl = `${window.location.origin}/register/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    toast.success('Enlace copiado al portapapeles');
    setTimeout(() => {
      setCopiedSlug((current) => (current === slug ? null : current));
    }, 2500);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Plantillas de Certificados
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Diseña plantillas con tamaños Carta, A4, Oficio, A3 y genera enlaces públicos de registro
          </p>
        </div>
        <button
          onClick={() => onNavigate('editor')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva Plantilla
        </button>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-8">
          <FileBadge className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300 mb-1">
            No tienes plantillas creadas todavía
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            Crea tu primera plantilla de certificado con el editor visual WYSIWYG, sube tu diseño en WebP y posiciona nombres, fechas y códigos QR.
          </p>
          <button
            onClick={() => onNavigate('editor')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear Primera Plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tmpl) => {
            let elemCount = 0;
            try {
              elemCount = JSON.parse(tmpl.elements_json || '[]').length;
            } catch (e) {}

            const linkedEvents = events.filter((e) => e.template_id === tmpl.id);
            const primaryEvent = linkedEvents[0];

            return (
              <div
                key={tmpl.id}
                className="group flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition-all"
              >
                {/* Preview Thumbnail */}
                <div
                  onClick={() => onNavigate('editor', tmpl.id)}
                  className="h-44 bg-slate-950/80 border-b border-slate-800 relative cursor-pointer overflow-hidden flex items-center justify-center p-3"
                >
                  {tmpl.image_path ? (
                    <img
                      src={`/data/${tmpl.image_path}`}
                      alt={tmpl.name}
                      className="max-h-full max-w-full object-contain shadow-md rounded transition-transform group-hover:scale-105 duration-200"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600">
                      <FileBadge className="w-10 h-10 mb-1" />
                      <span className="text-[11px]">Plantilla Vectorial</span>
                    </div>
                  )}

                  <span className="absolute top-2.5 right-2.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700 backdrop-blur-sm">
                    {tmpl.page_size} • {tmpl.orientation}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-white truncate mb-1">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {tmpl.description || 'Sin descripción adicional'}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-4">
                      <span>{elemCount} elementos dinámicos</span>
                      <span>•</span>
                      <span className={linkedEvents.length > 0 ? 'text-indigo-400 font-medium' : ''}>
                        {linkedEvents.length} enlace{linkedEvents.length !== 1 ? 's' : ''} público{linkedEvents.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <button
                      onClick={() => handleOpenEventModal(tmpl)}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20"
                      title="Generar o consultar enlaces públicos de registro"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>
                        {linkedEvents.length > 0
                          ? `Enlaces Públicos (${linkedEvents.length})`
                          : 'Crear Enlace Público'}
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Quick 1-click Copy button if an event exists */}
                      {primaryEvent && (
                        <button
                          onClick={() => copyToClipboard(primaryEvent.slug)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            copiedSlug === primaryEvent.slug
                              ? 'text-emerald-400 bg-emerald-950/40'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                          title="Copiar enlace público al portapapeles"
                        >
                          {copiedSlug === primaryEvent.slug ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => onNavigate('editor', tmpl.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Editar en el Canvas"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTemplateToDelete(tmpl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Eliminar plantilla"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleDeleteTemplate}
        title="¿Eliminar plantilla?"
        message={`Esta acción eliminará la plantilla "${templateToDelete?.name}". No se eliminarán los certificados ya emitidos físicamente.`}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Enhanced Modal to View, Copy and Create Public Registration Links */}
      <Modal
        isOpen={!!selectedTemplateForEvent}
        onClose={() => {
          setSelectedTemplateForEvent(null);
          setGeneratedEventResult(null);
        }}
        title={`Enlaces Públicos de Registro • ${selectedTemplateForEvent?.name || ''}`}
        description="Permite que los participantes se registren online mediante un formulario y reciban su certificado automáticamente con ID y QR."
        maxWidth="lg"
      >
        <div className="space-y-5 select-none">
          {/* 1. If an event was JUST generated, display the success card with the link prominently! */}
          {generatedEventResult ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    ¡Enlace Público Generado Exitosamente!
                  </span>
                  <h4 className="text-sm font-semibold text-white">
                    {generatedEventResult.name}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Comparte el enlace a continuación. Los participantes podrán ingresar, llenar el formulario configurable y recibir su certificado oficial de inmediato.
                  </p>
                </div>
              </div>

              {/* URL Box with 1-click copy */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Enlace Público para Compartir:
                </label>
                <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <Globe className="w-4 h-4 text-indigo-400 ml-2 shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/register/${generatedEventResult.slug}`}
                    className="flex-1 bg-transparent text-xs text-indigo-300 font-mono focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedEventResult.slug)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shrink-0 shadow-sm"
                  >
                    {copiedSlug === generatedEventResult.slug ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Enlace</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Duplicate Prevention details */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Control de duplicados activo</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Campo único definido:{' '}
                  <strong className="text-slate-200 uppercase font-mono text-[10px]">
                    {generatedEventResult.unique_field_name}
                  </strong>
                  . Si una persona ya completó este formulario, el sistema le permitirá ver y descargar su certificado original conservando el mismo ID permanente y código QR.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <a
                  href={`/register/${generatedEventResult.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Formulario en Nueva Pestaña</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedEventResult(null);
                      setIsCreatingNewEvent(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:text-white"
                  >
                    Ver Todos los Enlaces
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateForEvent(null);
                      setGeneratedEventResult(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-950"
                  >
                    Listo / Cerrar
                  </button>
                </div>
              </div>
            </div>
          ) : !isCreatingNewEvent ? (
            /* 2. List of existing events for this template */
            <div className="space-y-4">
              {(() => {
                const tmplEvents = events.filter(
                  (e) => e.template_id === selectedTemplateForEvent?.id
                );

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Enlaces Activos ({tmplEvents.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewEvent(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear Nuevo Enlace</span>
                      </button>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {tmplEvents.map((ev) => {
                        const fullUrl = `${window.location.origin}/register/${ev.slug}`;
                        const isCopied = copiedSlug === ev.slug;

                        return (
                          <div
                            key={ev.id}
                            className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-semibold text-xs text-white">
                                  {ev.name}
                                </h4>
                                {ev.description && (
                                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                    {ev.description}
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                                Duplicados por: {ev.unique_field_name}
                              </span>
                            </div>

                            {/* Copy URL bar */}
                            <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl">
                              <Globe className="w-3.5 h-3.5 text-indigo-400 ml-1.5 shrink-0" />
                              <span className="flex-1 text-[11px] text-slate-300 font-mono truncate">
                                {fullUrl}
                              </span>

                              <button
                                type="button"
                                onClick={() => copyToClipboard(ev.slug)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>¡Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copiar</span>
                                  </>
                                )}
                              </button>

                              <a
                                href={`/register/${ev.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                                title="Abrir en pestaña nueva"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedTemplateForEvent(null)}
                        className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:text-white"
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            /* 3. Event creation form */
            <form onSubmit={handleCreateEvent} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-300">
                  Configurar Nuevo Formulario y Enlace Público
                </span>
                {events.filter((e) => e.template_id === selectedTemplateForEvent?.id).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewEvent(false)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    ← Ver enlaces existentes
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre del Evento o Convocatoria *
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  placeholder="ej. Taller Internacional de Ciberseguridad 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Instrucciones o Descripción para el Participante (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Completa tus datos para emitir y descargar tu certificado oficial..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Campo Único para Detección de Duplicados *
                </label>
                <select
                  value={eventForm.unique_field_name}
                  onChange={(e) => setEventForm({ ...eventForm, unique_field_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="documento">Documento de Identidad / DNI (Recomendado)</option>
                  <option value="email">Correo Electrónico</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Si un participante ya se registró en este evento con este mismo identificador, no se generará otro certificado sino que se le mostrará su certificado existente y podrá descargarlo o corregir sus datos conservando el mismo ID y QR.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (events.filter((e) => e.template_id === selectedTemplateForEvent?.id).length > 0) {
                      setIsCreatingNewEvent(false);
                    } else {
                      setSelectedTemplateForEvent(null);
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-950 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generar y Obtener Enlace</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};
