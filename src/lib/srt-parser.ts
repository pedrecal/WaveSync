/**
 * Represents a subtitle entry in the SRT file
 */
export interface SubtitleEntry {
  id: number;
  startTime: string;
  endTime: string;
  text: string[];
}

/**
 * Custom error class for SRT parsing errors
 */
export class SRTParseError extends Error {
  constructor(
    message: string,
    public line?: number
  ) {
    super(message);
    this.name = 'SRTParseError';
  }
}

/**
 * Parses SRT timestamp format (00:00:00,000) to milliseconds
 */
export function parseTimestamp(timestamp: string): number {
  const pattern = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;
  const match = timestamp.match(pattern);

  if (!match) {
    throw new SRTParseError(`Invalid timestamp format: ${timestamp}`);
  }

  const [_, hours, minutes, seconds, milliseconds] = match;

  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(milliseconds)
  );
}

/**
 * Formats milliseconds to SRT timestamp format (00:00:00,000)
 */
export function formatTimestamp(ms: number): string {
  const pad = (n: number, width: number): string => n.toString().padStart(width, '0');

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
}

/**
 * Parses an SRT file content into an array of subtitle entries
 */
export function parseSRT(content: string): SubtitleEntry[] {
  const lines = content.trim().split('\n');
  const entries: SubtitleEntry[] = [];
  let currentEntry: Partial<SubtitleEntry> | null = null;
  let currentTextLines: string[] = [];
  let lineNumber = 0;

  try {
    for (let i = 0; i < lines.length; i++) {
      lineNumber = i + 1;
      const line = lines[i].trim();

      // Skip empty lines between entries
      if (!line) {
        if (currentEntry && currentTextLines.length > 0) {
          entries.push({
            ...currentEntry,
            text: currentTextLines,
          } as SubtitleEntry);
          currentEntry = null;
          currentTextLines = [];
        }
        continue;
      }

      // Start of new entry
      if (!currentEntry) {
        const id = parseInt(line);
        if (isNaN(id)) {
          throw new SRTParseError('Invalid subtitle ID', lineNumber);
        }
        currentEntry = { id };
        continue;
      }

      // Timestamp line
      if (!currentEntry.startTime) {
        const timeMatch = line.match(/^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})$/);
        if (!timeMatch) {
          throw new SRTParseError('Invalid timestamp line', lineNumber);
        }
        currentEntry.startTime = timeMatch[1];
        currentEntry.endTime = timeMatch[2];

        // Validate timestamps
        parseTimestamp(currentEntry.startTime);
        parseTimestamp(currentEntry.endTime);
        continue;
      }

      // Text content
      currentTextLines.push(line);
    }

    // Add the last entry if exists
    if (currentEntry && currentTextLines.length > 0) {
      entries.push({
        ...currentEntry,
        text: currentTextLines,
      } as SubtitleEntry);
    }

    return entries;
  } catch (error: unknown) {
    if (error instanceof SRTParseError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new SRTParseError(
      `Failed to parse SRT file at line ${lineNumber}: ${errorMessage}`,
      lineNumber
    );
  }
}

/**
 * Converts subtitle entries back to SRT format
 */
export function formatSRT(entries: SubtitleEntry[]): string {
  return entries
    .map((entry) => {
      return [
        entry.id,
        `${entry.startTime} --> ${entry.endTime}`,
        ...entry.text,
        '', // Empty line between entries
      ].join('\n');
    })
    .join('\n');
}
