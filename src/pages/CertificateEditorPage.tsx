import React, { useState, useEffect } from 'react';
import {
  Template,
  TemplateElement,
  PaperSize,
  Orientation,
  ImageFitMode,
  EventItem,
} from '../types';
import { api } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { Toolbar } from '../components/editor/Toolbar';
import { CertificateCanvas } from '../components/editor/CertificateCanvas';
import { PropertiesPanel } from '../components/editor/PropertiesPanel';
import { Drawer } from '../components/ui/Drawer';
import { Modal } from '../components/ui/Modal';
import {
  ArrowLeft,
  Share2,
  Globe,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Plus,
  Sparkles,
} from 'lucide-react';

interface CertificateEditorPageProps {
  templateId?: string | null;
  onNavigate: (tab: string, param?: string) => void;
}

export const CertificateEditorPage: React.FC<CertificateEditorPageProps> = ({
  templateId,
  onNavigate,
}) => {
  const toast = useToast();

  const [template, setTemplate] = useState<Partial<Template>>({
    name: 'Nueva Plantilla de Certificado',
    description: '',
    page_size: 'letter',
    custom_width: 279.4,
    custom_height: 215.9,
    unit: 'mm',
    orientation: 'landscape',
    image_fit: 'fit',
    image_custom_scale: 1,
    image_custom_x: 0,
    image_custom_y: 0,
    elements_json: '[]',
  });

  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(0.9);
  const [previewSampleData, setPreviewSampleData] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Public Link Modal state
  const [isPublicLinkModalOpen, setIsPublicLinkModalOpen] = useState<boolean>(false);
  const [templateEvents, setTemplateEvents] = useState<EventItem[]>([]);
  const [isCreatingNewEvent, setIsCreatingNewEvent] = useState<boolean>(false);
  const [generatedEventResult, setGeneratedEventResult] = useState<EventItem | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    name: '',
    description: 'Completa tus datos para emitir y descargar tu certificado oficial.',
    unique_field_name: 'documento',
  });

  const loadEventsForTemplate = async (tmplId: string) => {
    try {
      const allEvents = await api.getEvents();
      setTemplateEvents(allEvents.filter((e) => e.template_id === tmplId));
    } catch (e) {}
  };

  // Load existing template if ID provided
  useEffect(() => {
    if (templateId) {
      api
        .getTemplate(templateId)
        .then((data) => {
          setTemplate(data);
          try {
            const parsed = JSON.parse(data.elements_json || '[]');
            setElements(parsed);
          } catch (e) {
            setElements([]);
          }
          loadEventsForTemplate(data.id);
        })
        .catch((err) => {
          toast.error('No se pudo cargar la plantilla solicitada');
        });
    } else {
      // Default initial elements for a ready-to-use professional layout
      const initialElements: TemplateElement[] = [
        {
          id: `el-${Date.now()}-1`,
          type: 'full_name',
          label: 'Nombre del Participante',
          xPercent: 50,
          yPercent: 48,
          fontFamily: 'Cinzel',
          fontSize: 28,
          fontWeight: 'bold',
          color: '#1e1b4b',
          textAlign: 'center',
        },
        {
          id: `el-${Date.now()}-2`,
          type: 'date',
          label: 'Fecha de Emisión',
          xPercent: 30,
          yPercent: 78,
          fontFamily: 'Inter',
          fontSize: 12,
          fontWeight: 'normal',
          color: '#475569',
          textAlign: 'center',
        },
        {
          id: `el-${Date.now()}-3`,
          type: 'qr_code',
          label: 'QR de Verificación',
          xPercent: 82,
          yPercent: 78,
          qrSize: 22,
          qrDarkColor: '#0f172a',
          qrLightColor: '#ffffff',
        },
        {
          id: `el-${Date.now()}-4`,
          type: 'certificate_id',
          label: 'ID Único del Certificado',
          xPercent: 82,
          yPercent: 91,
          fontFamily: 'Roboto',
          fontSize: 8,
          fontWeight: 'bold',
          color: '#64748b',
          textAlign: 'center',
        },
      ];
      setElements(initialElements);
    }
  }, [templateId]);

  // Add new element
  const handleAddElement = (
    type: 'full_name' | 'first_name' | 'last_name' | 'date' | 'custom_text' | 'certificate_id' | 'qr_code' | 'field'
  ) => {
    const id = `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let newEl: TemplateElement = {
      id,
      type,
      xPercent: 50,
      yPercent: 50,
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 'normal',
      textAlign: 'center',
      color: '#1e293b',
    };

    if (type === 'full_name') {
      newEl.label = 'Nombre Completo';
      newEl.fontSize = 24;
      newEl.fontFamily = 'Cinzel';
      newEl.fontWeight = 'bold';
    } else if (type === 'first_name') {
      newEl.label = 'Nombres';
    } else if (type === 'last_name') {
      newEl.label = 'Apellidos';
    } else if (type === 'date') {
      newEl.label = 'Fecha';
      newEl.fontSize = 12;
    } else if (type === 'certificate_id') {
      newEl.label = 'ID Certificado';
      newEl.fontSize = 9;
      newEl.fontWeight = 'bold';
      newEl.color = '#64748b';
    } else if (type === 'qr_code') {
      newEl.label = 'Código QR';
      newEl.qrSize = 25;
      newEl.qrDarkColor = '#000000';
      newEl.qrLightColor = '#ffffff';
    } else if (type === 'custom_text') {
      newEl.label = 'Texto Personalizado';
      newEl.staticText = 'Por su destacada participación en el programa oficial';
    } else if (type === 'field') {
      newEl.label = 'Campo Formulario';
      newEl.fieldKey = 'institucion';
    }

    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(id);
    toast.success(`Elemento "${newEl.label}" agregado.`);
  };

  // Update element
  const handleUpdateElement = (id: string, updates: Partial<TemplateElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
  };

  // Update template document settings
  const handleUpdateTemplate = (updates: Partial<Template>) => {
    setTemplate((prev) => ({ ...prev, ...updates }));
  };

  // Duplicate element
  const handleDuplicateElement = (id: string) => {
    const el = elements.find((item) => item.id === id);
    if (!el) return;

    const newId = `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const copy: TemplateElement = {
      ...el,
      id: newId,
      label: `${el.label || el.type} (Copia)`,
      xPercent: Math.min(95, el.xPercent + 3),
      yPercent: Math.min(95, el.yPercent + 3),
    };

    setElements((prev) => [...prev, copy]);
    setSelectedElementId(newId);
    toast.info('Elemento duplicado');
  };

  // Delete element
  const handleDeleteElement = (id: string) => {
    setElements((prev) => prev.filter((item) => item.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    toast.info('Elemento eliminado');
  };

  // Save template to server
  const handleSave = async () => {
    if (!template.name?.trim()) {
      toast.error('Por favor ingresa un nombre para la plantilla');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Template> = {
        ...template,
        elements_json: JSON.stringify(elements),
      };

      if (template.id) {
        await api.updateTemplate(template.id, payload);
        toast.success('Plantilla actualizada exitosamente');
      } else {
        const created = await api.createTemplate(payload);
        setTemplate(created);
        toast.success('Plantilla creada y guardada exitosamente');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la plantilla');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPublicLink = async () => {
    if (!template.id) {
      toast.warning('Guarda la plantilla primero para poder generar su enlace público');
      return;
    }
    setGeneratedEventResult(null);
    setCopiedSlug(null);
    await loadEventsForTemplate(template.id);
    setEventForm({
      name: `Convocatoria: ${template.name || 'Certificación'}`,
      description: 'Completa tus datos para emitir y descargar tu certificado oficial.',
      unique_field_name: 'documento',
    });
    setIsCreatingNewEvent(false);
    setIsPublicLinkModalOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template.id || !eventForm.name.trim()) return;

    try {
      const newEvent = await api.createEvent({
        name: eventForm.name,
        description: eventForm.description,
        template_id: template.id,
        unique_field_name: eventForm.unique_field_name,
        is_public_registration: 1,
      });

      toast.success('¡Enlace público generado con éxito!');
      setGeneratedEventResult(newEvent);
      await loadEventsForTemplate(template.id);
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

  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Subheader: Template Name & Back link */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('templates')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Volver a lista de plantillas"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={template.name || ''}
            onChange={(e) => handleUpdateTemplate({ name: e.target.value })}
            className="bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-indigo-500 px-1 py-0.5"
            placeholder="Nombre de la Plantilla..."
          />
        </div>
      </div>

      {/* Action Toolbar */}
      <Toolbar
        onAddElement={handleAddElement}
        onSave={handleSave}
        isSaving={isSaving}
        previewSampleData={previewSampleData}
        onTogglePreview={() => setPreviewSampleData(!previewSampleData)}
        onToggleMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onTriggerUpload={() => {
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          fileInput?.click();
        }}
        onOpenPublicLink={handleOpenPublicLink}
        hasSavedTemplate={!!template.id}
      />

      {/* Workspace: Canvas + Persistent Properties Panel */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Visual Canvas */}
        <CertificateCanvas
          template={template}
          elements={elements}
          selectedElementId={selectedElementId}
          onSelectElement={(id) => {
            setSelectedElementId(id);
          }}
          onUpdateElement={handleUpdateElement}
          onUpdateTemplate={handleUpdateTemplate}
          onDuplicateElement={handleDuplicateElement}
          onDeleteElement={handleDeleteElement}
          zoom={zoom}
          onZoomChange={setZoom}
          previewSampleData={previewSampleData}
        />

        {/* Desktop Sidebar Properties Panel */}
        <div className="hidden lg:block w-80 shrink-0 h-full overflow-hidden shadow-xl z-20">
          <PropertiesPanel
            template={template}
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onUpdateTemplate={handleUpdateTemplate}
            onDuplicateElement={handleDuplicateElement}
            onDeleteElement={handleDeleteElement}
          />
        </div>
      </div>

      {/* Mobile Drawer for Properties */}
      <Drawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        title={selectedElement ? 'Propiedades del Elemento' : 'Ajustes del Documento'}
        position="right"
      >
        <PropertiesPanel
          template={template}
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElement}
          onUpdateTemplate={handleUpdateTemplate}
          onDuplicateElement={handleDuplicateElement}
          onDeleteElement={handleDeleteElement}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        />
      </Drawer>

      {/* Public Link Modal in Editor */}
      <Modal
        isOpen={isPublicLinkModalOpen}
        onClose={() => {
          setIsPublicLinkModalOpen(false);
          setGeneratedEventResult(null);
        }}
        title={`Enlaces Públicos de Registro • ${template.name || ''}`}
        description="Genera y comparte el enlace público para que los alumnos se registren y reciban su certificado automáticamente."
        maxWidth="lg"
      >
        <div className="space-y-5 select-none">
          {generatedEventResult ? (
            /* Newly Created Event View */
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
                    Los participantes podrán ingresar y recibir su certificado oficial de inmediato.
                  </p>
                </div>
              </div>

              {/* URL Box */}
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

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400">
                <p className="text-[11px] leading-relaxed">
                  Control de duplicados activo por: <strong className="text-slate-200 uppercase font-mono">{generatedEventResult.unique_field_name}</strong>.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <a
                  href={`/register/${generatedEventResult.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en Nueva Pestaña</span>
                </a>

                <button
                  type="button"
                  onClick={() => setIsPublicLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md"
                >
                  Listo / Cerrar
                </button>
              </div>
            </div>
          ) : !isCreatingNewEvent && templateEvents.length > 0 ? (
            /* Existing Events List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Enlaces Activos ({templateEvents.length})
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
                {templateEvents.map((ev) => {
                  const fullUrl = `${window.location.origin}/register/${ev.slug}`;
                  const isCopied = copiedSlug === ev.slug;

                  return (
                    <div
                      key={ev.id}
                      className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold text-xs text-white truncate">{ev.name}</h4>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                          Duplicados por: {ev.unique_field_name}
                        </span>
                      </div>

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
                  onClick={() => setIsPublicLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:text-white"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleCreateEvent} className="space-y-4 animate-in fade-in">
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
                  Si un participante ya se registró en este evento con este mismo valor, se le mostrará su certificado existente sin duplicar su ID único.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPublicLinkModalOpen(false)}
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
