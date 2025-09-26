import { writable } from 'svelte/store';
import type { SyncPoint } from '../types/subtitle';
import type { SubtitleEntry } from '../lib/srt-parser';
import type {
  TranslationSettings,
  TranslationProgress,
  TranslatedSubtitleEntry,
} from '../types/translation';
import { DEFAULT_TRANSLATION_SETTINGS } from '../lib/translation-service';

export const subtitles = writable<SubtitleEntry[]>([]);
export const syncPoints = writable<SyncPoint[]>([]);
export const correctedSubtitles = writable<SubtitleEntry[]>([]);
export const audioWaveform = writable<null | any>(null); // Type will be refined when WaveSurfer is integrated
export const currentTime = writable(0);

// Translation stores
export const translationSettings = writable<TranslationSettings>(DEFAULT_TRANSLATION_SETTINGS);
export const translationProgress = writable<TranslationProgress>({
  current: 0,
  total: 0,
  percentage: 0,
  status: 'idle',
});
export const translatedSubtitles = writable<TranslatedSubtitleEntry[]>([]);
export const showTranslations = writable(false);
