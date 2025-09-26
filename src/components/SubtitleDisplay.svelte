<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { parseSRT, formatSRT, formatTranslatedSRT, type SubtitleEntry, SRTParseError } from '../lib/srt-parser';
  import { FileUtils } from '../lib/file-service';
  import TranslationSettingsModal from './TranslationSettingsModal.svelte';
  import { 
    OpenAITranslationService, 
    TranslationSettingsManager 
  } from '../lib/translation-service';
  import { 
    translationSettings, 
    translationProgress, 
    translatedSubtitles, 
    showTranslations,
    correctedSubtitles
  } from '../stores/sync-store';
  import type { 
    TranslationSettings, 
    TranslatedSubtitleEntry, 
    SupportedLanguage 
  } from '../types/translation';
  import { LANGUAGE_NAMES } from '../types/translation';
  
  export let srtFile: File | null = null;
  
  const dispatch = createEventDispatcher<{
    error: { message: string };
    parsed: { entries: SubtitleEntry[] };
  }>();
  
  let entries: SubtitleEntry[] = [];
  let isLoading = false;
  let parseError: string | null = null;
  let searchTerm = '';
  
  // Translation state
  let showSettingsModal = false;
  let isTranslating = false;
  let translationError: string | null = null;
  let translationService: OpenAITranslationService | null = null;
  
  // Reactive statement to parse file when it changes
  $: if (srtFile) {
    parseSRTFile(srtFile);
  }
  
  async function parseSRTFile(file: File) {
    try {
      isLoading = true;
      parseError = null;
      
      // Handle different file types
      let content: string;
      
      // Check if this is an Electron path-based file
      if ((file as any).isElectronFile && (file as any).path && window.electronAPI?.readSubtitleFile) {
        // Use Electron's API to read the file
        const result = await window.electronAPI.readSubtitleFile((file as any).path);
        if (!result.success || !result.content) {
          throw new Error(result.error || 'Failed to read subtitle file');
        }
        content = result.content;
      } else {
        // Use standard FileReader API for regular File objects
        content = await new Promise<string>((resolve, reject) => {
          try {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
          } catch (error) {
            reject(new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`));
          }
        });
      }
      
      // Parse SRT content
      entries = parseSRT(content);
      dispatch('parsed', { entries });
      
      // Update translated subtitles to match new entries
      updateTranslatedSubtitles();
      
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
  
  // Translation functions
  function updateTranslatedSubtitles() {
    const translatedEntries: TranslatedSubtitleEntry[] = entries.map(entry => ({
      id: entry.id,
      startTime: entry.startTime,
      endTime: entry.endTime,
      originalText: Array.isArray(entry.text) ? entry.text : [entry.text],
      translatedText: undefined,
      isTranslated: false
    }));
    
    translatedSubtitles.set(translatedEntries);
  }
  
  function openTranslationSettings() {
    showSettingsModal = true;
  }
  
  function handleSettingsSaved(event: CustomEvent<{ settings: TranslationSettings }>) {
    const settings = event.detail.settings;
    translationSettings.set(settings);
    translationService = new OpenAITranslationService(settings);
    showSettingsModal = false;
    
    // Save settings (excluding API key for security)
    TranslationSettingsManager.save(settings);
  }
  
  async function startTranslation() {
    console.log('Starting translation...');
    console.log('Translation service:', translationService);
    console.log('Entries length:', entries.length);
    console.log('Corrected subtitles length:', $correctedSubtitles.length);
    
    if (!translationService || entries.length === 0) {
      translationError = 'Please configure translation settings first';
      return;
    }
    
    // Use corrected subtitles if available, otherwise use original
    const subtitlesToTranslate = $correctedSubtitles.length > 0 ? $correctedSubtitles : entries;
    console.log('Subtitles to translate:', subtitlesToTranslate.length);
    
    isTranslating = true;
    translationError = null;
    
    translationProgress.update(progress => ({
      ...progress,
      current: 0,
      total: subtitlesToTranslate.length,
      percentage: 0,
      status: 'translating'
    }));
    
    try {
      // Extract text lines from all subtitle entries (use synced version if available)
      const textToTranslate = subtitlesToTranslate.flatMap(entry => entry.text);
      console.log('Text to translate:', textToTranslate);
      console.log('Text array length:', textToTranslate.length);
      
      // Get current settings
      const currentSettings = $translationSettings;
      console.log('Translation settings:', currentSettings);
      
      // Translate with progress callback
      console.log('Calling translateSubtitles...');
      const translations = await translationService.translateSubtitles(
        textToTranslate,
        currentSettings.targetLanguage as SupportedLanguage,
        (current, total) => {
          const percentage = Math.round((current / total) * 100);
          translationProgress.update(progress => ({
            ...progress,
            current,
            percentage,
            status: 'translating'
          }));
        }
      );
      
      console.log('Received translations:', translations);
      console.log('Translations length:', translations.length);
      
      // Map translations back to subtitle entries (using synced version if available)
      let translationIndex = 0;
      const updatedTranslatedSubtitles: TranslatedSubtitleEntry[] = subtitlesToTranslate.map(entry => {
        const entryTranslations = translations.slice(
          translationIndex, 
          translationIndex + entry.text.length
        );
        translationIndex += entry.text.length;
        
        return {
          id: entry.id,
          startTime: entry.startTime, // This will be synced timing if corrected subtitles were used
          endTime: entry.endTime,
          originalText: Array.isArray(entry.text) ? entry.text : [entry.text],
          translatedText: entryTranslations,
          isTranslated: true
        };
      });
      
      translatedSubtitles.set(updatedTranslatedSubtitles);
      showTranslations.set(true);
      
      translationProgress.update(progress => ({
        ...progress,
        status: 'completed',
        percentage: 100
      }));
      
    } catch (error) {
      console.error('Translation failed:', error);
      translationError = error instanceof Error ? error.message : 'Translation failed';
      
      translationProgress.update(progress => ({
        ...progress,
        status: 'error',
        error: translationError || 'Translation failed'
      }));
    } finally {
      isTranslating = false;
    }
  }
  
  function toggleTranslationView() {
    showTranslations.update(show => !show);
  }
  
  function exportOriginalSRT() {
    if (entries.length === 0) return;
    
    const srtContent = formatSRT(entries);
    const filename = srtFile 
      ? srtFile.name.replace('.srt', '_original.srt')
      : 'subtitles_original.srt';
    
    downloadSRTFile(srtContent, filename);
  }
  
  function exportTranslatedSRT() {
    const translatedEntries = $translatedSubtitles.filter(entry => entry.isTranslated);
    if (translatedEntries.length === 0) {
      translationError = 'No translated subtitles to export';
      return;
    }
    
    const exportEntries = translatedEntries.map(entry => ({
      id: entry.id,
      startTime: entry.startTime,
      endTime: entry.endTime,
      text: entry.translatedText || []
    }));
    
    const srtContent = formatTranslatedSRT(exportEntries);
    const targetLang = $translationSettings.targetLanguage;
    
    // Convert language code to filename suffix
    let langSuffix = targetLang;
    if (targetLang === 'pt-br' || targetLang === 'portuguese-br') {
      langSuffix = 'ptbr';
    } else if (targetLang.includes('-')) {
      langSuffix = targetLang.replace('-', '');
    }
      
    const filename = srtFile 
      ? srtFile.name.replace('.srt', `.${langSuffix}.srt`)
      : `subtitles.${langSuffix}.srt`;
    
    downloadSRTFile(srtContent, filename);
  }
  
  function downloadSRTFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
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
        <div class="controls-section">
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
          
          <div class="translation-controls">
            <button 
              type="button" 
              class="settings-button"
              on:click={openTranslationSettings}
              title="Translation Settings"
            >
              ⚙️ Settings
            </button>
            
            <button 
              type="button" 
              class="translate-button"
              on:click={startTranslation}
              disabled={isTranslating || !$translationSettings.apiKey}
              title="Translate Subtitles"
            >
              {#if isTranslating}
                <span class="spinner-small"></span>
                Translating...
              {:else}
                🌐 Translate
              {/if}
            </button>
            
            {#if $translatedSubtitles.some(entry => entry.isTranslated)}
              <button 
                type="button" 
                class="toggle-view-button"
                on:click={toggleTranslationView}
                title="Toggle translation view"
              >
                {$showTranslations ? '👁️ Original' : '🌐 Translated'}
              </button>
              
              <div class="export-controls">
                <button 
                  type="button" 
                  class="export-button original"
                  on:click={exportOriginalSRT}
                  title="Export original SRT"
                >
                  📥 Export Original
                </button>
                
                <button 
                  type="button" 
                  class="export-button translated"
                  on:click={exportTranslatedSRT}
                  title="Export translated SRT"
                >
                  📥 Export Translated
                </button>
              </div>
            {/if}
          </div>
        </div>
        
        <div class="subtitle-version-info">
          {#if $correctedSubtitles.length > 0}
            <span class="version-badge synced">🎯 Using Synced Version</span>
          {:else}
            <span class="version-badge original">📝 Using Original Version</span>
          {/if}
          <span class="version-hint">Translation will use {$correctedSubtitles.length > 0 ? 'time-corrected' : 'original'} subtitles</span>
        </div>
        
        {#if $translationProgress.status === 'translating'}
          <div class="translation-progress">
            <div class="progress-info">
              <span>Translating to {LANGUAGE_NAMES[$translationSettings.targetLanguage as SupportedLanguage] || $translationSettings.targetLanguage}</span>
              <span>{$translationProgress.current}/{$translationProgress.total} ({$translationProgress.percentage}%)</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: {$translationProgress.percentage}%"></div>
            </div>
          </div>
        {/if}
        
        {#if translationError}
          <div class="translation-error">
            <span class="error-icon">⚠️</span>
            <span>{translationError}</span>
            <button type="button" class="dismiss-error" on:click={() => translationError = null}>✕</button>
          </div>
        {/if}
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
            {@const translatedEntry = $translatedSubtitles.find(t => t.id === entry.id)}
            <div class="entry-item">
              <div class="entry-header">
                <span class="entry-id">#{entry.id}</span>
                <span class="timing">
                  {formatTime(entry.startTime)} → {formatTime(entry.endTime)}
                </span>
                <span class="duration">({getDuration(entry.startTime, entry.endTime)})</span>
                {#if translatedEntry?.isTranslated}
                  <span class="translation-indicator" title="Translated">🌐</span>
                {/if}
              </div>
              
              {#if $showTranslations && translatedEntry?.isTranslated}
                <!-- Show translated text -->
                <div class="entry-text translated">
                  {#each translatedEntry.translatedText || [] as line}
                    <div class="text-line translated-line">{line}</div>
                  {/each}
                </div>
                
                <!-- Show original text as secondary -->
                <div class="entry-text original-secondary">
                  <div class="original-label">Original:</div>
                  {#each entry.text as line}
                    <div class="text-line original-line">{line}</div>
                  {/each}
                </div>
              {:else}
                <!-- Show original text -->
                <div class="entry-text">
                  {#each entry.text as line}
                    <div class="text-line">{line}</div>
                  {/each}
                </div>
                
                <!-- Show translated text as secondary if available -->
                {#if translatedEntry?.isTranslated && !$showTranslations}
                  <div class="entry-text translated-secondary">
                    <div class="translated-label">
                      {LANGUAGE_NAMES[$translationSettings.targetLanguage as SupportedLanguage] || $translationSettings.targetLanguage}:
                    </div>
                    {#each translatedEntry.translatedText || [] as line}
                      <div class="text-line translated-preview">{line}</div>
                    {/each}
                  </div>
                {/if}
              {/if}
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

<TranslationSettingsModal 
  bind:isOpen={showSettingsModal}
  settings={$translationSettings}
  on:save={handleSettingsSaved}
  on:close={() => showSettingsModal = false}
/>

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
  
  /* Translation styles */
  .controls-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .translation-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  
  .export-controls {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }
  
  .settings-button,
  .translate-button,
  .toggle-view-button,
  .export-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }
  
  .settings-button {
    background: #6c757d;
    color: white;
    border-color: #6c757d;
  }
  
  .settings-button:hover {
    background: #5a6268;
    border-color: #545b62;
  }
  
  .toggle-view-button:hover,
  .export-button:hover {
    background: #f8f9fa;
    border-color: #adb5bd;
  }
  
  .translate-button {
    background: #0066cc;
    color: white;
    border-color: #0066cc;
  }
  
  .translate-button:hover:not(:disabled) {
    background: #0056b3;
  }
  
  .translate-button:disabled {
    background: #6c757d;
    border-color: #6c757d;
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  .toggle-view-button {
    background: #28a745;
    color: white;
    border-color: #28a745;
  }
  
  .toggle-view-button:hover {
    background: #218838;
    border-color: #1e7e34;
  }
  
  .export-button {
    background: #6f42c1;
    color: white;
    border-color: #6f42c1;
    font-size: 0.85rem;
  }
  
  .export-button:hover {
    background: #5a2d91;
    border-color: #5a2d91;
  }
  
  .export-button.original {
    background: #6c757d;
    border-color: #6c757d;
  }
  
  .export-button.original:hover {
    background: #5a6268;
    border-color: #5a6268;
  }
  
  .subtitle-version-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: #f8f9fa;
    border-radius: 6px;
    margin-bottom: 1rem;
    border-left: 4px solid #6c757d;
  }
  
  .version-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
  }
  
  .version-badge.synced {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .version-badge.original {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
  }
  
  .version-hint {
    font-size: 0.85rem;
    color: #6c757d;
    font-style: italic;
  }
  
  .spinner-small {
    width: 14px;
    height: 14px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .translation-progress {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 1rem;
  }
  
  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: #495057;
  }
  
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #0066cc, #28a745);
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  
  .translation-error {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 6px;
    color: #c53030;
    font-size: 0.9rem;
  }
  
  .error-icon {
    font-size: 1.1rem;
  }
  
  .dismiss-error {
    background: none;
    border: none;
    color: #c53030;
    cursor: pointer;
    padding: 0.25rem;
    margin-left: auto;
    border-radius: 3px;
    transition: background 0.2s;
  }
  
  .dismiss-error:hover {
    background: rgba(197, 48, 48, 0.1);
  }
  
  .translation-indicator {
    font-size: 0.8rem;
    color: #28a745;
  }
  
  .entry-text.translated {
    border-left: 3px solid #28a745;
    padding-left: 0.75rem;
  }
  
  .entry-text.original-secondary {
    margin-top: 0.75rem;
    padding-left: 0.75rem;
    border-left: 2px solid #6c757d;
    opacity: 0.7;
  }
  
  .entry-text.translated-secondary {
    margin-top: 0.75rem;
    padding-left: 0.75rem;
    border-left: 2px solid #28a745;
    opacity: 0.8;
  }
  
  .original-label,
  .translated-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #6c757d;
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .translated-label {
    color: #28a745;
  }
  
  .text-line.translated-line {
    color: #155724;
  }
  
  .text-line.original-line {
    color: #6c757d;
    font-size: 0.9rem;
  }
  
  .text-line.translated-preview {
    color: #28a745;
    font-size: 0.9rem;
  }
  
  @media (max-width: 768px) {
    .translation-controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .settings-button,
    .translate-button,
    .toggle-view-button,
    .export-button {
      width: 100%;
      justify-content: center;
    }
    
    .export-controls {
      margin-left: 0;
      width: 100%;
      flex-direction: column;
    }
    
    .progress-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style>