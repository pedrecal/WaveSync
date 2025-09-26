import { writable } from 'svelte/store';
import type { SyncPoint } from '../types/subtitle';
import type { SubtitleEntry } from '../lib/srt-parser';
import type {
  TranslationSettings,
  TranslationProgress,
  TranslatedSubtitleEntry,
} from '../types/translation';
import { DEFAULT_TRANSLATION_SETTINGS } from '../lib/translation-service';

// Autosave keys for localStorage
const AUTOSAVE_SUBTITLES_KEY = 'wavesync_autosave_subtitles';
const AUTOSAVE_SYNC_POINTS_KEY = 'wavesync_autosave_sync_points';
const AUTOSAVE_CORRECTED_SUBTITLES_KEY = 'wavesync_autosave_corrected_subtitles';
const AUTOSAVE_METADATA_KEY = 'wavesync_autosave_metadata';

// Load initial data from localStorage if available
function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error(`Error loading data from localStorage (${key}):`, error);
  }
  return defaultValue;
}

// Create writable stores with persistence
function createPersistentStore<T>(key: string, initialValue: T) {
  const store = writable<T>(loadFromLocalStorage(key, initialValue));

  store.subscribe((value) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error saving to localStorage (${key}):`, error);
      }
    }
  });

  return store;
}

// Create stores with autosave functionality
export const subtitles = createPersistentStore<SubtitleEntry[]>(AUTOSAVE_SUBTITLES_KEY, []);
export const syncPoints = createPersistentStore<SyncPoint[]>(AUTOSAVE_SYNC_POINTS_KEY, []);
export const correctedSubtitles = createPersistentStore<SubtitleEntry[]>(
  AUTOSAVE_CORRECTED_SUBTITLES_KEY,
  []
);
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

// Create a metadata store to track the last autosave timestamp and file details
export const autosaveMetadata = createPersistentStore<{
  timestamp: number;
  audioFilename: string | null;
  srtFilename: string | null;
  syncPointsCount: number;
}>(AUTOSAVE_METADATA_KEY, {
  timestamp: 0,
  audioFilename: null,
  srtFilename: null,
  syncPointsCount: 0,
});

// Helper to clear all autosave data
export function clearAutosaveData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTOSAVE_SUBTITLES_KEY);
    localStorage.removeItem(AUTOSAVE_SYNC_POINTS_KEY);
    localStorage.removeItem(AUTOSAVE_CORRECTED_SUBTITLES_KEY);
    localStorage.removeItem(AUTOSAVE_METADATA_KEY);

    // Reset stores to empty values
    subtitles.set([]);
    syncPoints.set([]);
    correctedSubtitles.set([]);
    autosaveMetadata.set({
      timestamp: 0,
      audioFilename: null,
      srtFilename: null,
      syncPointsCount: 0,
    });
  }
}
