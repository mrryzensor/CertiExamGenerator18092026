import React, { useState, useEffect } from 'react';
import { Certificate, Template, EventItem } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { BatchImportModal } from '../components/certificates/BatchImportModal';
import {
  Award,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  AlertOctagon,
  Eye,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export const IssuedCertificatesPage: React.FC = () => {
  const toast = useToast();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState<boolean>(false);
  const [certToEdit, setCertToEdit] = useState<Certificate | null>(null);
  const [certToRevoke, setCertToRevoke] = useState<Certificate | null>(null);
  const [revocationReason, setRevocationReason] = useState<string>('');
  const [certToDelete, setCertToDelete] = useState<Certificate | null>(null);

  // Single issue form state
  const [singleForm, setSingleForm] = useState({
    template_id: '',
    event_id: '',
    recipient_name: '',
    recipient_email: '',
    recipient_identifier: '',
    custom_field_curso: '',
    custom_field_institucion: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [certs, tmpls, evts] = await Promise.all([
        api.getCertificates({
          search: search || undefined,
          event_id: selectedEventId || undefined,
          status: selectedStatus || undefined,
        }),
        api.getTemplates(),
        api.getEvents(),
      ]);
      setCertificates(certs);
      setTemplates(tmpls);
      setEvents(evts);
      if (tmpls.length > 0 && !singleForm.template_id) {
        setSingleForm((prev) => ({ ...prev, template_id: tmpls[0].id }));
      }
    } catch (err: any) {
      toast.error('Error al cargar la lista de certificados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Create single certificate
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.template_id || !singleForm.recipient_name || !singleForm.recipient_identifier) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    try {
      const custom_fields: Record<string, any> = {};
      if (singleForm.custom_field_curso) custom_fields.curso = singleForm.custom_field_curso;
      if (singleForm.custom_field_institucion)
        custom_fields.institucion = singleForm.custom_field_institucion;

      await api.createCertificate({
        template_id: singleForm.template_id,
        event_id: singleForm.event_id || undefined,
        recipient_name: singleForm.recipient_name,
        recipient_email: singleForm.recipient_email,
        recipient_identifier: singleForm.recipient_identifier,
        custom_fields,
      });

      toast.success('Certificado emitido exitosamente con ID único');
      setIsSingleModalOpen(false);
      setSingleForm({
        template_id: templates[0]?.id || '',
        event_id: '',
        recipient_name: '',
        recipient_email: '',
        recipient_identifier: '',
        custom_field_curso: '',
        custom_field_institucion: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error al emitir certificado');
    }
  };

  // Update participant data
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certToEdit) return;

    try {
      let customFields = {};
      try {
        customFields = JSON.parse(certToEdit.custom_fields_json || '{}');
      } catch (err) {}

      await api.updateCertificateData(certToEdit.id, {
        recipient_name: certToEdit.recipient_name,
        recipient_email: certToEdit.recipient_email,
        custom_fields: customFields,
      });

      toast.success('Datos actualizados y PDF regenerado en disco');
      setCertToEdit(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar certificado');
    }
  };

  // Revoke or reactivate
  const handleConfirmRevoke = async () => {
    if (!certToRevoke) return;
    const isCurrentlyValid = certToRevoke.status === 'valid';
    const newStatus = isCurrentlyValid ? 'revoked' : 'valid';

    try {
      await api.toggleCertificateStatus(
        certToRevoke.id,
        newStatus,
        isCurrentlyValid ? revocationReason : undefined
      );
      toast.success(
        newStatus === 'revoked'
          ? 'Certificado revocado exitosamente'
          : 'Certificado reactivado exitosamente'
      );
      setCertToRevoke(null);
      setRevocationReason('');
      loadData();
    } catch (err: any) {
      toast.error('Error al cambiar el estado del certificado');
    }
  };

  // Delete certificate
  const handleConfirmDelete = async () => {
    if (!certToDelete) return;
    try {
      await api.deleteCertificate(certToDelete.id);
      toast.success('Certificado y archivo físico eliminados');
      setCertToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar certificado');
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 select-none">
      {/* Page Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Certificados Emitidos
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Administra, verifica, edita datos, revoca y exporta certificados a Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export to Excel */}
          <a
            href={`/api/certificates/export/excel${
              selectedEventId ? `?event_id=${selectedEventId}` : ''
            }`}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Excel</span>
          </a>

          {/* Batch Import */}
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Emisión Masiva (Excel / Pegar)</span>
          </button>

          {/* Single Issue */}
          <button
            onClick={() => setIsSingleModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Emitir Certificado</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, documento, correo o ID único..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Event Filter */}
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="flex-1 md:w-48 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todos los Eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todos los Estados</option>
            <option value="valid">Válidos</option>
            <option value="revoked">Revocados</option>
          </select>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">ID Único</th>
                <th className="px-4 py-3.5">Participante</th>
                <th className="px-4 py-3.5">Documento / ID</th>
                <th className="px-4 py-3.5 hidden md:table-cell">Evento / Plantilla</th>
                <th className="px-4 py-3.5 hidden lg:table-cell">Campos Adicionales</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Cargando certificados emitidos...
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Award className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No se encontraron certificados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                certificates.map((cert) => {
                  let customFields: Record<string, any> = {};
                  try {
                    customFields = JSON.parse(cert.custom_fields_json || '{}');
                  } catch (e) {}

                  const isValid = cert.status === 'valid';

                  return (
                    <tr key={cert.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Unique Permanent ID */}
                      <td className="px-4 py-3 font-mono text-[11px] font-semibold text-indigo-300">
                        {cert.id}
                      </td>

                      {/* Recipient info */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{cert.recipient_name}</div>
                        {cert.recipient_email && (
                          <div className="text-[11px] text-slate-500">{cert.recipient_email}</div>
                        )}
                      </td>

                      {/* Document / Identifier */}
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {cert.recipient_identifier}
                      </td>

                      {/* Event / Template */}
                      <td className="px-4 py-3 hidden md:table-cell text-slate-400">
                        <div className="truncate max-w-[180px]">
                          {cert.event_name || cert.template_name || 'Plantilla Estándar'}
                        </div>
                        <div className="text-[10px] text-slate-500">{cert.issue_date}</div>
                      </td>

                      {/* Custom fields configured */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {Object.entries(customFields).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono"
                            >
                              {k}: {String(v)}
                            </span>
                          ))}
                          {Object.keys(customFields).length === 0 && (
                            <span className="text-[11px] text-slate-600">-</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            Válido
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            title={cert.revocation_reason || 'Certificado Revocado'}
                          >
                            <ShieldAlert className="w-3 h-3" />
                            Revocado
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Public verification view */}
                          <a
                            href={`/verify/${cert.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Verificar en página pública QR"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {/* Download PDF */}
                          <a
                            href={`/api/certificates/download/${cert.id}`}
                            download
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                            title="Descargar PDF Físico"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          {/* Edit data */}
                          <button
                            onClick={() => setCertToEdit(cert)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Editar datos del participante"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Toggle Revoke */}
                          <button
                            onClick={() => setCertToRevoke(cert)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isValid
                                ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-950/30'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30'
                            }`}
                            title={isValid ? 'Revocar certificado' : 'Reactivar certificado'}
                          >
                            <AlertOctagon className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setCertToDelete(cert)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                            title="Eliminar certificado"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Import Modal */}
      <BatchImportModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        templates={templates}
        events={events}
        onSuccess={loadData}
      />

      {/* Single Issue Modal */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Emitir Certificado Individual"
        description="Genera un certificado con ID único e impredecible y guarda el archivo PDF físico en disco."
        maxWidth="md"
      >
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Plantilla de Certificado *
            </label>
            <select
              required
              value={singleForm.template_id}
              onChange={(e) => setSingleForm({ ...singleForm, template_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.page_size} - {t.orientation})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre Completo del Participante *
            </label>
            <input
              type="text"
              required
              value={singleForm.recipient_name}
              onChange={(e) => setSingleForm({ ...singleForm, recipient_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              placeholder="ej. Dra. Elena Rostova"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Documento / DNI / ID *
              </label>
              <input
                type="text"
                required
                value={singleForm.recipient_identifier}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, recipient_identifier: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                placeholder="ej. 70984512"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={singleForm.recipient_email}
                onChange={(e) => setSingleForm({ ...singleForm, recipient_email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="elena@ejemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Curso / Taller (Opcional)
              </label>
              <input
                type="text"
                value={singleForm.custom_field_curso}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, custom_field_curso: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                placeholder="ej. Inteligencia Artificial"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Institución (Opcional)
              </label>
              <input
                type="text"
                value={singleForm.custom_field_institucion}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, custom_field_institucion: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                placeholder="ej. Tech University"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsSingleModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-950"
            >
              Generar Certificado
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Certificate Modal */}
      {certToEdit && (
        <Modal
          isOpen={!!certToEdit}
          onClose={() => setCertToEdit(null)}
          title={`Editar Datos del Certificado (${certToEdit.id})`}
          description="Al modificar los datos, el PDF se regenerará físicamente en disco conservando el mismo ID único y código QR."
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={certToEdit.recipient_name}
                onChange={(e) =>
                  setCertToEdit({ ...certToEdit, recipient_name: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={certToEdit.recipient_email || ''}
                onChange={(e) =>
                  setCertToEdit({ ...certToEdit, recipient_email: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setCertToEdit(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-950"
              >
                Guardar y Regenerar PDF
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Revoke / Reactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!certToRevoke}
        onClose={() => {
          setCertToRevoke(null);
          setRevocationReason('');
        }}
        onConfirm={handleConfirmRevoke}
        title={
          certToRevoke?.status === 'valid'
            ? '¿Revocar Certificado Oficial?'
            : '¿Reactivar Certificado?'
        }
        message={
          certToRevoke?.status === 'valid'
            ? `El certificado "${certToRevoke?.id}" será marcado como no válido en la página pública de verificación QR.`
            : `El certificado "${certToRevoke?.id}" volverá a mostrarse como auténtico y válido.`
        }
        confirmText={certToRevoke?.status === 'valid' ? 'Revocar' : 'Reactivar'}
        variant={certToRevoke?.status === 'valid' ? 'danger' : 'primary'}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!certToDelete}
        onClose={() => setCertToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar Certificado Permanentemente?"
        message={`Esta acción eliminará el certificado ${certToDelete?.id} y su archivo físico en disco.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};
