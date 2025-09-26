"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Video and audio processing
    selectVideoFile: () => electron_1.ipcRenderer.invoke('select-video-file'),
    extractAudio: (videoPath) => electron_1.ipcRenderer.invoke('extract-audio', videoPath),
    readAudioFile: (filePath) => electron_1.ipcRenderer.invoke('read-audio-file', filePath),
    // File operations
    saveSrtFile: (content) => electron_1.ipcRenderer.invoke('save-srt-file', content),
});
//# sourceMappingURL=preload.js.map