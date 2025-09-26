interface ElectronAPI {
  // Video and audio processing
  selectVideoFile: () => Promise<{ cancelled: boolean; videoPath?: string }>;
  extractAudio: (videoPath: string) => Promise<{
    success: boolean;
    audioPath?: string;
    originalVideo?: string;
    srtPath?: string | null;
    error?: string;
  }>;
  readAudioFile: (filePath: string) => Promise<{
    success: boolean;
    buffer?: ArrayBuffer;
    error?: string;
  }>;

  // File operations
  saveSrtFile: (content: string) => Promise<{
    success?: boolean;
    filePath?: string;
    cancelled?: boolean;
    error?: string;
  }>;
  readSubtitleFile: (filePath: string) => Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }>;

  // Events
  onAudioExtractionProgress: (callback: (progress: number) => void) => void;
  removeAudioExtractionProgressListener: () => void;
}
interface Window {
  electronAPI: ElectronAPI;
}
