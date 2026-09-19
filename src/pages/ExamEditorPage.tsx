import React, { useState, useEffect } from 'react';
import { Exam, Question, Template, QuestionType } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { optimizeImage } from '../utils/imageOptimizer';
import { GeminiGeneratorModal } from '../components/exams/GeminiGeneratorModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Sparkles,
  Save,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Download,
  Share2,
  ArrowLeft,
  Upload,
  CheckCircle2,
  Clock,
  Award,
  Calendar,
  HelpCircle,
} from 'lucide-react';

interface ExamEditorPageProps {
  examId?: string | null;
  onNavigate: (tab: string, param?: string) => void;
}

export const ExamEditorPage: React.FC<ExamEditorPageProps> = ({ examId, onNavigate }) => {
  const toast = useToast();

  const [exam, setExam] = useState<Partial<Exam>>({
    title: 'Nuevo Examen de Evaluación',
    description: 'Lee detenidamente cada pregunta antes de responder.',
    topic: '',
    duration_minutes: 30,
    max_attempts: 1,
    passing_percentage: 70,
    is_active: 1,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(() => {});

    if (examId) {
      api
        .getExam(examId)
        .then((data: any) => {
          setExam(data);
          if (Array.isArray(data.questions)) {
            const normalized = data.questions.map((q: any) => {
              let options = q.options;
              if (typeof q.options_json === 'string') {
                try { options = JSON.parse(q.options_json); } catch (e) {}
              }
              let correct = q.correct_answer;
              if (typeof q.correct_answer_json === 'string') {
                try { correct = JSON.parse(q.correct_answer_json); } catch (e) {}
              }
              return {
                ...q,
                options,
                correct_answer: correct,
              };
            });
            setQuestions(normalized);
          }
        })
        .catch(() => toast.error('Error al cargar examen'));
    }
  }, [examId]);

  // Handle Logo Upload with frontend WebP 95% optimization
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    try {
      toast.info('Optimizando logo a WebP 95%...');
      const optimized = await optimizeImage(e.target.files[0], {
        quality: 0.95,
        maxDimension: 1200,
      });
      const uploadRes = await api.uploadOptimizedImage(optimized.file, 'logo');
      setExam((prev) => ({ ...prev, logo_path: uploadRes.relativePath }));
      toast.success('Logo cargado y optimizado');
    } catch (err: any) {
      toast.error('Error al subir el logo del examen');
    }
  };

  // Add Question Manually
  const handleAddQuestion = (type: QuestionType = 'multiple_choice') => {
    const id = `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newQ: Question = {
      id,
      order_index: questions.length,
      type,
      prompt: 'Escribe aquí el enunciado de la pregunta...',
      points: 1,
      options:
        type === 'multiple_choice'
          ? ['Opción A', 'Opción B', 'Opción C', 'Opción D']
          : type === 'matching'
          ? [
              { left: 'Concepto 1', right: 'Definición 1' },
              { left: 'Concepto 2', right: 'Definición 2' },
            ]
          : [],
      correct_answer: type === 'multiple_choice' ? 'Opción A' : type === 'true_false' ? true : '',
      explanation: 'Justificación de la respuesta correcta.',
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  // Duplicate Question
  const handleDuplicateQuestion = (index: number) => {
    const q = questions[index];
    const copy: Question = {
      ...q,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      prompt: `${q.prompt} (Copia)`,
      order_index: questions.length,
    };
    setQuestions((prev) => [...prev, copy]);
    toast.info('Pregunta duplicada');
  };

  // Reorder Questions (Move Up / Down)
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const list = [...questions];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // Recalculate order indices
    list.forEach((item, idx) => {
      item.order_index = idx;
    });

    setQuestions(list);
  };

  // Update specific question
  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions((prev) => {
      const list = [...prev];
      list[index] = { ...list[index], ...updates };
      return list;
    });
  };

  // Save Exam
  const handleSave = async () => {
    if (!exam.title?.trim()) {
      toast.error('El examen debe tener un título');
      return;
    }

    if (questions.length === 0) {
      toast.warning('Agrega al menos una pregunta antes de guardar');
    }

    setIsSaving(true);
    try {
      const payload: Partial<Exam> = {
        ...exam,
        questions: questions.map((q, idx) => ({
          ...q,
          order_index: idx,
          options_json: JSON.stringify(q.options || []),
          correct_answer_json: JSON.stringify(q.correct_answer),
        })),
      };

      if (exam.id) {
        await api.updateExam(exam.id, payload);
        toast.success('Examen actualizado exitosamente');
      } else {
        const created = await api.createExam(payload);
        setExam(created);
        toast.success('Examen guardado exitosamente');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el examen');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('exams')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Volver a la lista de exámenes"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {exam.id ? 'Editar Examen' : 'Nuevo Examen'}
            </h2>
            <p className="text-xs text-slate-400">
              Configura preguntas, temporizador, intentos y emisión automática de certificados
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Gemini AI Generator */}
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-950 transition-all"
          >
            <Sparkles className="w-4 h-4 text-violet-200" />
            <span>Generar con Gemini IA</span>
          </button>

          {/* Download PDFs if saved */}
          {exam.id && (
            <>
              <a
                href={`/api/exams/${exam.id}/pdf/student`}
                download
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                title="Descargar versión limpia para imprimir al alumno"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">PDF Alumno</span>
              </a>

              <a
                href={`/api/exams/${exam.id}/pdf/teacher`}
                download
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                title="Descargar clave de respuestas y justificación pedagógica"
              >
                <Download className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Clave Docente</span>
              </a>
            </>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Título del Examen *
            </label>
            <input
              type="text"
              required
              value={exam.title || ''}
              onChange={(e) => setExam({ ...exam, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tema o Materia
            </label>
            <input
              type="text"
              value={exam.topic || ''}
              onChange={(e) => setExam({ ...exam, topic: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              placeholder="ej. Seguridad en Entornos Cloud"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Instrucciones para el Estudiante
          </label>
          <textarea
            rows={2}
            value={exam.description || ''}
            onChange={(e) => setExam({ ...exam, description: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Configuration Bar: Timer, Attempts, Passing Grade & Certificate Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Duración (Minutos)
            </label>
            <input
              type="number"
              min="0"
              value={exam.duration_minutes ?? 30}
              onChange={(e) =>
                setExam({ ...exam, duration_minutes: Number(e.target.value) })
              }
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
            />
            <span className="text-[10px] text-slate-500">0 = Sin límite de tiempo</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Máximo de Intentos
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={exam.max_attempts ?? 1}
              onChange={(e) => setExam({ ...exam, max_attempts: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
            />
            <span className="text-[10px] text-slate-500">0 = Intentos ilimitados</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Nota Mínima Aprobatoria (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={exam.passing_percentage ?? 70}
              onChange={(e) =>
                setExam({ ...exam, passing_percentage: Number(e.target.value) })
              }
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold text-emerald-400"
            />
            <span className="text-[10px] text-slate-500">Ejemplo: 70%</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Emisión Automática de Certificado
            </label>
            <select
              value={exam.linked_template_id || ''}
              onChange={(e) =>
                setExam({ ...exam, linked_template_id: e.target.value || undefined })
              }
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">No emitir certificado</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500">
              Se emite al aprobar con ≥ {exam.passing_percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Questions Section Header */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span>Preguntas del Examen ({questions.length})</span>
        </h3>

        {/* Add Question dropdown */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleAddQuestion('multiple_choice')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Opción Múltiple</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddQuestion('true_false')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>V / F</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddQuestion('fill_blank')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Completar</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddQuestion('matching')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-violet-400" />
            <span>Relacionar</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6">
            <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 mb-4">
              Este examen no tiene preguntas aún. Genera preguntas automáticamente con Gemini IA o agrégalas manualmente.
            </p>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-950 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Generar con Gemini IA
            </button>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3.5 shadow-lg relative group hover:border-slate-700 transition-all"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    {q.type === 'multiple_choice'
                      ? 'Opción Múltiple'
                      : q.type === 'true_false'
                      ? 'Verdadero / Falso'
                      : q.type === 'fill_blank'
                      ? 'Completar Espacio'
                      : q.type === 'matching'
                      ? 'Relacionar Términos'
                      : 'Respuesta Corta'}
                  </span>
                </div>

                {/* Points & Reordering & Actions */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-[10px] text-slate-500">Puntos:</span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={q.points}
                      onChange={(e) =>
                        handleUpdateQuestion(idx, { points: Number(e.target.value) })
                      }
                      className="w-10 bg-transparent text-xs font-mono text-white text-center focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveQuestion(idx, 'up')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    title="Mover arriba"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === questions.length - 1}
                    onClick={() => handleMoveQuestion(idx, 'down')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    title="Mover abajo"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateQuestion(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                    title="Duplicar pregunta"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400"
                    title="Eliminar pregunta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Prompt */}
              <div>
                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => handleUpdateQuestion(idx, { prompt: e.target.value })}
                  placeholder="Enunciado de la pregunta..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Question Options depending on type */}
              {q.type === 'multiple_choice' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Opciones y Respuesta Correcta (Marca la correcta con el círculo):
                  </span>
                  {(q.options || []).map((opt: string, optIdx: number) => {
                    const isCorrect = q.correct_answer === opt;
                    return (
                      <div key={optIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuestion(idx, { correct_answer: opt })
                          }
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                              : 'border-slate-600 hover:border-emerald-400'
                          }`}
                          title="Marcar como respuesta correcta"
                        >
                          {isCorrect && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(q.options || [])];
                            newOpts[optIdx] = e.target.value;
                            handleUpdateQuestion(idx, {
                              options: newOpts,
                              correct_answer: isCorrect ? e.target.value : q.correct_answer,
                            });
                          }}
                          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'true_false' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Respuesta Correcta:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQuestion(idx, { correct_answer: true })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      q.correct_answer === true || q.correct_answer === 'true'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Verdadero
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateQuestion(idx, { correct_answer: false })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      q.correct_answer === false || q.correct_answer === 'false'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Falso
                  </button>
                </div>
              )}

              {(q.type === 'fill_blank' || q.type === 'short_answer') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Palabra o Frase Exacta Correcta:
                  </label>
                  <input
                    type="text"
                    value={q.correct_answer || ''}
                    onChange={(e) =>
                      handleUpdateQuestion(idx, { correct_answer: e.target.value })
                    }
                    placeholder="ej. DNS"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                  Justificación / Explicación Pedagógica (Para la clave docente y retroalimentación)
                </label>
                <input
                  type="text"
                  value={q.explanation || ''}
                  onChange={(e) =>
                    handleUpdateQuestion(idx, { explanation: e.target.value })
                  }
                  placeholder="Por qué esta respuesta es la correcta..."
                  className="w-full px-3 py-1 bg-slate-950/60 border border-slate-800/80 rounded-lg text-[11px] text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Gemini AI Generator Modal */}
      <GeminiGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onQuestionsGenerated={(generated) => {
          const formatted = generated.map((g: any, i: number) => ({
            id: `q-${Date.now()}-${i}`,
            order_index: questions.length + i,
            type: g.type || 'multiple_choice',
            prompt: g.prompt || '',
            points: Number(g.points) || 1,
            options: g.options || [],
            correct_answer: g.correct_answer,
            explanation: g.explanation || '',
          }));
          setQuestions((prev) => [...prev, ...formatted]);
        }}
        onOpenSettings={() => onNavigate('settings')}
      />
    </div>
  );
};
