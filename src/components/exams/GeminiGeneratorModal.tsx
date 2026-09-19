import React, { useState, useEffect } from 'react';
import {
  generateExamWithGemini,
  fetchAvailableGeminiModels,
  getStoredApiKeys,
  getSelectedModel,
  saveSelectedModel,
  RECOMMENDED_FALLBACK_MODELS,
} from '../../services/geminiService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import {
  Sparkles,
  BookOpen,
  FileText,
  HelpCircle,
  Cpu,
  Key,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface GeminiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsGenerated: (questions: any[], examMeta?: { title?: string; description?: string }) => void;
  onOpenSettings: () => void;
}

export const GeminiGeneratorModal: React.FC<GeminiGeneratorModalProps> = ({
  isOpen,
  onClose,
  onQuestionsGenerated,
  onOpenSettings,
}) => {
  const toast = useToast();

  const [mode, setMode] = useState<'topic' | 'instructions' | 'content'>('topic');
  const [topic, setTopic] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [pastedContent, setPastedContent] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'básico' | 'intermedio' | 'avanzado'>('intermedio');

  // Question Types selection
  const [selectedTypes, setSelectedTypes] = useState<
    ('multiple_choice' | 'true_false' | 'fill_blank' | 'matching' | 'short_answer')[]
  >(['multiple_choice', 'true_false', 'fill_blank']);

  // Models state
  const [availableModels, setAvailableModels] = useState<string[]>(RECOMMENDED_FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>(getSelectedModel());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const keys = getStoredApiKeys();
  const hasKeys = keys.length > 0;

  useEffect(() => {
    if (isOpen && hasKeys) {
      fetchAvailableGeminiModels().then((models) => {
        setAvailableModels(models);
        if (!models.includes(selectedModel) && models.length > 0) {
          setSelectedModel(models[0]);
        }
      });
    }
  }, [isOpen, hasKeys]);

  const toggleType = (type: any) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length === 1) {
        toast.warning('Debes mantener al menos un tipo de pregunta activo');
        return;
      }
      setSelectedTypes((prev) => prev.filter((t) => t !== type));
    } else {
      setSelectedTypes((prev) => [...prev, type]);
    }
  };

  const handleGenerate = async () => {
    if (!hasKeys) {
      toast.error('Por favor ingresa al menos una API Key de Gemini en Configuración');
      onOpenSettings();
      return;
    }

    if (mode === 'topic' && !topic.trim()) {
      toast.error('Ingresa el tema del examen');
      return;
    }

    if (mode === 'instructions' && !instructions.trim()) {
      toast.error('Ingresa las instrucciones u objetivos del examen');
      return;
    }

    if (mode === 'content' && !pastedContent.trim()) {
      toast.error('Pega el texto o contenido de estudio a evaluar');
      return;
    }

    setIsGenerating(true);
    saveSelectedModel(selectedModel);

    try {
      toast.info(`Generando preguntas con ${selectedModel}...`);

      const res = await generateExamWithGemini({
        topic: mode === 'topic' ? topic : undefined,
        instructions: mode === 'instructions' ? instructions : undefined,
        pastedContent: mode === 'content' ? pastedContent : undefined,
        questionCount,
        difficulty,
        questionTypes: selectedTypes,
        preferredModel: selectedModel,
      });

      toast.success(
        `¡${res.questions.length} preguntas generadas exitosamente con ${res.usedKeyLabel}!`
      );
      onQuestionsGenerated(res.questions);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al comunicarse con Gemini');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generador de Exámenes con Google Gemini"
      description="Crea evaluaciones completas a partir de temas, instrucciones o textos pegados con failover automático de API Keys."
      maxWidth="2xl"
    >
      <div className="space-y-6 select-none">
        {/* API Key Status Bar */}
        {!hasKeys ? (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span>No tienes ninguna API Key de Gemini configurada localmente.</span>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
            >
              Configurar Keys
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{keys.length} API Keys listas (Failover Activo)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m} {m.includes('flash-lite') ? '(Flash-Lite Recomendado)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Generation Mode Selector */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'topic', label: 'Por Tema', icon: BookOpen },
            { id: 'instructions', label: 'Por Instrucciones', icon: HelpCircle },
            { id: 'content', label: 'Por Contenido Pegado', icon: FileText },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id as any)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-950'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mode Input Content */}
        {mode === 'topic' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tema o Materia del Examen
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="ej. Fundamentos de Redes TCP/IP y Modelo OSI"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {mode === 'instructions' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Instrucciones y Objetivos de Aprendizaje
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="ej. Evaluar la capacidad del alumno para configurar cortafuegos, detectar ataques de inyección SQL y comprender criptografía asimétrica."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {mode === 'content' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pega aquí el contenido, syllabus o apuntes de estudio
            </label>
            <textarea
              rows={4}
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              placeholder="Pega el texto a partir del cual la IA formulará las preguntas, opciones y claves pedagógicas..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Parameters: Count & Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span>Cantidad de Preguntas:</span>
              <span className="font-mono font-bold text-violet-400">{questionCount}</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nivel de Dificultad
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="básico">Básico</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </div>
        </div>

        {/* Question Types checkboxes */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Tipos de Preguntas a Incluir
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'multiple_choice', label: 'Opción Múltiple' },
              { id: 'true_false', label: 'Verdadero / Falso' },
              { id: 'fill_blank', label: 'Completar Espacio' },
              { id: 'matching', label: 'Relacionar Términos' },
              { id: 'short_answer', label: 'Respuesta Corta' },
            ].map((t) => {
              const checked = selectedTypes.includes(t.id as any);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleType(t.id)}
                  className={`p-2 rounded-xl text-left border text-xs font-medium transition-all ${
                    checked
                      ? 'bg-violet-600/20 border-violet-500/40 text-violet-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-950 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-violet-200" />
            <span>{isGenerating ? 'Generando con Gemini...' : 'Generar Examen con IA'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
