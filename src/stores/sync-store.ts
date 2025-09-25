import { writable } from 'svelte/store';
import type { SubtitleEntry, SyncPoint } from '../types/subtitle';

export const subtitles = writable<SubtitleEntry[]>([]);
export const syncPoints = writable<SyncPoint[]>([]);
export const audioWaveform = writable<null | any>(null); // Type will be refined when WaveSurfer is integrated
export const currentTime = writable(0);
