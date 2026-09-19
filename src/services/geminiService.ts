import { GeminiKeyConfig } from '../types';

const STORAGE_KEYS_NAME = 'certiexam_gemini_keys';
const STORAGE_SELECTED_MODEL = 'certiexam_gemini_model';

export const RECOMMENDED_FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

// Helper to get stored API keys from localStorage
export function getStoredApiKeys(): GeminiKeyConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS_NAME);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading Gemini API keys:', e);
    return [];
  }
}

// Helper to save API keys to localStorage
export function saveStoredApiKeys(keys: GeminiKeyConfig[]) {
  localStorage.setItem(STORAGE_KEYS_NAME, JSON.stringify(keys));
}

// Helper to get selected model
export function getSelectedModel(): string {
  return localStorage.getItem(STORAGE_SELECTED_MODEL) || 'gemini-2.5-flash-lite';
}

// Helper to save selected model
export function saveSelectedModel(model: string) {
  localStorage.setItem(STORAGE_SELECTED_MODEL, model);
}

// Auto-failover executor for Gemini API calls
export async function callGeminiWithFailover<T>(
  apiFn: (apiKey: string, model: string) => Promise<T>,
  preferredModel?: string
): Promise<{ result: T; usedKeyLabel: string }> {
  const keys = getStoredApiKeys();
  if (!keys || keys.length === 0) {
    throw new Error(
      'No se ha configurado ninguna API Key de Google Gemini. Por favor agrégala en Configuración.'
    );
  }

  const model = preferredModel || getSelectedModel();
  const errors: string[] = [];

  // Try each key in sequence
  for (let i = 0; i < keys.length; i++) {
    const keyConfig = keys[i];
    if (keyConfig.status === 'invalid') continue;

    try {
      const result = await apiFn(keyConfig.key, model);

      // Key succeeded: update lastUsed
      keyConfig.lastUsed = new Date().toISOString();
      keyConfig.status = 'active';
      saveStoredApiKeys(keys);

      return { result, usedKeyLabel: keyConfig.label || `Key #${i + 1}` };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.warn(`Gemini Key "${keyConfig.label || i + 1}" failed:`, errorMsg);

      const isQuotaOrRateLimit =
        errorMsg.includes('429') ||
        errorMsg.toLowerCase().includes('quota') ||
        errorMsg.toLowerCase().includes('resource_exhausted') ||
        errorMsg.toLowerCase().includes('rate limit');

      if (isQuotaOrRateLimit) {
        keyConfig.status = 'quota_exceeded';
        errors.push(`Key "${keyConfig.label}": Cuota excedida / Rate limit (429)`);
      } else {
        errors.push(`Key "${keyConfig.label}": ${errorMsg}`);
      }
      saveStoredApiKeys(keys);
    }
  }

  throw new Error(
    `Todas las API Keys fallaron. Errores:\n- ${errors.join('\n- ')}`
  );
}

// Fetch available models from Gemini API using any valid key
export async function fetchAvailableGeminiModels(): Promise<string[]> {
  const keys = getStoredApiKeys();
  if (keys.length === 0) {
    return RECOMMENDED_FALLBACK_MODELS;
  }

  for (const keyConfig of keys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${keyConfig.key}`
      );
      if (!response.ok) continue;

      const data = await response.json();
      if (Array.isArray(data.models)) {
        const supported = data.models
          .filter((m: any) =>
            m.supportedGenerationMethods?.includes('generateContent')
          )
          .map((m: any) => m.name.replace('models/', ''));

        // Sort: flash-lite first, then flash, then others
        supported.sort((a: string, b: string) => {
          const aLite = a.includes('flash-lite');
          const bLite = b.includes('flash-lite');
          if (aLite && !bLite) return -1;
          if (!aLite && bLite) return 1;
          const aFlash = a.includes('flash');
          const bFlash = b.includes('flash');
          if (aFlash && !bFlash) return -1;
          if (!aFlash && bFlash) return 1;
          return a.localeCompare(b);
        });

        return supported.length > 0 ? supported : RECOMMENDED_FALLBACK_MODELS;
      }
    } catch (e) {
      console.warn('Error fetching models for key:', keyConfig.label, e);
    }
  }

  return RECOMMENDED_FALLBACK_MODELS;
}

export interface GenerateExamParams {
  topic?: string;
  instructions?: string;
  pastedContent?: string;
  questionCount: number;
  questionTypes: ('multiple_choice' | 'true_false' | 'fill_blank' | 'matching' | 'short_answer')[];
  difficulty?: 'básico' | 'intermedio' | 'avanzado';
  preferredModel?: string;
}

// Generate questions using Gemini with failover
export async function generateExamWithGemini(
  params: GenerateExamParams
): Promise<{ questions: any[]; usedKeyLabel: string }> {
  const promptText = `
Eres un pedagogo y docente experto en diseño de evaluaciones formativas y sumativas.
Genera un examen estructurado basado en los siguientes parámetros:

- Tema principal: ${params.topic || 'General'}
- Instrucciones / Objetivos: ${params.instructions || 'Evaluar comprensión conceptual y práctica.'}
- Nivel de dificultad: ${params.difficulty || 'intermedio'}
- Cantidad exacta de preguntas a generar: ${params.questionCount}
- Tipos de preguntas permitidos: ${params.questionTypes.join(', ')}
${params.pastedContent ? `\n--- CONTENIDO O FUENTE DE REFERENCIA ---\n${params.pastedContent}\n----------------------------------------\n` : ''}

DEBES responder EXCLUSIVAMENTE con un JSON válido (sin bloques de código markdown adicionales si es posible, o en un bloque \`\`\`json ... \`\`\`), con la siguiente estructura:

{
  "title": "Título sugerido para el examen",
  "description": "Descripción general e instrucciones para el alumno",
  "questions": [
    {
      "order_index": 0,
      "type": "multiple_choice | true_false | fill_blank | matching | short_answer",
      "prompt": "Texto claro de la pregunta",
      "points": 1,
      "options": [
        // Para multiple_choice: array de 4 strings con las alternativas
        // Para matching: array de objetos [{"left": "Término A", "right": "Definición 1"}, ...]
        // Para otros: null o array vacío
      ],
      "correct_answer": "Respuesta correcta (Para multiple_choice: el texto exacto de la opción correcta; para true_false: true o false; para fill_blank: palabra clave esperada; para matching: objeto { 'Término A': 'Definición 1', ... })",
      "explanation": "Breve justificación pedagógica de por qué esta es la respuesta correcta"
    }
  ]
}
`;

  const { result, usedKeyLabel } = await callGeminiWithFailover(
    async (apiKey, model) => {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `HTTP error ${res.status}: ${res.statusText}`
        );
      }

      const responseData = await res.json();
      const rawText =
        responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Clean markdown code blocks if any
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      return parsed;
    },
    params.preferredModel
  );

  return {
    questions: result.questions || [],
    usedKeyLabel,
  };
}
