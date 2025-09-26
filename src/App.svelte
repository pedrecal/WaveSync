<script lang="ts">
  import FileUpload from './components/FileUpload.svelte';
  import SubtitleDisplay from './components/SubtitleDisplay.svelte';
  import SimpleAudioUpload from './components/SimpleAudioUpload.svelte';
  import SimpleWavePlayer from './components/SimpleWavePlayer.svelte';
  import VideoSelector from './components/VideoSelector.svelte';
  import type { SubtitleEntry } from './lib/srt-parser';
  import { FileUtils } from './lib/file-service';
  
  let selectedAudioFile: File | null = null;
  let selectedSRTFile: File | null = null;
  let errorMessage = '';
  let isProcessing = false;
  let parsedSubtitles: SubtitleEntry[] = [];
  let isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
  
  function handleAudioSelected(event: CustomEvent<{ file: File }>) {
    selectedAudioFile = event.detail.file;
    errorMessage = '';
    console.log('Audio selected:', selectedAudioFile.name);
  }
  
  function handleSRTSelected(event: CustomEvent<{ file: File }>) {
    selectedSRTFile = event.detail.file;
    errorMessage = '';
    console.log('SRT selected:', selectedSRTFile.name);
  }
  
  function handleError(event: CustomEvent<{ message: string }>) {
    errorMessage = event.detail.message;
    console.error('Error:', errorMessage);
  }
  
  function handleSubtitlesParsed(event: CustomEvent<{ entries: SubtitleEntry[] }>) {
    parsedSubtitles = event.detail.entries;
    console.log('Subtitles parsed:', parsedSubtitles.length, 'entries');
  }
  
  function handleAudioUploaded(event: CustomEvent<{ file: File }>) {
    selectedAudioFile = event.detail.file;
    errorMessage = '';
    console.log('Audio uploaded:', selectedAudioFile.name);
  }
  
  function handleVideoAudioExtracted(event: CustomEvent<{ audioPath: string; srtPath?: string | null }>) {
    // Create a File-like object for the extracted audio
    const filename = event.detail.audioPath.split(/[\\/]/).pop() || '';
    const fileObject = {
      name: filename,
      path: event.detail.audioPath,
      size: 0, // Size not available
      type: 'audio/mp3',
      lastModified: Date.now(),
      isElectronFile: true, // Flag to indicate this is an Electron file
    };
    
    selectedAudioFile = fileObject as any as File;
    errorMessage = '';
    console.log('Video audio extracted:', event.detail.audioPath);
    
    // If we found a subtitle file, load it too
    if (event.detail.srtPath) {
      console.log('Found matching subtitle file:', event.detail.srtPath);
      
      // Create a File-like object for the subtitle 
      const srtFilename = event.detail.srtPath.split(/[\\/]/).pop() || '';
      
      // Create a simpler file-like object that our components can handle
      const srtFileObject = {
        name: srtFilename,
        path: event.detail.srtPath,
        size: 0, // Size not available
        type: 'application/x-subrip',
        lastModified: Date.now(),
        isElectronFile: true, // Flag to indicate this is an Electron file
      };
      
      // Set the subtitle file immediately with the path-based object
      // Our components are now updated to handle this format properly
      selectedSRTFile = srtFileObject as any as File;
      console.log('Set path-based subtitle file object');
    }
  }
  
  function handleProcessingChange(event: CustomEvent<{ isProcessing: boolean }>) {
    isProcessing = event.detail.isProcessing;
  }
</script>

<main>
  <header>
    <h1>🎵 WaveSync</h1>
    <p>Synchronize subtitles with audio files</p>
  </header>

  <div class="upload-section">
    {#if isElectron}
      <div class="electron-features">
        <VideoSelector
          on:audioLoaded={handleVideoAudioExtracted}
          on:error={handleError}
          on:processing={handleProcessingChange}
        />
        <div class="separator">OR</div>
      </div>
    {/if}
    
    <FileUpload 
      on:audioSelected={handleAudioSelected}
      on:srtSelected={handleSRTSelected}
      on:error={handleError}
      disabled={isProcessing}
    />
    
    {#if errorMessage}
      <div class="error-message">
        ⚠️ {errorMessage}
      </div>
    {/if}
  </div>

  {#if selectedAudioFile || selectedSRTFile}
    <div class="content-section">
      <div class="subtitle-section">
        <SubtitleDisplay 
          srtFile={selectedSRTFile}
          on:parsed={handleSubtitlesParsed}
          on:error={handleError}
        />
      </div>
      
      {#if selectedAudioFile}
        <SimpleWavePlayer audioFile={selectedAudioFile} subtitles={parsedSubtitles} />
      {/if}
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    text-align: left;
  }
  
  header {
    text-align: center;
    margin-bottom: 3rem;
  }
  
  header h1 {
    font-size: 2.5rem;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  header p {
    color: #666;
    font-size: 1.1rem;
    margin: 0.5rem 0 0 0;
  }
  
  .upload-section {
    margin-bottom: 2rem;
  }
  
  .content-section {
    margin-bottom: 2rem;
  }
  
  .subtitle-section {
    background: #1f2937;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #374151;
    margin-bottom: 2rem;
  }
  
  .error-message {
    margin-top: 1rem;
    padding: 1rem;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 6px;
    color: #c33;
    text-align: center;
  }
  
  .electron-features {
    margin-bottom: 1.5rem;
  }
  
  .separator {
    text-align: center;
    margin: 1.5rem 0;
    position: relative;
    font-weight: bold;
    color: #888;
  }
  
  .separator::before,
  .separator::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 45%;
    height: 1px;
    background-color: #ddd;
  }
  
  .separator::before {
    left: 0;
  }
  
  .separator::after {
    right: 0;
  }
</style>
