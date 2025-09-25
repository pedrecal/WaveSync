<script lang="ts">
  import { onMount } from 'svelte';
  import WaveSurfer from 'wavesurfer.js';
  import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js'
  import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js'
  import type { SubtitleEntry } from '../lib/srt-parser';
  import { parseTimestamp } from '../lib/srt-parser';

  export let audioFile: File | null = null;
  export let subtitles: SubtitleEntry[] = [];

  let waveformContainer: HTMLDivElement;
  let wavesurfer: WaveSurfer | null = null;
  let regionsPlugin: any = null;
  let isPlaying = false;
  let currentTime = '0:00';
  let duration = '0:00';
  let zoomLevel = 20; // 1 = normal, higher = more zoomed in
  let isAudioReady = false;
  let currentSubtitle: SubtitleEntry | null = null;

  onMount(() => {
    // Initialize plugins
    regionsPlugin = Regions.create();
    
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
        regionsPlugin,
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
      // Create subtitle regions if subtitles are available
      createSubtitleRegions();
    });

    wavesurfer.on('audioprocess', () => {
      const currentTimeSeconds = wavesurfer!.getCurrentTime();
      currentTime = formatTime(currentTimeSeconds);
      
      // Update current subtitle based on playback time
      currentSubtitle = findActiveSubtitle(currentTimeSeconds);
    });

    wavesurfer.on('interaction', () => {
      const currentTimeSeconds = wavesurfer!.getCurrentTime();
      currentTime = formatTime(currentTimeSeconds);
      
      // Update current subtitle when seeking/clicking
      currentSubtitle = findActiveSubtitle(currentTimeSeconds);
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

  // Convert SRT timestamp (HH:MM:SS,mmm) to seconds for WaveSurfer regions
  function convertSRTTimeToSeconds(srtTimestamp: string): number {
    const milliseconds = parseTimestamp(srtTimestamp);
    return milliseconds / 1000;
  }

  // Find the subtitle that should be active at the given time (in seconds)
  function findActiveSubtitle(currentTimeSeconds: number): SubtitleEntry | null {
    if (!subtitles || subtitles.length === 0) {
      return null;
    }

    for (const subtitle of subtitles) {
      const startSeconds = convertSRTTimeToSeconds(subtitle.startTime);
      const endSeconds = convertSRTTimeToSeconds(subtitle.endTime);
      
      if (currentTimeSeconds >= startSeconds && currentTimeSeconds <= endSeconds) {
        return subtitle;
      }
    }
    
    return null;
  }

  // Create regions for subtitle entries
  function createSubtitleRegions() {
    if (!regionsPlugin || !subtitles || subtitles.length === 0) {
      return;
    }

    // Clear existing regions first
    regionsPlugin.clearRegions();

    // Create a region for each subtitle
    subtitles.forEach((subtitle, index) => {
      const start = convertSRTTimeToSeconds(subtitle.startTime);
      const end = convertSRTTimeToSeconds(subtitle.endTime);
      
      // Generate color based on subtitle index for visual variety
      const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
      ];
      const color = colors[index % colors.length];
      
      const region = regionsPlugin.addRegion({
        start: start,
        end: end,
        color: color + '40', // Add transparency
        content: `${subtitle.id}: ${subtitle.text.join(' ')}`, // Show ID and text
        drag: false, // Disable dragging for now
        resize: false, // Disable resizing for now
      });

      // Add hover effects and interactions
      region.on('click', () => {
        console.log(`Subtitle ${subtitle.id}: ${subtitle.text.join(' ')}`);
        // Optionally seek to this position
        if (wavesurfer) {
          wavesurfer.seekTo(start / wavesurfer.getDuration());
        }
      });

      region.on('enter', () => {
        // Make region more visible on hover
        region.setOptions({ color: color + '60' });
      });

      region.on('leave', () => {
        // Return to normal transparency
        region.setOptions({ color: color + '40' });
      });
    });
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

  // Watch for changes to subtitles prop
  $: if (subtitles && isAudioReady && regionsPlugin) {
    createSubtitleRegions();
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
  
  <!-- Current Subtitle Display -->
  {#if subtitles && subtitles.length > 0}
    <div class="subtitle-display">
      {#if currentSubtitle}
        <div class="subtitle-content">
          <span class="subtitle-id">#{currentSubtitle.id}</span>
          <span class="subtitle-time">{currentSubtitle.startTime} → {currentSubtitle.endTime}</span>
          <div class="subtitle-text">
            {#each currentSubtitle.text as line}
              <div>{line}</div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="subtitle-content no-subtitle">
          <span class="no-subtitle-text">No subtitle at current time</span>
        </div>
      {/if}
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

  .subtitle-display {
    margin: 1rem 0;
    padding: 1.5rem;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border-radius: 8px;
    border: 1px solid #475569;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .subtitle-content {
    text-align: center;
    color: white;
    width: 100%;
  }

  .subtitle-content.no-subtitle {
    opacity: 0.6;
  }

  .subtitle-id {
    display: inline-block;
    background: #4f46e5;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-right: 0.75rem;
  }

  .subtitle-time {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #94a3b8;
    margin-bottom: 0.75rem;
  }

  .subtitle-text {
    font-size: 1.125rem;
    line-height: 1.6;
    font-weight: 500;
    margin-top: 0.75rem;
  }

  .subtitle-text div {
    margin: 0.25rem 0;
  }

  .no-subtitle-text {
    font-style: italic;
    color: #94a3b8;
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

  /* Global styles for WaveSurfer regions */
  :global(.wavesurfer-region) {
    border-radius: 3px;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  :global(.wavesurfer-region:hover) {
    opacity: 0.8;
  }

  :global(.wavesurfer-region-content) {
    position: absolute;
    top: 0;
    left: 2px;
    right: 2px;
    padding: 2px 4px;
    font-size: 10px;
    font-weight: 500;
    color: #1f2937;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
    line-height: 1.2;
  }

  :global(.wavesurfer-region-content:empty) {
    display: none;
  }
</style>