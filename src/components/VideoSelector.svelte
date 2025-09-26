<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  // Set up event dispatcher
  const dispatch = createEventDispatcher<{
    audioLoaded: { audioPath: string; srtPath?: string | null };
    error: { message: string };
    processing: { isProcessing: boolean };
  }>();
  
  let isElectron = false;
  let isProcessing = false;
  let errorMessage = '';
  let successMessage = '';
  let extractionProgress = 0;

  // Check if running in Electron
  onMount(() => {
    isElectron = window.electronAPI !== undefined;
    
    // Set up progress listener if in Electron
    if (isElectron && window.electronAPI) {
      window.electronAPI.onAudioExtractionProgress((progress) => {
        extractionProgress = progress;
      });
    }
  });
  
  // Clean up event listeners when component is destroyed
  onDestroy(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.removeAudioExtractionProgressListener();
    }
  });

  async function handleSelectVideo() {
    if (!isElectron || !window.electronAPI) {
      errorMessage = 'This feature requires the Electron app.';
      return;
    }

    try {
      errorMessage = '';
      successMessage = '';
      
      // Select video file
      const result = await window.electronAPI.selectVideoFile();
      if (result.cancelled || !result.videoPath) {
        return;
      }

      // Reset progress and show processing state
      extractionProgress = 0;
      isProcessing = true;
      dispatch('processing', { isProcessing: true });
      
      // Extract audio from video
      const extractionResult = await window.electronAPI.extractAudio(result.videoPath);
      
      if (!extractionResult.success || !extractionResult.audioPath) {
        errorMessage = extractionResult.error || 'Failed to extract audio';
        dispatch('error', { message: errorMessage });
        return;
      }

      // Success - emit event with audio path and optional SRT path
      successMessage = 'Audio extracted successfully!';
      
      // If we found a subtitle file, mention it in the success message
      if (extractionResult.srtPath) {
        successMessage += ' Found matching subtitle file!';
      }
      
      dispatch('audioLoaded', { 
        audioPath: extractionResult.audioPath, 
        srtPath: extractionResult.srtPath 
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      dispatch('error', { message: errorMessage });
    } finally {
      isProcessing = false;
      dispatch('processing', { isProcessing: false });
    }
  }
</script>

<div class="video-selector">
  <button 
    on:click={handleSelectVideo}
    disabled={isProcessing || !isElectron}
    class="select-video-btn"
  >
    {#if isProcessing}
      Extracting Audio... {extractionProgress}%
    {:else}
      Select Video & Extract Audio
    {/if}
  </button>
  
  {#if isProcessing}
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: {extractionProgress}%"></div>
    </div>
  {/if}
  
  {#if !isElectron}
    <div class="non-electron-message">
      <p>For video processing, please use the Electron app version.</p>
    </div>
  {/if}
  
  {#if errorMessage}
    <div class="error-message">
      {errorMessage}
    </div>
  {/if}
  
  {#if successMessage}
    <div class="success-message">
      {successMessage}
    </div>
  {/if}
</div>

<style>
  .video-selector {
    margin-bottom: 1rem;
  }
  
  .select-video-btn {
    padding: 0.5rem 1rem;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.3s;
  }
  
  .select-video-btn:hover:not(:disabled) {
    background-color: #2980b9;
  }
  
  .select-video-btn:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  .error-message {
    margin-top: 0.5rem;
    color: #e74c3c;
    font-size: 0.9rem;
  }
  
  .success-message {
    margin-top: 0.5rem;
    color: #2ecc71;
    font-size: 0.9rem;
  }
  
  .non-electron-message {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #7f8c8d;
    font-style: italic;
  }
  
  .progress-bar-container {
    width: 100%;
    background-color: #f1f1f1;
    border-radius: 4px;
    margin-top: 0.5rem;
    height: 8px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: linear-gradient(to right, #3498db, #2980b9);
    transition: width 0.3s ease;
    border-radius: 4px;
  }
</style>