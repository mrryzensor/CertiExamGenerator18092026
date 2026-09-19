import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import {
  BookOpenCheck,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  Download,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface PublicExamTakePageProps {
  examId: string;
}

export const PublicExamTakePage: React.FC<PublicExamTakePageProps> = ({ examId }) => {
  const toast = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Student details
  const [studentName, setStudentName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [studentEmail, setStudentEmail] = useState<string>('');
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  // Answering state
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [startTime, setStartTime] = useState<string>('');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Exam Result
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    if (!examId) return;
    setLoading(true);
    api
      .getPublicExam(examId)
      .then((data) => {
        setExam(data.exam);
        setQuestions(data.questions || []);
      })
      .catch((err) => {
        setError(err.message || 'Error al cargar el examen');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [examId]);

  // Timer countdown
  useEffect(() => {
    if (!hasStarted || timeLeftSeconds === null || timeLeftSeconds <= 0 || result) return;

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Auto submit when time expires!
          toast.warning('¡El tiempo límite ha concluido! Enviando examen automáticamente...');
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, timeLeftSeconds, result]);

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentId.trim()) {
      toast.error('Por favor ingresa tu nombre y documento de identidad');
      return;
    }

    setStartTime(new Date().toISOString());
    if (exam.duration_minutes > 0) {
      setTimeLeftSeconds(exam.duration_minutes * 60);
    }
    setHasStarted(true);
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const submission = {
        student_name: studentName,
        student_identifier: studentId,
        student_email: studentEmail,
        answers,
        started_at: startTime || new Date().toISOString(),
      };

      const res = await api.submitPublicExam(examId, submission);
      setResult(res);

      if (res.passed) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
        toast.success(`¡Felicitaciones! Has aprobado con ${res.percentage}%`);
      } else {
        toast.info(`Has obtenido ${res.percentage}%. Nota mínima requerida: ${res.passing_percentage}%`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el examen');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-slate-400">Cargando examen oficial...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Examen No Disponible</h2>
        <p className="text-xs text-slate-400 max-w-sm">{error || 'El examen no existe o está inactivo.'}</p>
      </div>
    );
  }

  // Format timer MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 select-none relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Sticky Header with Timer */}
      {hasStarted && !result && (
        <div className="sticky top-2 z-30 max-w-3xl mx-auto w-full mb-4">
          <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl px-5 py-3 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-white truncate max-w-xs">{exam.title}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-mono">{studentName}</span>
            </div>

            {timeLeftSeconds !== null && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-xs font-bold border ${
                  timeLeftSeconds <= 120
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
                    : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(timeLeftSeconds)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* STEP 1: STUDENT REGISTRATION BEFORE START */}
        {!hasStarted ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center border-b border-slate-800 pb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/30">
                <BookOpenCheck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">{exam.title}</h1>
              {exam.description && (
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  {exam.description}
                </p>
              )}
            </div>

            {/* Exam Parameters info */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-center text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Preguntas</span>
                <span className="font-bold text-white">{questions.length}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Tiempo Límite</span>
                <span className="font-bold text-white">
                  {exam.duration_minutes > 0 ? `${exam.duration_minutes} min` : 'Sin límite'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Nota Aprobatoria</span>
                <span className="font-bold text-emerald-400">{exam.passing_percentage}%</span>
              </div>
            </div>

            <form onSubmit={handleStartExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo del Alumno *
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="ej. Daniel Silva Morales"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Documento de Identidad / DNI / ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="ej. 73491204"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="alumno@ejemplo.com"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <span>Comenzar Examen</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : !result ? (
          /* STEP 2: ANSWERING QUESTIONS */
          <div className="space-y-6">
            {questions.map((q, qIndex) => {
              const currentAns = answers[q.id];

              return (
                <div
                  key={q.id}
                  className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600/20 flex items-center justify-center text-[10px]">
                        {qIndex + 1}
                      </span>
                      Pregunta {qIndex + 1} de {questions.length}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {q.points} punto{q.points !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white leading-relaxed">{q.prompt}</h3>

                  {/* Multiple Choice Options */}
                  {q.type === 'multiple_choice' && Array.isArray(q.options) && (
                    <div className="space-y-2">
                      {q.options.map((opt: string, optIdx: number) => {
                        const isSelected = currentAns === opt;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, opt)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-xs text-left transition-all ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-indigo-400 bg-indigo-500 text-white'
                                  : 'border-slate-600'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False Options */}
                  {q.type === 'true_false' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q.id, true)}
                        className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                          currentAns === true
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Verdadero
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q.id, false)}
                        className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                          currentAns === false
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Falso
                      </button>
                    </div>
                  )}

                  {/* Fill in the blank / Short answer */}
                  {(q.type === 'fill_blank' || q.type === 'short_answer') && (
                    <div>
                      <input
                        type="text"
                        value={currentAns || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {/* Matching terms */}
                  {q.type === 'matching' && q.options?.leftItems && (
                    <div className="space-y-2">
                      <span className="text-[11px] text-slate-400">
                        Relaciona cada término con su definición correspondiente:
                      </span>
                      {q.options.leftItems.map((left: string, pIdx: number) => (
                        <div
                          key={pIdx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs"
                        >
                          <span className="font-semibold text-slate-300">{left}</span>
                          <select
                            value={currentAns?.[left] || ''}
                            onChange={(e) => {
                              const updated = { ...(currentAns || {}) };
                              updated[left] = e.target.value;
                              handleAnswerChange(q.id, updated);
                            }}
                            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Selecciona correspondencia...</option>
                            {q.options.rightItems.map((right: string, rIdx: number) => (
                              <option key={rIdx} value={right}>
                                {right}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Submit Bar */}
            <div className="sticky bottom-4 z-20 bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-4 rounded-2xl shadow-2xl flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {Object.keys(answers).length} de {questions.length} preguntas respondidas
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Calificando...' : 'Finalizar y Entregar Examen'}
              </button>
            </div>
          </div>
        ) : (
          /* STEP 3: RESULTS & AUTOMATIC CERTIFICATE VIEW */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in">
            {/* Score Banner */}
            <div
              className={`p-6 rounded-2xl border text-center space-y-2 ${
                result.passed
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-1">
                {result.passed ? (
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                ) : (
                  <XCircle className="w-12 h-12 text-rose-400" />
                )}
              </div>
              <h2 className="text-xl font-bold text-white">
                {result.passed ? '¡Examen Aprobado!' : 'Examen Reprobado'}
              </h2>
              <div className="text-3xl font-black font-mono tracking-tight">
                {result.percentage}%
              </div>
              <p className="text-xs text-slate-300">
                Puntaje obtenido: {result.score} de {result.max_score} puntos (Mínimo requerido:{' '}
                {result.passing_percentage}%)
              </p>
            </div>

            {/* Automatic Certificate Box if Passed and Issued */}
            {result.certificate && (
              <div className="p-5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Certificado Oficial Otorgado
                    </h4>
                    <p className="text-xs text-slate-200">
                      Al aprobar satisfactoriamente la evaluación, se ha emitido tu certificado oficial con ID único:{' '}
                      <span className="font-mono text-indigo-300 font-bold">
                        {result.certificate.id}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <a
                    href={`/api/certificates/download/${result.certificate.id}`}
                    download
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Certificado Oficial en PDF
                  </a>
                  <a
                    href={`/verify/${result.certificate.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Verificar QR
                  </a>
                </div>
              </div>
            )}

            {/* Questions Breakdown */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Desglose de Respuestas ({result.breakdown?.length || 0})
              </h4>
              <div className="space-y-2">
                {result.breakdown?.map((item: any, i: number) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      item.is_correct
                        ? 'bg-emerald-950/20 border-emerald-500/20'
                        : 'bg-rose-950/20 border-rose-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {i + 1}. {item.prompt}
                      </span>
                      <span
                        className={`font-bold font-mono text-[11px] ${
                          item.is_correct ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.points_earned} / {item.points_possible} pts
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Tu respuesta: <span className="text-slate-200 font-medium">{String(item.user_answer || '(Sin responder)')}</span>
                    </div>

                    {item.explanation && (
                      <p className="text-[10px] text-indigo-300 italic pt-1 border-t border-slate-800/60">
                        Explicación: {item.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
