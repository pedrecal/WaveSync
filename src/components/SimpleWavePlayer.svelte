<script lang="ts">
  import { onMount } from 'svelte';
  import WaveSurfer from 'wavesurfer.js';

  export let audioFile: File | null = null;

  let waveformContainer: HTMLDivElement;
  let wavesurfer: WaveSurfer | null = null;
  let isPlaying = false;
  let currentTime = '0:00';
  let duration = '0:00';

  onMount(() => {
    // Initialize WaveSurfer
    wavesurfer = WaveSurfer.create({
      container: waveformContainer,
      waveColor: '#4f46e5',
      progressColor: '#1e40af',
      height: 100,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });

    // Event listeners
    wavesurfer.on('play', () => {
      isPlaying = true;
    });

    wavesurfer.on('pause', () => {
      isPlaying = false;
    });

    wavesurfer.on('ready', () => {
      duration = formatTime(wavesurfer!.getDuration());
    });

    wavesurfer.on('audioprocess', () => {
      currentTime = formatTime(wavesurfer!.getCurrentTime());
    });

    return () => {
      if (wavesurfer) {
        wavesurfer.destroy();
      }
    };
  });

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function togglePlayPause() {
    if (wavesurfer) {
      wavesurfer.playPause();
    }
  }

  function loadAudioFile() {
    if (audioFile && wavesurfer) {
      const url = URL.createObjectURL(audioFile);
      wavesurfer.load(url);
    }
  }

  // Watch for changes to audioFile prop
  $: if (audioFile && wavesurfer) {
    loadAudioFile();
  }
</script>

<div class="wave-player">
  <h3>WaveSurfer Player</h3>
  
  {#if !audioFile}
    <div class="no-file">
      <p>No audio file loaded. Use the file upload above to select an audio file.</p>
    </div>
  {:else}
    <div class="player-info">
      <p><strong>File:</strong> {audioFile.name}</p>
    </div>
  {/if}
  
  <!-- Waveform container -->
  <div bind:this={waveformContainer} class="waveform"></div>
  
  <!-- Controls -->
  <div class="controls">
    <button 
      on:click={togglePlayPause} 
      disabled={!audioFile}
      class="play-button"
    >
      {isPlaying ? '⏸️' : '▶️'}
    </button>
    
    <div class="time-display">
      <span class="current-time">{currentTime}</span>
      <span class="separator">/</span>
      <span class="duration">{duration}</span>
    </div>
  </div>
</div>

<style>
  .wave-player {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .wave-player h3 {
    margin: 0 0 1rem 0;
    color: #1e293b;
    font-size: 1.25rem;
  }

  .no-file {
    padding: 2rem;
    text-align: center;
    color: #64748b;
    font-style: italic;
    background: #f8fafc;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .player-info {
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f1f5f9;
    border-radius: 6px;
  }

  .player-info p {
    margin: 0;
    color: #475569;
  }

  .waveform {
    margin: 1rem 0;
    border-radius: 6px;
    overflow: hidden;
    background: #f8fafc;
    min-height: 100px;
    border: 1px solid #e2e8f0;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .play-button {
    width: 50px;
    height: 50px;
    border: none;
    border-radius: 50%;
    background: #4f46e5;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .play-button:hover:not(:disabled) {
    background: #4338ca;
  }

  .play-button:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
  }

  .time-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Courier New', monospace;
    font-size: 1rem;
    color: #475569;
  }

  .separator {
    color: #94a3b8;
  }
</style>