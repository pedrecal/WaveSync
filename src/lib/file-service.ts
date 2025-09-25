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
