const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Video and audio processing
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  extractAudio: (videoPath) => ipcRenderer.invoke('extract-audio', videoPath),
  readAudioFile: (filePath) => ipcRenderer.invoke('read-audio-file', filePath),

  // File operations
  saveSrtFile: (content) => ipcRenderer.invoke('save-srt-file', content),
  readSubtitleFile: (filePath) => ipcRenderer.invoke('read-subtitle-file', filePath),

  // Events
  onAudioExtractionProgress: (callback) => {
    // Remove any existing listeners to avoid duplicates
    ipcRenderer.removeAllListeners('audio-extraction-progress');
    // Add new listener
    ipcRenderer.on('audio-extraction-progress', (_event, progress) => {
      callback(progress);
    });
  },

  // Cleanup function to remove listeners
  removeAudioExtractionProgressListener: () => {
    ipcRenderer.removeAllListeners('audio-extraction-progress');
  },
});
