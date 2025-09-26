<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getFileService, FileUtils } from '../lib/file-service';
  
  export let disabled = false;
  
  const dispatch = createEventDispatcher<{
    audioSelected: { file: File };
    srtSelected: { file: File };
    error: { message: string };
  }>();
  
  let isDragOver = false;
  let isProcessing = false;
  let selectedAudioFile: File | null = null;
  let selectedSRTFile: File | null = null;
  
  const fileService = getFileService();
  
  // Drag and drop handlers
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
  }
  
  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
  }
  
  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    
    const files = Array.from(event.dataTransfer?.files || []);
    await processDroppedFiles(files);
  }
  
  async function processDroppedFiles(files: File[]) {
    try {
      isProcessing = true;
      
      // Separate audio and SRT files
      const audioFiles = files.filter(f => FileUtils.isAudioFile(f.name));
      const srtFiles = files.filter(f => FileUtils.isSRTFile(f.name));
      
      if (audioFiles.length === 0 && srtFiles.length === 0) {
        dispatch('error', { message: 'Please drop an audio file (.mp3, .wav, etc.) or SRT subtitle file' });
        return;
      }
      
      // Process audio file
      if (audioFiles.length > 0) {
        const audioFile = audioFiles[0];
        
        selectedAudioFile = audioFile;
        dispatch('audioSelected', { file: audioFile });
        
        // Try to find matching SRT in the dropped files
        const baseName = FileUtils.getBaseName(audioFile.name);
        const matchingSRT = srtFiles.find(srt => {
          const srtBaseName = FileUtils.getBaseName(srt.name);
          return srtBaseName === baseName;
        });
        
        if (matchingSRT) {
          selectedSRTFile = matchingSRT;
          dispatch('srtSelected', { file: matchingSRT });
        }
      }
      
      // Process standalone SRT file
      if (srtFiles.length > 0 && !selectedSRTFile) {
        selectedSRTFile = srtFiles[0];
        dispatch('srtSelected', { file: srtFiles[0] });
      }
      
    } catch (error) {
      console.error('Error processing files:', error);
      dispatch('error', { 
        message: error instanceof Error ? error.message : 'Failed to process dropped files' 
      });
    } finally {
      isProcessing = false;
    }
  }
  
  // Manual file selection
  async function selectAudioFile() {
    try {
      const file = await fileService.pickFile('.mp3,.wav,.m4a,.aac,.ogg,.flac');
      if (file) {
        selectedAudioFile = file;
        dispatch('audioSelected', { file });
      }
    } catch (error) {
      dispatch('error', { 
        message: error instanceof Error ? error.message : 'Failed to select audio file' 
      });
    }
  }
  
  async function selectSRTFile() {
    try {
      const file = await fileService.pickFile('.srt');
      if (file) {
        selectedSRTFile = file;
        dispatch('srtSelected', { file });
      }
    } catch (error) {
      dispatch('error', { 
        message: error instanceof Error ? error.message : 'Failed to select SRT file' 
      });
    }
  }
  
  function clearFiles() {
    selectedAudioFile = null;
    selectedSRTFile = null;
  }
</script>

<div class="file-upload-container">
  <div 
    class="drop-zone"
    class:drag-over={isDragOver}
    class:processing={isProcessing}
    class:disabled={disabled}
    on:dragover={disabled ? null : handleDragOver}
    on:dragleave={disabled ? null : handleDragLeave}
    on:drop={disabled ? null : handleDrop}
    role="button"
    tabindex={disabled ? -1 : 0}
  >
    {#if isProcessing}
      <div class="processing">
        <div class="spinner"></div>
        <p>Processing files...</p>
      </div>
    {:else}
      <div class="drop-content">
        <div class="drop-icon">🎵</div>
        <h3>Drop your files here</h3>
        <p>Drag & drop audio files (.mp3, .wav, etc.) and SRT subtitles</p>
        <p class="or">or</p>
        <div class="button-group">
          <button 
            type="button" 
            on:click={selectAudioFile} 
            class="select-button"
            disabled={disabled}
          >
            Select Audio File
          </button>
          <button 
            type="button" 
            on:click={selectSRTFile} 
            class="select-button"
            disabled={disabled}
          >
            Select SRT File
          </button>
        </div>
      </div>
    {/if}
  </div>
  
  {#if selectedAudioFile || selectedSRTFile}
    <div class="selected-files">
      <div class="files-header">
        <h4>Selected Files</h4>
        <button type="button" on:click={clearFiles} class="clear-button">Clear All</button>
      </div>
      
      {#if selectedAudioFile}
        <div class="file-item audio-file">
          <div class="file-icon">�</div>
          <div class="file-info">
            <div class="file-name">{selectedAudioFile.name}</div>
            <div class="file-details">
              {FileUtils.formatFileSize(selectedAudioFile.size)} • Audio
            </div>
          </div>
        </div>
      {/if}
      
      {#if selectedSRTFile}
        <div class="file-item srt-file">
          <div class="file-icon">💬</div>
          <div class="file-info">
            <div class="file-name">{selectedSRTFile.name}</div>
            <div class="file-details">
              {FileUtils.formatFileSize(selectedSRTFile.size)} • Subtitles
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .file-upload-container {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .drop-zone {
    border: 2px dashed #ccc;
    border-radius: 12px;
    padding: 3rem;
    text-align: center;
    transition: all 0.3s ease;
    background: #fafafa;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .drop-zone.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    border-color: #ddd;
    background: #f5f5f5;
    pointer-events: none;
  }
  
  .drop-zone.drag-over {
    border-color: #0066cc;
    background: #f0f8ff;
    transform: scale(1.02);
  }
  
  .drop-zone.processing {
    background: #f5f5f5;
    border-color: #999;
  }
  
  .drop-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .drop-icon {
    font-size: 3rem;
  }
  
  .drop-content h3 {
    margin: 0;
    color: #333;
    font-size: 1.5rem;
  }
  
  .drop-content p {
    margin: 0;
    color: #666;
  }
  
  .or {
    font-style: italic;
    color: #999;
  }
  
  .button-group {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .select-button {
    background: #0066cc;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
  }
  
  .select-button:hover {
    background: #0052a3;
  }
  
  .processing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #0066cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .selected-files {
    margin-top: 2rem;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
  }
  
  .files-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .files-header h4 {
    margin: 0;
    color: #333;
  }
  
  .clear-button {
    background: none;
    border: 1px solid #ccc;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    color: #666;
    transition: all 0.2s;
  }
  
  .clear-button:hover {
    border-color: #999;
    color: #333;
  }
  
  .file-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f5f5f5;
  }
  
  .file-item:last-child {
    border-bottom: none;
  }
  
  .file-icon {
    font-size: 1.5rem;
  }
  
  .file-info {
    flex: 1;
  }
  
  .file-name {
    font-weight: 500;
    color: #333;
    margin-bottom: 0.25rem;
  }
  
  .file-details {
    font-size: 0.85rem;
    color: #666;
  }
  
  .audio-file {
    background: linear-gradient(90deg, #f5fff5, transparent);
  }
  
  .srt-file {
    background: linear-gradient(90deg, #f5f5ff, transparent);
  }
</style>