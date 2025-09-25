<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { parseSRT, type SubtitleEntry, SRTParseError } from '../lib/srt-parser';
  import { FileUtils } from '../lib/file-service';
  
  export let srtFile: File | null = null;
  
  const dispatch = createEventDispatcher<{
    error: { message: string };
    parsed: { entries: SubtitleEntry[] };
  }>();
  
  let entries: SubtitleEntry[] = [];
  let isLoading = false;
  let parseError: string | null = null;
  let searchTerm = '';
  
  // Reactive statement to parse file when it changes
  $: if (srtFile) {
    parseSRTFile(srtFile);
  }
  
  async function parseSRTFile(file: File) {
    try {
      isLoading = true;
      parseError = null;
      
      // Read file content
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
      
      // Parse SRT content
      entries = parseSRT(content);
      dispatch('parsed', { entries });
      
    } catch (error) {
      console.error('Failed to parse SRT file:', error);
      
      if (error instanceof SRTParseError) {
        parseError = `Parse error at line ${error.line || 'unknown'}: ${error.message}`;
      } else {
        parseError = error instanceof Error ? error.message : 'Failed to parse SRT file';
      }
      
      entries = [];
      dispatch('error', { message: parseError });
    } finally {
      isLoading = false;
    }
  }
  
  // Format timestamp for display
  function formatTime(timestamp: string): string {
    // Convert from 00:00:00,000 to 00:00:00
    return timestamp.replace(',', '.');
  }
  
  // Calculate duration between start and end times
  function getDuration(startTime: string, endTime: string): string {
    try {
      const start = parseTimestamp(startTime);
      const end = parseTimestamp(endTime);
      const duration = end - start;
      
      const seconds = Math.floor(duration / 1000);
      const ms = duration % 1000;
      
      if (seconds < 60) {
        return `${seconds}.${ms.toString().padStart(3, '0')}s`;
      } else {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
    } catch {
      return 'N/A';
    }
  }
  
  // Simple timestamp parser for duration calculation
  function parseTimestamp(timestamp: string): number {
    const pattern = /^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/;
    const match = timestamp.match(pattern);
    
    if (!match) return 0;
    
    const [_, hours, minutes, seconds, milliseconds] = match;
    
    return (
      parseInt(hours) * 3600000 +
      parseInt(minutes) * 60000 +
      parseInt(seconds) * 1000 +
      parseInt(milliseconds)
    );
  }
  
  // Filter entries based on search term
  $: filteredEntries = entries.filter(entry => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.id.toString().includes(searchLower) ||
      entry.text.some(line => line.toLowerCase().includes(searchLower)) ||
      entry.startTime.includes(searchLower) ||
      entry.endTime.includes(searchLower)
    );
  });
  
  function clearSearch() {
    searchTerm = '';
  }
</script>

<div class="subtitle-display">
  {#if srtFile}
    <div class="subtitle-header">
      <div class="file-info">
        <h3>📝 Subtitle File</h3>
        <div class="file-details">
          <span class="filename">{srtFile.name}</span>
          <span class="filesize">{FileUtils.formatFileSize(srtFile.size)}</span>
        </div>
      </div>
      
      {#if entries.length > 0}
        <div class="search-controls">
          <div class="search-box">
            <input 
              type="text" 
              placeholder="Search subtitles..." 
              bind:value={searchTerm}
              class="search-input"
            />
            {#if searchTerm}
              <button type="button" on:click={clearSearch} class="clear-search">✕</button>
            {/if}
          </div>
          <div class="stats">
            {filteredEntries.length} of {entries.length} entries
          </div>
        </div>
      {/if}
    </div>
    
    {#if isLoading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Parsing subtitle file...</p>
      </div>
    {:else if parseError}
      <div class="error">
        <div class="error-icon">⚠️</div>
        <div>
          <h4>Parse Error</h4>
          <p>{parseError}</p>
        </div>
      </div>
    {:else if entries.length > 0}
      <div class="entries-container">
        <div class="entries-list">
          {#each filteredEntries as entry (entry.id)}
            <div class="entry-item">
              <div class="entry-header">
                <span class="entry-id">#{entry.id}</span>
                <span class="timing">
                  {formatTime(entry.startTime)} → {formatTime(entry.endTime)}
                </span>
                <span class="duration">({getDuration(entry.startTime, entry.endTime)})</span>
              </div>
              <div class="entry-text">
                {#each entry.text as line}
                  <div class="text-line">{line}</div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
        
        {#if filteredEntries.length === 0 && searchTerm}
          <div class="no-results">
            <p>No subtitles match your search: "{searchTerm}"</p>
            <button type="button" on:click={clearSearch} class="clear-button">Clear search</button>
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty">
        <p>No subtitle entries found in the file.</p>
      </div>
    {/if}
  {:else}
    <div class="no-file">
      <div class="placeholder-icon">📝</div>
      <p>No subtitle file selected</p>
      <p class="hint">Select an SRT file to view its contents</p>
    </div>
  {/if}
</div>

<style>
  .subtitle-display {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .subtitle-header {
    padding: 1.5rem;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
  }
  
  .file-info h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1.2rem;
  }
  
  .file-details {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .filename {
    font-weight: 500;
    color: #555;
  }
  
  .filesize {
    color: #888;
    font-size: 0.9rem;
  }
  
  .search-controls {
    margin-top: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .search-box {
    position: relative;
    flex: 1;
    min-width: 200px;
  }
  
  .search-input {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #0066cc;
  }
  
  .clear-search {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 0.8rem;
  }
  
  .stats {
    color: #666;
    font-size: 0.85rem;
    white-space: nowrap;
  }
  
  .loading {
    padding: 3rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #0066cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error {
    padding: 2rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    background: #fff5f5;
    color: #c53030;
  }
  
  .error-icon {
    font-size: 1.5rem;
  }
  
  .error h4 {
    margin: 0 0 0.5rem 0;
  }
  
  .error p {
    margin: 0;
    font-family: monospace;
    font-size: 0.9rem;
  }
  
  .entries-container {
    max-height: 500px;
    overflow-y: auto;
  }
  
  .entries-list {
    padding: 0;
  }
  
  .entry-item {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.2s;
  }
  
  .entry-item:hover {
    background: #fafafa;
  }
  
  .entry-item:last-child {
    border-bottom: none;
  }
  
  .entry-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    color: #666;
    flex-wrap: wrap;
  }
  
  .entry-id {
    font-weight: 600;
    color: #0066cc;
    min-width: 3rem;
  }
  
  .timing {
    font-family: monospace;
    background: #f0f0f0;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
  }
  
  .duration {
    color: #999;
  }
  
  .entry-text {
    color: #333;
    line-height: 1.4;
  }
  
  .text-line {
    margin-bottom: 0.2rem;
  }
  
  .text-line:last-child {
    margin-bottom: 0;
  }
  
  .no-results {
    padding: 3rem;
    text-align: center;
    color: #666;
  }
  
  .clear-button {
    background: #0066cc;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 1rem;
  }
  
  .empty {
    padding: 3rem;
    text-align: center;
    color: #666;
  }
  
  .no-file {
    padding: 3rem;
    text-align: center;
    color: #999;
  }
  
  .placeholder-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .hint {
    font-size: 0.9rem;
    color: #bbb;
  }
</style>