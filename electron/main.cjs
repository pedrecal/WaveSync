const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const isDev = require('electron-is-dev');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Cache directory for extracted audio files
const CACHE_DIR = path.join(os.tmpdir(), 'wavesync-cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Look for SRT file in the same directory as the video file
 * @param {string} directory - Directory to search
 * @param {string} videoBaseName - Base name of the video file (without extension)
 * @returns {Promise<string|null>} - Path to SRT file or null if not found
 */
async function findSRTFile(directory, videoBaseName) {
  try {
    // Common patterns for subtitle files
    const patterns = [
      `${videoBaseName}.srt`,
      `${videoBaseName}.en.srt`,
      `${videoBaseName}.eng.srt`,
      `${videoBaseName}.english.srt`,
      `${videoBaseName}_en.srt`,
      `${videoBaseName}_eng.srt`,
      // Some media players look for these formats
      `${videoBaseName}.en.sub`,
      `${videoBaseName}.sub`,
    ];

    // Read directory contents
    const files = await fs.promises.readdir(directory);

    // Look for exact matches first
    for (const pattern of patterns) {
      if (files.includes(pattern)) {
        return path.join(directory, pattern);
      }
    }

    // If no exact match, do case-insensitive search
    const lowerPatterns = patterns.map((p) => p.toLowerCase());
    const lowerCaseFiles = files.map((f) => ({ original: f, lower: f.toLowerCase() }));

    for (const lowerPattern of lowerPatterns) {
      const match = lowerCaseFiles.find((f) => f.lower === lowerPattern);
      if (match) {
        return path.join(directory, match.original);
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding SRT file:', error);
    return null;
  }
}

// Keep a global reference of the window object to avoid garbage collection
let mainWindow = null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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
    // Use the video filename but change extension to .mp3
    const videoFilename = path.basename(videoPath, path.extname(videoPath));
    const filename = `${videoFilename}.mp3`;
    const outputPath = path.join(CACHE_DIR, filename);

    // Look for SRT files in the same directory
    const videoDir = path.dirname(videoPath);
    const srtPath = await findSRTFile(videoDir, videoFilename);

    // Return promise to extract audio
    return new Promise((resolve, reject) => {
      let progressPercent = 0;
      const ffmpegProcess = ffmpeg(videoPath)
        .output(outputPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .on('progress', (progress) => {
          // Update progress (percent is more reliable than frames)
          if (progress.percent && !isNaN(progress.percent)) {
            progressPercent = Math.round(progress.percent);
            // Only send progress updates when it changes significantly to reduce IPC calls
            if (progressPercent % 5 === 0) {
              if (_event && !_event.sender.isDestroyed()) {
                _event.sender.send('audio-extraction-progress', progressPercent);
              }
            }
          }
        })
        .on('end', () => {
          resolve({
            success: true,
            audioPath: outputPath,
            originalVideo: videoPath,
            srtPath: srtPath || null,
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

// Handle reading subtitle file
ipcMain.handle('read-subtitle-file', async (_event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return {
      success: true,
      content,
    };
  } catch (error) {
    console.error('Error reading subtitle file:', error);
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
