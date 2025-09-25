export interface SubtitleEntry {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

export interface SyncPoint {
  original: string;
  target: string;
}

export interface SyncMetadata {
  filename: string;
  videoLength: string;
  subtitleLength: string;
  syncPoints: SyncPoint[];
  metadata: {
    compressionRatio: number;
    driftPattern: string;
  };
}
