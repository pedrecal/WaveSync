export interface TranslationSettings {
  apiKey: string;
  targetLanguage: string;
  model: string;
  customPrompt?: string;
  batchSize: number;
  maxRetries: number;
}

export interface TranslationRequest {
  text: string[];
  sourceLanguage: string;
  targetLanguage: string;
  context?: string;
  customPrompt?: string;
}

export interface TranslationResponse {
  translations: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TranslationProgress {
  current: number;
  total: number;
  percentage: number;
  status: 'idle' | 'translating' | 'completed' | 'error';
  error?: string;
}

export interface TranslatedSubtitleEntry {
  id: number;
  startTime: string;
  endTime: string;
  originalText: string[];
  translatedText?: string[];
  isTranslated: boolean;
}

export type SupportedLanguage =
  | 'spanish'
  | 'es'
  | 'french'
  | 'fr'
  | 'german'
  | 'de'
  | 'italian'
  | 'it'
  | 'portuguese'
  | 'pt'
  | 'portuguese-br'
  | 'pt-br'
  | 'japanese'
  | 'ja'
  | 'korean'
  | 'ko'
  | 'chinese'
  | 'zh'
  | 'russian'
  | 'ru'
  | 'arabic'
  | 'ar'
  | 'hindi'
  | 'hi'
  | 'dutch'
  | 'nl'
  | 'swedish'
  | 'sv'
  | 'norwegian'
  | 'no'
  | 'danish'
  | 'da'
  | 'finnish'
  | 'fi';

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  spanish: 'Spanish',
  es: 'Spanish',
  french: 'French',
  fr: 'French',
  german: 'German',
  de: 'German',
  italian: 'Italian',
  it: 'Italian',
  portuguese: 'Portuguese (Portugal)',
  pt: 'Portuguese (Portugal)',
  'portuguese-br': 'Portuguese (Brazil)',
  'pt-br': 'Portuguese (Brazil)',
  japanese: 'Japanese',
  ja: 'Japanese',
  korean: 'Korean',
  ko: 'Korean',
  chinese: 'Chinese',
  zh: 'Chinese',
  russian: 'Russian',
  ru: 'Russian',
  arabic: 'Arabic',
  ar: 'Arabic',
  hindi: 'Hindi',
  hi: 'Hindi',
  dutch: 'Dutch',
  nl: 'Dutch',
  swedish: 'Swedish',
  sv: 'Swedish',
  norwegian: 'Norwegian',
  no: 'Norwegian',
  danish: 'Danish',
  da: 'Danish',
  finnish: 'Finnish',
  fi: 'Finnish',
};

export const GPT_MODELS = {
  'gpt-5-mini': 'GPT-5 Mini (Latest & Best)',
  'gpt-4o-mini': 'GPT-4o Mini (Fast & Cost-effective)',
  'gpt-4o': 'GPT-4o (Balanced)',
  'gpt-4-turbo': 'GPT-4 Turbo (High Quality)',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo (Fastest & Cheapest)',
} as const;

export type GPTModel = keyof typeof GPT_MODELS;
