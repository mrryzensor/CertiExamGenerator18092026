import React, { useState, useEffect } from 'react';
import {
  getStoredApiKeys,
  saveStoredApiKeys,
  getSelectedModel,
  saveSelectedModel,
  fetchAvailableGeminiModels,
  RECOMMENDED_FALLBACK_MODELS,
} from '../services/geminiService';
import { GeminiKeyConfig } from '../types';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const toast = useToast();

  const [keys, setKeys] = useState<GeminiKeyConfig[]>([]);
  const [newKey, setNewKey] = useState<string>('');
  const [newKeyLabel, setNewKeyLabel] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(getSelectedModel());
  const [availableModels, setAvailableModels] = useState<string[]>(RECOMMENDED_FALLBACK_MODELS);
  const [isQueryingModels, setIsQueryingModels] = useState<boolean>(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  useEffect(() => {
    const loaded = getStoredApiKeys();
    setKeys(loaded);
    setSelectedModel(getSelectedModel());
  }, []);

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newKey.trim();
    if (!cleanKey) {
      toast.error('Ingresa una API Key válida');
      return;
    }

    // Check if key already exists
    if (keys.some((k) => k.key === cleanKey)) {
      toast.warning('Esta API Key ya está registrada');
      return;
    }

    const newEntry: GeminiKeyConfig = {
      id: `key-${Date.now()}`,
      key: cleanKey,
      label: newKeyLabel.trim() || `API Key #${keys.length + 1}`,
      status: 'untested',
    };

    const updated = [...keys, newEntry];
    setKeys(updated);
    saveStoredApiKeys(updated);
    setNewKey('');
    setNewKeyLabel('');
    toast.success('API Key guardada de forma segura en tu navegador');
  };

  const handleDeleteKey = () => {
    if (!keyToDelete) return;
    const updated = keys.filter((k) => k.id !== keyToDelete);
    setKeys(updated);
    saveStoredApiKeys(updated);
    setKeyToDelete(null);
    toast.info('API Key eliminada');
  };

  const handleTestKey = async (keyItem: GeminiKeyConfig) => {
    try {
      toast.info(`Probando conexión para "${keyItem.label}"...`);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${keyItem.key}`
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Clave inválida o sin permisos`);
      }
      const data = await res.json();
      const updated = keys.map((k) =>
        k.id === keyItem.id ? { ...k, status: 'active' as const } : k
      );
      setKeys(updated);
      saveStoredApiKeys(updated);
      toast.success(`API Key "${keyItem.label}" verificada y activa`);

      // Refresh available models
      handleRefreshModels();
    } catch (err: any) {
      const updated = keys.map((k) =>
        k.id === keyItem.id ? { ...k, status: 'invalid' as const } : k
      );
      setKeys(updated);
      saveStoredApiKeys(updated);
      toast.error(`Error en "${keyItem.label}": ${err.message}`);
    }
  };

  const handleRefreshModels = async () => {
    setIsQueryingModels(true);
    try {
      const models = await fetchAvailableGeminiModels();
      setAvailableModels(models);
      toast.success(`Se detectaron ${models.length} modelos compatibles con Google Gemini`);
    } catch (err: any) {
      toast.error('Error al consultar modelos en la API de Gemini');
    } finally {
      setIsQueryingModels(false);
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    saveSelectedModel(model);
    toast.success(`Modelo preferido actualizado a: ${model}`);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6 select-none">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Configuración y Google Gemini API
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Administración segura de API Keys en el almacenamiento local del navegador y failover automático
        </p>
      </div>

      {/* Security notice card */}
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-xs text-emerald-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-white">Privacidad y Seguridad Garantizada</h4>
          <p className="text-emerald-300/80 leading-relaxed text-[11px]">
            Tus API Keys se guardan <strong>exclusivamente en el almacenamiento local (localStorage) de tu navegador</strong>.
            Nunca se almacenan en la base de datos SQLite ni se transmiten a servidores de terceros que no sean los endpoints oficiales de Google Gemini.
          </p>
        </div>
      </div>

      {/* Model Selection Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-violet-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Modelo Preferido de Gemini</h3>
              <p className="text-[11px] text-slate-400">
                Se recomienda preferentemente la familia <strong>Flash-Lite</strong> para máxima velocidad y eficiencia
              </p>
            </div>
          </div>
          <button
            onClick={handleRefreshModels}
            disabled={isQueryingModels}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            title="Consultar modelos disponibles con las API Keys"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isQueryingModels ? 'animate-spin' : ''}`} />
            <span>Actualizar Modelos</span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableModels.map((m) => {
              const isLite = m.includes('flash-lite');
              const isSelected = selectedModel === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModelChange(m)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-violet-600/20 border-violet-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-semibold block text-slate-200 truncate">
                      {m}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {isLite ? 'Ultra rápido y económico (Flash-Lite)' : 'Estándar Google AI'}
                    </span>
                  </div>
                  {isLite && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Flash-Lite
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* API Keys Management */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                API Keys de Google Gemini ({keys.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Failover automático: si una clave se agota por cuota (429) o rate limit, se usa la siguiente de inmediato
              </p>
            </div>
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>Obtener API Key Gratis</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Add new key form */}
        <form onSubmit={handleAddKey} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-4">
            <input
              type="text"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Etiqueta (ej. Cuenta Personal)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="sm:col-span-6">
            <input
              type="password"
              required
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full h-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-md shadow-indigo-950 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar</span>
            </button>
          </div>
        </form>

        {/* List of keys */}
        <div className="space-y-2 pt-2">
          {keys.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No tienes ninguna API Key configurada. Agrega al menos una para habilitar la generación de exámenes con IA.
            </div>
          ) : (
            keys.map((k, index) => {
              const maskedKey = `${k.key.substring(0, 7)}...${k.key.substring(k.key.length - 4)}`;
              return (
                <div
                  key={k.id}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{k.label}</div>
                      <div className="font-mono text-[11px] text-slate-500">{maskedKey}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {k.status === 'active' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Activa
                      </span>
                    )}
                    {k.status === 'quota_exceeded' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <AlertCircle className="w-3 h-3" />
                        Cuota Agotada
                      </span>
                    )}
                    {k.status === 'invalid' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        <AlertCircle className="w-3 h-3" />
                        Inválida
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleTestKey(k)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                      title="Probar conexión con Gemini"
                    >
                      Probar
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyToDelete(k.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                      title="Eliminar API Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Key Dialog */}
      <ConfirmDialog
        isOpen={!!keyToDelete}
        onClose={() => setKeyToDelete(null)}
        onConfirm={handleDeleteKey}
        title="¿Eliminar API Key?"
        message="Esta clave se eliminará del almacenamiento de tu navegador."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};
