import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseSRT,
  formatSRT,
  parseTimestamp,
  formatTimestamp,
  type SubtitleEntry,
} from '../src/lib/srt-parser';

describe('SRT Parser', () => {
  const samplePath = join(process.cwd(), 'test', 'samples', 'sample.srt');
  const sampleContent = readFileSync(samplePath, 'utf-8');

  it('should parse timestamp correctly', () => {
    const timestamp = '01:23:45,678';
    const milliseconds = parseTimestamp(timestamp);
    expect(milliseconds).toBe(5025678); // 1h 23m 45s 678ms in milliseconds
    expect(formatTimestamp(milliseconds)).toBe(timestamp);
  });

  it('should throw error on invalid timestamp', () => {
    expect(() => parseTimestamp('01:23:45.678')).toThrow();
    expect(() => parseTimestamp('1:23:45,678')).toThrow();
    expect(() => parseTimestamp('01:23:45,67')).toThrow();
  });

  it('should parse sample SRT file successfully', () => {
    const entries = parseSRT(sampleContent);

    // Basic structure checks
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);

    // Verify entry structure
    const firstEntry = entries[0];
    expect(firstEntry).toHaveProperty('id');
    expect(firstEntry).toHaveProperty('startTime');
    expect(firstEntry).toHaveProperty('endTime');
    expect(firstEntry).toHaveProperty('text');
    expect(Array.isArray(firstEntry.text)).toBe(true);

    // Verify timestamp format
    expect(firstEntry.startTime).toMatch(/^\d{2}:\d{2}:\d{2},\d{3}$/);
    expect(firstEntry.endTime).toMatch(/^\d{2}:\d{2}:\d{2},\d{3}$/);
  });

  it('should correctly parse the sample file content', () => {
    const entries = parseSRT(sampleContent);

    // Test specific content from the sample file
    expect(entries[0].id).toBe(1);
    expect(entries[0].startTime).toBe('00:00:00,300');
    expect(entries[0].endTime).toBe('00:00:03,435');
    expect(entries[0].text).toEqual(['Please do not attempt to perform', 'any of these stunts']);

    expect(entries[1].id).toBe(2);
    expect(entries[1].startTime).toBe('00:00:03,437');
    expect(entries[1].endTime).toBe('00:00:06,171');
    expect(entries[1].text).toEqual(['Or activities in this show.']);

    // Verify we parsed all entries
    expect(entries.length).toBeGreaterThan(10); // Sample should have multiple entries

    // Test that IDs are sequential
    entries.forEach((entry, index) => {
      expect(entry.id).toBe(index + 1);
    });

    // Test that timestamps are valid and in order
    for (let i = 1; i < entries.length; i++) {
      const prevEnd = parseTimestamp(entries[i - 1].endTime);
      const currentStart = parseTimestamp(entries[i].startTime);
      expect(currentStart).toBeGreaterThanOrEqual(prevEnd);
    }
  });

  it('should handle multi-line subtitles', () => {
    const multilineContent = `1
00:00:01,000 --> 00:00:04,000
First line
Second line
Third line

2
00:00:05,000 --> 00:00:08,000
Single line`;

    const entries = parseSRT(multilineContent);
    expect(entries[0].text).toHaveLength(3);
    expect(entries[1].text).toHaveLength(1);
  });

  it('should maintain subtitle integrity through parse-format cycle', () => {
    const entries = parseSRT(sampleContent);
    const formatted = formatSRT(entries);
    const reparsed = parseSRT(formatted);

    // Compare original and reparsed entries
    expect(reparsed).toEqual(entries);
  });

  it('should throw error on malformed SRT content', () => {
    const malformedContent = `1
00:00:01,000 -> 00:00:04,000
Missing arrow`;

    expect(() => parseSRT(malformedContent)).toThrow();
  });
});
