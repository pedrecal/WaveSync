import type {
  TranslationSettings,
  TranslationRequest,
  TranslationResponse,
  SupportedLanguage,
} from '../types/translation';

/**
 * OpenAI Translation Service
 * Optimized for speed with batch processing
 */
export class OpenAITranslationService {
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private settings: TranslationSettings;

  constructor(settings: TranslationSettings) {
    this.settings = settings;
  }

  /**
   * Update translation settings
   */
  updateSettings(newSettings: Partial<TranslationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Translate subtitles with batch processing for speed optimization
   */
  async translateSubtitles(
    subtitles: string[],
    targetLanguage: SupportedLanguage,
    onProgress?: (current: number, total: number) => void
  ): Promise<string[]> {
    console.log('TranslationService: translateSubtitles called with:', {
      subtitlesLength: subtitles.length,
      targetLanguage,
      batchSize: this.settings.batchSize,
    });

    const batchSize = this.settings.batchSize;
    const translations: string[] = [];

    // Process in batches for better speed
    for (let i = 0; i < subtitles.length; i += batchSize) {
      const batch = subtitles.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}, size: ${batch.length}`);

      const batchTranslations = await this.translateBatch(batch, targetLanguage);

      console.log(`Batch translations received:`, batchTranslations);
      translations.push(...batchTranslations);

      // Report progress
      if (onProgress) {
        onProgress(Math.min(i + batchSize, subtitles.length), subtitles.length);
      }
    }

    return translations;
  }

  /**
   * Translate a batch of subtitles
   */
  private async translateBatch(
    batch: string[],
    targetLanguage: SupportedLanguage
  ): Promise<string[]> {
    const prompt = this.buildTranslationPrompt(batch, targetLanguage);

    let attempt = 0;
    while (attempt < this.settings.maxRetries) {
      try {
        const response = await this.callOpenAI(prompt);
        return this.parseTranslationResponse(response, batch.length);
      } catch (error) {
        attempt++;
        if (attempt >= this.settings.maxRetries) {
          console.error('Translation failed after max retries:', error);
          // Return original text as fallback
          return batch;
        }
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return batch; // Fallback
  }

  /**
   * Build translation prompt
   */
  private buildTranslationPrompt(batch: string[], targetLanguage: SupportedLanguage): string {
    const basePrompt = `Translate the following subtitle lines to ${targetLanguage}. 
Return ONLY the translations, one per line, in the exact same order.
Preserve timing indicators, sound effects in brackets like [music], and speaker names.

${this.settings.customPrompt ? `Additional instructions: ${this.settings.customPrompt}\n` : ''}

Subtitle lines to translate:
${batch.map((line, i) => `${i + 1}. ${line}`).join('\n')}

Translations:`;

    return basePrompt;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<any> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a professional translator. Provide accurate, culturally appropriate translations while preserving the authentic voice and style of the original content.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Low temperature for consistency
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Parse OpenAI response and extract translations
   */
  private parseTranslationResponse(response: any, expectedCount: number): string[] {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No translation content received from OpenAI');
    }

    // Split by lines and clean up
    const lines = content
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .map((line: string) => {
        // Remove numbering if present (1. 2. etc.)
        return line.replace(/^\d+\.\s*/, '');
      });

    // Validate we got the expected number of translations
    if (lines.length !== expectedCount) {
      console.warn(`Expected ${expectedCount} translations, got ${lines.length}`);

      // Pad with empty strings if we got fewer
      while (lines.length < expectedCount) {
        lines.push('');
      }

      // Trim if we got more
      return lines.slice(0, expectedCount);
    }

    return lines;
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    // OpenAI API keys start with "sk-" followed by alphanumeric characters and some special chars
    // Length can vary, so we just check the prefix and reasonable length
    return /^sk-[a-zA-Z0-9_-]{20,}$/.test(apiKey.trim());
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testResponse = await this.callOpenAI(
        'Translate "Hello" to Spanish. Respond with only the translation.'
      );
      return testResponse.choices?.[0]?.message?.content?.trim().toLowerCase() === 'hola';
    } catch {
      return false;
    }
  }
}

/**
 * Default translation settings
 */
export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  apiKey: '',
  targetLanguage: 'portuguese-br',
  model: 'gpt-4o-mini',
  batchSize: 10, // Process 10 subtitles at once for optimal speed/cost balance
  maxRetries: 3,
  customPrompt: '',
};

/**
 * Settings persistence
 */
export class TranslationSettingsManager {
  private static readonly STORAGE_KEY = 'wavesync_translation_settings';

  static save(settings: TranslationSettings): void {
    // Don't store API key in localStorage for security
    const { apiKey, ...settingsToStore } = settings;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settingsToStore));
  }

  static load(): Partial<TranslationSettings> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
