/**
 * File information interface
 */
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

/**
 * File content with metadata
 */
export interface FileContent {
  file: FileInfo;
  content: ArrayBuffer | string;
}

/**
 * Abstract file service interface - can be implemented for web or desktop
 */
export interface FileService {
  /**
   * Pick a single file with optional type filtering
   */
  pickFile(accept?: string): Promise<File | null>;

  /**
   * Read file content as text
   */
  readAsText(file: File): Promise<string>;

  /**
   * Read file content as array buffer
   */
  readAsArrayBuffer(file: File): Promise<ArrayBuffer>;

  /**
   * Try to find companion SRT file for a video file
   */
  findCompanionSRT(videoFile: File): Promise<File | null>;
}

/**
 * Web-based file service implementation using File API
 */
export class WebFileService implements FileService {
  async pickFile(accept?: string): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      if (accept) input.accept = accept;

      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0] || null;
        resolve(file);
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  async readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  async findCompanionSRT(videoFile: File): Promise<File | null> {
    // In web context, we can't auto-discover files
    // User will need to select SRT manually
    // TODO: In Electron, we'll implement directory scanning
    return null;
  }
}

/**
 * Utility functions for file handling
 */
/**
 * Electron-based file service implementation
 */
export class ElectronFileService implements FileService {
  async pickFile(accept?: string): Promise<File | null> {
    // Check if electron API is available
    if (!window.electronAPI) {
      console.warn('Electron API not available, falling back to web file picker');
      // Fall back to web implementation
      const webService = new WebFileService();
      return webService.pickFile(accept);
    }

    try {
      // Handle specific file types
      if (accept?.includes('video/')) {
        const result = await window.electronAPI.selectVideoFile();
        if (result.cancelled || !result.videoPath) {
          return null;
        }

        // Create a File-like object from the path
        const filename = result.videoPath.split(/[\\/]/).pop() || '';
        const fileObject = {
          name: filename,
          path: result.videoPath,
          size: 0, // Size not available here
          type: this.getMimeType(filename),
          lastModified: Date.now(),
        };

        return fileObject as any as File;
      }

      // For other file types, fall back to web implementation for now
      const webService = new WebFileService();
      return webService.pickFile(accept);
    } catch (error) {
      console.error('Error picking file via Electron:', error);
      return null;
    }
  }

  async readAsText(file: File): Promise<string> {
    // Handle File-like objects created by ElectronFileService
    if (('path' in file || (file as any).isElectronFile) && window.electronAPI) {
      try {
        // Log what we're trying to read for debugging
        console.log('Reading Electron file as text:', (file as any).path);

        // Use readSubtitleFile for text files
        if (window.electronAPI.readSubtitleFile) {
          const result = await window.electronAPI.readSubtitleFile((file as any).path);
          if (!result.success) {
            console.error('Failed to read subtitle file:', result.error);
            throw new Error(result.error || 'Failed to read file');
          }
          return result.content || '';
        } else {
          // For backward compatibility, use readAudioFile and convert
          const result = await window.electronAPI.readAudioFile((file as any).path);
          if (!result.success) {
            console.error('Failed to read audio file:', result.error);
            throw new Error(result.error || 'Failed to read file');
          }
          // Convert ArrayBuffer to string
          const decoder = new TextDecoder('utf-8');
          return decoder.decode(result.buffer);
        }
      } catch (error) {
        console.error('Error reading file as text via Electron:', error);
        // If the file is a regular File (not a File-like object from Electron),
        // we can try the standard FileReader approach as a fallback
        if (file instanceof Blob) {
          console.log('Falling back to WebFileService for Blob');
          return new WebFileService().readAsText(file);
        }
        throw error;
      }
    }

    // Fall back to web implementation for regular File objects
    if (file instanceof Blob) {
      return new WebFileService().readAsText(file);
    } else {
      console.error('Invalid file object:', file);
      throw new Error('Cannot read file: not a valid File or Blob object');
    }
  }

  async readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    // Handle File-like objects created by ElectronFileService
    if (('path' in file || (file as any).isElectronFile) && window.electronAPI) {
      try {
        const result = await window.electronAPI.readAudioFile((file as any).path);
        if (!result.success || !result.buffer) {
          throw new Error(result.error || 'Failed to read audio file');
        }
        return result.buffer;
      } catch (error) {
        console.error('Error reading file as array buffer via Electron:', error);
        throw error;
      }
    }

    // Fall back to web implementation for regular File objects
    return new WebFileService().readAsArrayBuffer(file);
  }

  async findCompanionSRT(videoFile: File): Promise<File | null> {
    // TODO: Implement companion SRT discovery in Electron
    // For now, fall back to web implementation
    return null;
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      mkv: 'video/x-matroska',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      srt: 'application/x-subrip',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}

/**
 * Factory function to get the appropriate file service
 */
export function getFileService(): FileService {
  // Check if we're running in Electron
  if (typeof window !== 'undefined' && window.electronAPI) {
    return new ElectronFileService();
  }

  // Fall back to web implementation
  return new WebFileService();
}

export class FileUtils {
  /**
   * Extract base name without extension and language suffix
   * S01E01.eng.srt -> S01E01
   * S01E01.mkv -> S01E01
   */
  static getBaseName(filename: string): string {
    // Remove extension
    const withoutExt = filename.replace(/\.[^.]+$/, '');

    // Remove common language codes
    const languageCodes = ['eng', 'english', 'spa', 'spanish', 'fre', 'french', 'ger', 'german'];
    const languagePattern = new RegExp(`\\.(${languageCodes.join('|')})$`, 'i');

    return withoutExt.replace(languagePattern, '');
  }

  /**
   * Check if file is a video format
   */
  static isVideoFile(filename: string): boolean {
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return videoExtensions.includes(ext);
  }

  /**
   * Check if file is an audio format
   */
  static isAudioFile(filename: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return audioExtensions.includes(ext);
  }

  /**
   * Check if file is an SRT subtitle
   */
  static isSRTFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.srt');
  }

  /**
   * Generate potential SRT filenames for a video file
   */
  static generateSRTNames(videoFilename: string): string[] {
    const baseName = this.getBaseName(videoFilename);
    return [`${baseName}.srt`, `${baseName}.eng.srt`, `${baseName}.english.srt`];
  }

  /**
   * Validate file size (in bytes)
   */
  static validateFileSize(file: File, maxSizeMB: number): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
