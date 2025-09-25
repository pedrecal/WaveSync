<script lang="ts">
  import { onMount } from 'svelte';
  import WaveSurfer from 'wavesurfer.js';
  import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js'


  export let audioFile: File | null = null;

  let waveformContainer: HTMLDivElement;
  let wavesurfer: WaveSurfer | null = null;
  let isPlaying = false;
  let currentTime = '0:00';
  let duration = '0:00';
  let zoomLevel = 20; // 1 = normal, higher = more zoomed in
  let isAudioReady = false;

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
      fillParent: true,
      plugins: [
        Hover.create({
          lineColor: '#ff0000',
          lineWidth: 2,
          labelBackground: '#555',
          labelColor: '#fff',
          labelSize: '11px',
          labelPreferLeft: false,
          formatTimeCallback: formatTimeSRT,
        }),
      ],
    });

    // Keyboard event listener for space bar
    const handleKeydown = (event: KeyboardEvent) => {
      // Check if space bar was pressed and we're not in an input field
      if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault(); // Prevent page scrolling
        togglePlayPause();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeydown);

    // Event listeners
    wavesurfer.on('play', () => {
      isPlaying = true;
    });

    wavesurfer.on('pause', () => {
      isPlaying = false;
    });

    wavesurfer.on('ready', () => {
      duration = formatTime(wavesurfer!.getDuration());
      isAudioReady = true;
      // Apply initial zoom level
      wavesurfer!.zoom(zoomLevel);
    });

    wavesurfer.on('audioprocess', () => {
      currentTime = formatTime(wavesurfer!.getCurrentTime());
    });

    return () => {
      if (wavesurfer) {
        wavesurfer.destroy();
      }
      // Remove keyboard event listener
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function formatTimeSRT(seconds: number): string {
    const totalMs = Math.round(seconds * 1000);
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  function togglePlayPause() {
    if (wavesurfer) {
      wavesurfer.playPause();
    }
  }

  function loadAudioFile() {
    if (audioFile && wavesurfer) {
      isAudioReady = false; // Reset audio ready state
      const url = URL.createObjectURL(audioFile);
      wavesurfer.load(url);
    }
  }

  function handleZoomChange() {
    if (wavesurfer && isAudioReady) {
      wavesurfer.zoom(zoomLevel);
    }
  }

  // Watch for changes to audioFile prop
  $: if (audioFile && wavesurfer) {
    loadAudioFile();
  }

  // Watch for zoom level changes
  $: if (wavesurfer && zoomLevel && isAudioReady) {
    handleZoomChange();
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
  
  <!-- Zoom Controls -->
  <div class="zoom-controls">
    <label for="zoom-slider">Zoom:</label>
    <input 
      id="zoom-slider"
      type="range" 
      min="1" 
      max="500" 
      bind:value={zoomLevel}
      class="zoom-slider"
      disabled={!audioFile}
    />
    <span class="zoom-value">{zoomLevel}x</span>
  </div>

  <!-- Controls -->
</div>

<style>
  .wave-player {
    max-width: 95vw; /* Use most of the viewport width */
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
    overflow-x: auto; /* Enable horizontal scrolling when zoomed */
    overflow-y: hidden;
    background: #f8fafc;
    min-height: 100px;
    border: 1px solid #e2e8f0;
    width: 100%;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f1f5f9;
    border-radius: 6px;
  }

  .zoom-controls label {
    font-weight: 500;
    color: #475569;
    min-width: 50px;
  }

  .zoom-slider {
    flex: 1;
    height: 6px;
    background: #cbd5e1;
    border-radius: 3px;
    outline: none;
    cursor: pointer;
  }

  .zoom-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: #4f46e5;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s;
  }

  .zoom-slider::-webkit-slider-thumb:hover {
    background: #4338ca;
  }

  .zoom-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #4f46e5;
    border-radius: 50%;
    border: none;
    cursor: pointer;
  }

  .zoom-slider:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .zoom-value {
    min-width: 60px;
    text-align: right;
    font-family: 'Courier New', monospace;
    font-weight: 500;
    color: #475569;
  }
</style>