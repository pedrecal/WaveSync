<script lang="ts">
  import FileUpload from './components/FileUpload.svelte';
  import SubtitleDisplay from './components/SubtitleDisplay.svelte';
  import SimpleAudioUpload from './components/SimpleAudioUpload.svelte';
  import SimpleWavePlayer from './components/SimpleWavePlayer.svelte';
  import type { SubtitleEntry } from './lib/srt-parser';
  
  let selectedAudioFile: File | null = null;
  let selectedSRTFile: File | null = null;
  let errorMessage = '';
  let parsedSubtitles: SubtitleEntry[] = [];
  
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
</script>

<main>
  <header>
    <h1>🎵 WaveSync</h1>
    <p>Synchronize subtitles with audio files</p>
  </header>

  <div class="upload-section">
    <FileUpload 
      on:audioSelected={handleAudioSelected}
      on:srtSelected={handleSRTSelected}
      on:error={handleError}
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
</style>
