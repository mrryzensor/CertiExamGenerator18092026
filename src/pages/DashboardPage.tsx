import React, { useState, useEffect } from 'react';
import { Certificate, Template, Exam, EventItem } from '../types';
import { api } from '../services/apiService';
import {
  Award,
  BookOpenCheck,
  FileBadge,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Download,
  ExternalLink,
  Plus,
  TrendingUp,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    templatesCount: 0,
    certificatesCount: 0,
    validCertificatesCount: 0,
    revokedCertificatesCount: 0,
    examsCount: 0,
  });

  const [recentCertificates, setRecentCertificates] = useState<Certificate[]>([]);
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([api.getTemplates(), api.getCertificates(), api.getExams()])
      .then(([templates, certificates, exams]) => {
        const validCount = certificates.filter((c) => c.status === 'valid').length;
        const revokedCount = certificates.filter((c) => c.status === 'revoked').length;

        setStats({
          templatesCount: templates.length,
          certificatesCount: certificates.length,
          validCertificatesCount: validCount,
          revokedCertificatesCount: revokedCount,
          examsCount: exams.length,
        });

        setRecentCertificates(certificates.slice(0, 5));
        setRecentExams(exams.slice(0, 4));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 select-none">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-violet-950/60 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            CertiExam PRO • Servidor en Puerto 3000
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Gestor Integral de Certificados y Exámenes con Gemini
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Diseña plantillas vectoriales en tamaños Carta, A4, Oficio o A3 con coordenadas relativas, emite masivamente desde Excel o pegado directo, califica exámenes automáticamente y emite certificados con verificación QR permanente.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('editor')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nuevo Certificado
            </button>
            <button
              onClick={() => onNavigate('exam_editor')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              Crear Examen con IA
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400">Plantillas Creadas</span>
            <div className="text-2xl font-bold font-mono text-white">
              {stats.templatesCount}
            </div>
            <span className="text-[10px] text-indigo-400">Carta, A4, Oficio, A3</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <FileBadge className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400">Certificados Emitidos</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {stats.certificatesCount}
            </div>
            <span className="text-[10px] text-slate-500">
              {stats.validCertificatesCount} válidos • {stats.revokedCertificatesCount} revocados
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400">Exámenes Generados</span>
            <div className="text-2xl font-bold font-mono text-violet-400">
              {stats.examsCount}
            </div>
            <span className="text-[10px] text-violet-400">Gemini Flash-Lite</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
            <BookOpenCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400">Almacenamiento Físico</span>
            <div className="text-sm font-bold font-mono text-white">DATA_DIR Activo</div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Cero BLOBs en SQLite
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tables Grid: Recent Certificates & Recent Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Issued Certificates */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                Últimos Certificados Emitidos
              </h3>
              <button
                onClick={() => onNavigate('certificates')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {recentCertificates.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Aún no has emitido certificados.
                </p>
              ) : (
                recentCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">
                        {cert.recipient_name}
                      </div>
                      <div className="font-mono text-[10px] text-indigo-300">
                        {cert.id} • {cert.recipient_identifier}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`/verify/${cert.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Verificación QR"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a
                        href={`/api/certificates/download/${cert.id}`}
                        download
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Exams */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-violet-400" />
                Exámenes Disponibles
              </h3>
              <button
                onClick={() => onNavigate('exams')}
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium"
              >
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {recentExams.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Aún no has creado exámenes con Gemini.
                </p>
              ) : (
                recentExams.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{ex.title}</div>
                      <div className="text-[10px] text-slate-500">
                        {ex.question_count || 0} preguntas • Aprobación: {ex.passing_percentage}%
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onNavigate('exam_editor', ex.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <a
                        href={`/exam/${ex.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                        title="Abrir examen online"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
