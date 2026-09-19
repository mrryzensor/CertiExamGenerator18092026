import React, { useState, useEffect } from 'react';
import { Exam } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  BookOpenCheck,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Download,
  BarChart3,
  Clock,
  Sparkles,
  CheckCircle2,
  Award,
  Share2,
} from 'lucide-react';

interface ExamsListPageProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const ExamsListPage: React.FC<ExamsListPageProps> = ({ onNavigate }) => {
  const toast = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  const loadExams = async () => {
    setIsLoading(true);
    try {
      const data = await api.getExams();
      setExams(data);
    } catch (err: any) {
      toast.error('Error al cargar la lista de exámenes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleDelete = async () => {
    if (!examToDelete) return;
    try {
      await api.deleteExam(examToDelete.id);
      toast.success('Examen eliminado');
      setExamToDelete(null);
      loadExams();
    } catch (err: any) {
      toast.error('Error al eliminar examen');
    }
  };

  const copyPublicLink = (id: string) => {
    const url = `${window.location.origin}/exam/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace público del examen copiado al portapapeles');
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Exámenes con Gemini AI
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Crea evaluaciones en línea con calificación automática, PDFs para alumnos y claves de respuestas
          </p>
        </div>

        <button
          onClick={() => onNavigate('exam_editor')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-violet-950 transition-all"
        >
          <Sparkles className="w-4 h-4 text-violet-200" />
          <span>Crear Nuevo Examen</span>
        </button>
      </div>

      {/* Grid of Exams */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-56 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-8">
          <BookOpenCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300 mb-1">
            No tienes exámenes creados todavía
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            Usa la inteligencia artificial de Google Gemini (modelos Flash-Lite) para generar evaluaciones pedagógicas completas en segundos.
          </p>
          <button
            onClick={() => onNavigate('exam_editor')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-950 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Crear Primer Examen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                    {item.id}
                  </span>
                  {item.duration_minutes > 0 ? (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      {item.duration_minutes} min
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">Sin límite</span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-white mb-1 leading-snug line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {item.description || item.topic || 'Sin descripción'}
                </p>

                <div className="space-y-1.5 py-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Preguntas:</span>
                    <span className="text-white font-semibold">{item.question_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Intentos Realizados:</span>
                    <span className="text-white font-semibold">{item.attempts_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nota Mínima:</span>
                    <span className="text-emerald-400 font-semibold">{item.passing_percentage}%</span>
                  </div>
                  {item.linked_template_name && (
                    <div className="flex justify-between text-amber-300">
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" /> Certificado:
                      </span>
                      <span className="truncate max-w-[140px]">{item.linked_template_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => copyPublicLink(item.id)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition-colors"
                  title="Copiar enlace para que los alumnos rindan el examen"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Enlace Alumnos
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onNavigate('results', item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Ver analíticas e intentos de alumnos"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNavigate('exam_editor', item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Editar examen"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExamToDelete(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Eliminar examen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!examToDelete}
        onClose={() => setExamToDelete(null)}
        onConfirm={handleDelete}
        title="¿Eliminar Examen?"
        message={`Esta acción eliminará el examen "${examToDelete?.title}" y sus preguntas asociadas.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};
