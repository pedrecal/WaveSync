<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { FileUtils, WebFileService } from '../lib/file-service';
  
  const dispatch = createEventDispatcher<{
    audioUploaded: { file: File };
    error: { message: string };
  }>();
  
  let audioFile: File | null = null;
  let fileService = new WebFileService();
  
  async function selectAudioFile() {
    try {
      const file = await fileService.pickFile('.mp3,.wav,.m4a,.aac,.ogg');
      if (file) {
        audioFile = file;
        dispatch('audioUploaded', { file });
      }
    } catch (error) {
      dispatch('error', { 
        message: error instanceof Error ? error.message : 'Failed to select audio file' 
      });
    }
  }
  
  function clearAudioFile() {
    audioFile = null;
  }
</script>

<div class="audio-section">
  <h3>🎵 Audio File</h3>
  
  {#if audioFile}
    <div class="audio-info">
      <div class="file-details">
        <div class="filename">{audioFile.name}</div>
        <div class="filesize">{FileUtils.formatFileSize(audioFile.size)}</div>
      </div>
      
      <div class="audio-actions">
        <button type="button" on:click={clearAudioFile} class="clear-button">
          🗑️ Clear
        </button>
      </div>
      
      <div class="audio-preview">
        <audio controls src={URL.createObjectURL(audioFile)}>
          Your browser does not support audio playback.
        </audio>
      </div>
    </div>
  {:else}
    <div class="audio-upload">
      <button type="button" on:click={selectAudioFile} class="upload-button">
        📁 Select Audio File
      </button>
      <p class="supported-formats">Supports: MP3, WAV, M4A, AAC, OGG</p>
    </div>
  {/if}
</div>

<style>
  .audio-section {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .audio-section h3 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1.2rem;
  }
  
  .audio-info {
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 1rem;
    background: #f8f9fa;
  }
  
  .file-details {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .filename {
    font-weight: 500;
    color: #333;
    word-break: break-all;
  }
  
  .filesize {
    color: #666;
    font-size: 0.9rem;
  }
  
  .audio-actions {
    margin-bottom: 1rem;
  }
  
  .clear-button {
    background: #6c757d;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  
  .audio-preview audio {
    width: 100%;
    max-width: 400px;
  }
  
  .audio-upload {
    text-align: center;
    padding: 2rem 0;
  }
  
  .upload-button {
    background: #007bff;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    margin-bottom: 0.5rem;
    transition: background 0.2s;
  }
  
  .upload-button:hover {
    background: #0056b3;
  }
  
  .supported-formats {
    color: #666;
    font-size: 0.9rem;
    margin: 0.5rem 0;
  }
</style>