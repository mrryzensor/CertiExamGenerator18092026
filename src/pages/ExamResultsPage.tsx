import React, { useState, useEffect } from 'react';
import { Exam, ExamAttempt } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import {
  BarChart3,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Award,
  Eye,
  Calendar,
  User,
  Hash,
} from 'lucide-react';

interface ExamResultsPageProps {
  examId?: string | null;
  onNavigate: (tab: string, param?: string) => void;
}

export const ExamResultsPage: React.FC<ExamResultsPageProps> = ({ examId, onNavigate }) => {
  const toast = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(examId || '');
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);

  useEffect(() => {
    api.getExams().then((data) => {
      setExams(data);
      if (!selectedExamId && data.length > 0) {
        setSelectedExamId(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;
    setIsLoading(true);
    api
      .getExamResults(selectedExamId)
      .then(setAttempts)
      .catch(() => toast.error('Error al cargar resultados'))
      .finally(() => setIsLoading(false));
  }, [selectedExamId]);

  const currentExam = exams.find((e) => e.id === selectedExamId);

  // Statistics
  const totalAttempts = attempts.length;
  const passedCount = attempts.filter((a) => a.passed === 1).length;
  const passRate = totalAttempts > 0 ? ((passedCount / totalAttempts) * 100).toFixed(1) : '0';
  const averageScore =
    totalAttempts > 0
      ? (attempts.reduce((acc, a) => acc + a.percentage, 0) / totalAttempts).toFixed(1)
      : '0';

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Resultados y Calificaciones de Exámenes
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Supervisa intentos de alumnos, notas obtenidas y certificados generados automáticamente
          </p>
        </div>

        {selectedExamId && (
          <a
            href={`/api/exams/${selectedExamId}/results/excel`}
            download
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-md transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Resultados a Excel</span>
          </a>
        )}
      </div>

      {/* Exam Selector */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-400 shrink-0">Seleccionar Examen:</span>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
        >
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} ({e.id})
            </option>
          ))}
        </select>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">Total de Evaluaciones</span>
          <div className="text-2xl font-bold font-mono text-white">{totalAttempts}</div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">Aprobados</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">{passedCount}</div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">Tasa de Aprobación</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">{passRate}%</div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-500 font-medium">Promedio General</span>
          <div className="text-2xl font-bold font-mono text-slate-200">{averageScore}%</div>
        </div>
      </div>

      {/* Attempts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Alumno</th>
                <th className="px-4 py-3.5">Documento / ID</th>
                <th className="px-4 py-3.5">Intento #</th>
                <th className="px-4 py-3.5">Puntuación</th>
                <th className="px-4 py-3.5">Porcentaje</th>
                <th className="px-4 py-3.5">Resultado</th>
                <th className="px-4 py-3.5">Certificado</th>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Cargando intentos de examen...
                  </td>
                </tr>
              ) : attempts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No hay intentos registrados para este examen aún.
                  </td>
                </tr>
              ) : (
                attempts.map((att) => {
                  const isPassed = att.passed === 1;
                  return (
                    <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">
                        {att.student_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {att.student_identifier}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        #{att.attempt_number}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {att.score} / {att.max_score} pts
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        <span className={isPassed ? 'text-emerald-400' : 'text-rose-400'}>
                          {att.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isPassed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Aprobado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            Reprobado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {att.issued_cert_id || att.certificate_id ? (
                          <a
                            href={`/verify/${att.issued_cert_id || att.certificate_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            <Award className="w-3.5 h-3.5" />
                            {att.issued_cert_id || att.certificate_id}
                          </a>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        {new Date(att.completed_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedAttempt(att)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Ver respuestas del alumno"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to view student answers JSON breakdown */}
      {selectedAttempt && (
        <Modal
          isOpen={!!selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
          title={`Respuestas de ${selectedAttempt.student_name} (Intento #${selectedAttempt.attempt_number})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div>
                <span className="text-slate-500">Puntaje Obtenido:</span>{' '}
                <span className="font-bold font-mono text-white">
                  {selectedAttempt.score} / {selectedAttempt.max_score} ({selectedAttempt.percentage}%)
                </span>
              </div>
              <div>
                <span className="text-slate-500">Fecha de Entrega:</span>{' '}
                <span className="text-slate-300">
                  {new Date(selectedAttempt.completed_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">
                Detalle de Respuestas Marcadas:
              </span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto max-h-60">
                {JSON.stringify(JSON.parse(selectedAttempt.answers_json || '{}'), null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
