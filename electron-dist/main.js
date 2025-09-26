"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
// Set ffmpeg path (ffmpegStatic is string | null, but we know it exists)
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
// Cache directory for extracted audio files
const CACHE_DIR = path.join(os.tmpdir(), 'wavesync-cache');
// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}
// Keep a global reference of the window object to avoid garbage collection
let mainWindow = null;
function createWindow() {
    // Create the browser window
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    // Load the app
    if (electron_is_dev_1.default) {
        // Load from dev server in development
        mainWindow.loadURL('http://localhost:5173');
        // Open DevTools
        mainWindow.webContents.openDevTools();
    }
    else {
        // Load the index.html file in production
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// Create window when Electron is ready
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        // On macOS, recreate window when dock icon is clicked and no windows are open
        if (mainWindow === null)
            createWindow();
    });
});
// Quit when all windows are closed, except on macOS
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Handle video file selection and audio extraction
electron_1.ipcMain.handle('select-video-file', async () => {
    if (!mainWindow)
        return { cancelled: true };
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Video Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'] },
        ],
    });
    if (result.canceled || !result.filePaths.length) {
        return { cancelled: true };
    }
    const videoPath = result.filePaths[0];
    return { cancelled: false, videoPath };
});
// Handle audio extraction from video
electron_1.ipcMain.handle('extract-audio', async (_event, videoPath) => {
    try {
        // Generate a unique cache filename
        const filename = `audio-${Date.now()}.mp3`;
        const outputPath = path.join(CACHE_DIR, filename);
        // Return promise to extract audio
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(videoPath)
                .output(outputPath)
                .noVideo()
                .audioCodec('libmp3lame')
                .audioBitrate(128)
                .on('end', () => {
                resolve({
                    success: true,
                    audioPath: outputPath,
                    originalVideo: videoPath,
                });
            })
                .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject({
                    success: false,
                    error: `FFmpeg error: ${err.message}`,
                });
            })
                .run();
        });
    }
    catch (error) {
        console.error('Extraction error:', error);
        return {
            success: false,
            error: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
});
// Handle reading audio file
electron_1.ipcMain.handle('read-audio-file', async (_event, filePath) => {
    try {
        const buffer = await fs.promises.readFile(filePath);
        return {
            success: true,
            buffer: buffer.buffer,
        };
    }
    catch (error) {
        console.error('Error reading audio file:', error);
        return {
            success: false,
            error: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
});
// Handle saving corrected SRT file
electron_1.ipcMain.handle('save-srt-file', async (_event, content) => {
    if (!mainWindow)
        return { cancelled: true };
    const result = await electron_1.dialog.showSaveDialog(mainWindow, {
        filters: [{ name: 'Subtitle Files', extensions: ['srt'] }],
        defaultPath: 'corrected.srt',
    });
    if (result.canceled || !result.filePath) {
        return { cancelled: true };
    }
    try {
        await fs.promises.writeFile(result.filePath, content, 'utf8');
        return { success: true, filePath: result.filePath };
    }
    catch (error) {
        console.error('Error saving file:', error);
        return {
            success: false,
            error: `Failed to save file: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
});
//# sourceMappingURL=main.js.map