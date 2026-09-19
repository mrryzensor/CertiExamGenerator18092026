import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { EventItem, Certificate, FormField } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import {
  Award,
  CheckCircle2,
  Download,
  AlertCircle,
  ExternalLink,
  Edit,
  Save,
  Calendar,
  User,
  Hash,
} from 'lucide-react';

interface PublicRegisterPageProps {
  slug: string;
}

export const PublicRegisterPage: React.FC<PublicRegisterPageProps> = ({ slug }) => {
  const toast = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Result state (when already registered or just registered)
  const [resultCert, setResultCert] = useState<Certificate | null>(null);
  const [isExisting, setIsExisting] = useState<boolean>(false);
  const [isEditingData, setIsEditingData] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .getEventBySlug(slug)
      .then((evt) => {
        setEvent(evt);
        try {
          const fields: FormField[] = JSON.parse(evt.form_fields_json || '[]');
          setFormFields(fields);
          const initial: Record<string, string> = {};
          fields.forEach((f) => {
            initial[f.key] = '';
          });
          setFormData(initial);
        } catch (e) {
          setFormFields([]);
        }
      })
      .catch((err) => {
        toast.error('Evento no encontrado o enlace inactivo');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    // Validate required fields
    for (const f of formFields) {
      if (f.required && !formData[f.key]?.trim()) {
        toast.error(`El campo "${f.label}" es obligatorio`);
        return;
      }
    }

    const uniqueKey = event.unique_field_name || 'documento';
    const recipientIdentifier = formData[uniqueKey] || formData.documento || formData.email || '';
    const recipientName = formData.nombre_completo || formData.nombre || 'Participante';
    const recipientEmail = formData.email || formData.correo || '';

    setSubmitting(true);
    try {
      const res = await api.publicRegister({
        event_id: event.id,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        recipient_identifier: recipientIdentifier,
        custom_fields: { ...formData },
      });

      setResultCert(res.certificate);
      setIsExisting(res.isExisting);
      setEditName(res.certificate.recipient_name);

      if (!res.isExisting) {
        // Trigger celebratory confetti on fresh certificate!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        toast.success(res.message);
      } else {
        toast.info(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateData = async () => {
    if (!resultCert || !editName.trim()) return;
    try {
      const res = await api.updateCertificateData(resultCert.id, {
        recipient_name: editName,
      });
      setResultCert(res.certificate);
      setIsEditingData(false);
      toast.success('Datos actualizados y PDF regenerado con el mismo ID');
    } catch (err: any) {
      toast.error('Error al actualizar datos');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-slate-400">Cargando formulario de registro...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Evento No Encontrado</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          El enlace al que intentas acceder no existe o fue deshabilitado.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl z-10 space-y-6 animate-in fade-in">
        {/* Header */}
        <div className="border-b border-slate-800/80 pb-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 mx-auto mb-3">
            <Award className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {event.name}
          </h1>
          {event.description && (
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        {/* ALREADY REGISTERED OR NEWLY ISSUED CERTIFICATE VIEW */}
        {resultCert ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
                isExisting
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {isExisting ? 'Registro Previo Detectado' : '¡Felicitaciones! Certificado Emitido'}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isExisting
                    ? 'Ya cuentas con un certificado registrado para este evento. Puedes descargarlo o corregir tus datos a continuación conservando el mismo ID y QR.'
                    : 'Tu certificado ha sido generado y almacenado exitosamente.'}
                </p>
              </div>
            </div>

            {/* Certificate Details Card */}
            <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> ID Único Permanente:
                </span>
                <span className="font-mono font-bold text-indigo-400 text-sm">
                  {resultCert.id}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Participante:
                </span>
                {isEditingData ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-semibold"
                    />
                    <button
                      onClick={handleUpdateData}
                      className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                      title="Guardar nombre"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">
                      {resultCert.recipient_name}
                    </span>
                    <button
                      onClick={() => setIsEditingData(true)}
                      className="text-slate-500 hover:text-white transition-colors"
                      title="Modificar nombre impreso"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500">Documento / ID:</span>
                <span className="font-mono text-slate-300 font-medium">
                  {resultCert.recipient_identifier}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Fecha:
                </span>
                <span className="text-slate-300 font-medium">{resultCert.issue_date}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <a
                href={`/api/certificates/download/${resultCert.id}`}
                download
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                <Download className="w-4 h-4" />
                Descargar Certificado PDF
              </a>
              <a
                href={`/verify/${resultCert.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Verificación Pública QR
              </a>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            {formFields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {field.label} {field.required && <span className="text-indigo-400">*</span>}
                </label>
                <input
                  type={field.type || 'text'}
                  required={field.required}
                  value={formData[field.key] || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.key]: e.target.value })
                  }
                  placeholder={field.placeholder || `Ingresa tu ${field.label.toLowerCase()}`}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            ))}

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Award className="w-4 h-4" />
                <span>
                  {submitting ? 'Emitiendo Certificado Oficial...' : 'Obtener mi Certificado'}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              El certificado se emitirá con un ID único permanente e incluirá un código QR para verificación digital.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
