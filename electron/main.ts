import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import isDev from 'electron-is-dev';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Set ffmpeg path (ffmpegStatic is string | null, but we know it exists)
ffmpeg.setFfmpegPath(ffmpegStatic as string);

// Cache directory for extracted audio files
const CACHE_DIR = path.join(os.tmpdir(), 'wavesync-cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Keep a global reference of the window object to avoid garbage collection
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the app
  if (isDev) {
    // Load from dev server in development
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // Load the index.html file in production
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, recreate window when dock icon is clicked and no windows are open
    if (mainWindow === null) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle video file selection and audio extraction
ipcMain.handle('select-video-file', async () => {
  if (!mainWindow) return { cancelled: true };

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'] }],
  });

  if (result.canceled || !result.filePaths.length) {
    return { cancelled: true };
  }

  const videoPath = result.filePaths[0];
  return { cancelled: false, videoPath };
});

// Handle audio extraction from video
ipcMain.handle('extract-audio', async (_event, videoPath) => {
  try {
    // Generate a unique cache filename
    const filename = `audio-${Date.now()}.mp3`;
    const outputPath = path.join(CACHE_DIR, filename);

    // Return promise to extract audio
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
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
  } catch (error) {
    console.error('Extraction error:', error);
    return {
      success: false,
      error: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
});

// Handle reading audio file
ipcMain.handle('read-audio-file', async (_event, filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return {
      success: true,
      buffer: buffer.buffer,
    };
  } catch (error) {
    console.error('Error reading audio file:', error);
    return {
      success: false,
      error: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
});

// Handle saving corrected SRT file
ipcMain.handle('save-srt-file', async (_event, content) => {
  if (!mainWindow) return { cancelled: true };

  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'Subtitle Files', extensions: ['srt'] }],
    defaultPath: 'corrected.srt',
  });

  if (result.canceled || !result.filePath) {
    return { cancelled: true };
  }

  try {
    await fs.promises.writeFile(result.filePath, content, 'utf8');
    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('Error saving file:', error);
    return {
      success: false,
      error: `Failed to save file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
});
