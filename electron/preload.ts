import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Video and audio processing
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  extractAudio: (videoPath: string) => ipcRenderer.invoke('extract-audio', videoPath),
  readAudioFile: (filePath: string) => ipcRenderer.invoke('read-audio-file', filePath),

  // File operations
  saveSrtFile: (content: string) => ipcRenderer.invoke('save-srt-file', content),
});
