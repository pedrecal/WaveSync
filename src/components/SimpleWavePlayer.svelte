<script lang="ts">
  import { onMount } from 'svelte';
  import WaveSurfer from 'wavesurfer.js';
  import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js'
  import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js'
  import type { SubtitleEntry } from '../lib/srt-parser';
  import { parseTimestamp, formatTimestamp, formatSRT } from '../lib/srt-parser';

  export let audioFile: File | null = null;
  export let subtitles: SubtitleEntry[] = [];

  let waveformContainer: HTMLDivElement;
  let wavesurfer: WaveSurfer | null = null;
  let regionsPlugin: any = null;
  let isPlaying = false;
  let currentTime = '0:00';
  let duration = '0:00';
  let zoomLevel = 500; // 1 = normal, higher = more zoomed in
  let isAudioReady = false;
  let currentSubtitle: SubtitleEntry | null = null;
  let isSyncMode = false;
  let syncPoints: Array<{id: string, audioTime: number, subtitleTime: number, subtitleId: number}> = [];
  let correctedSubtitles: SubtitleEntry[] = [];
  let showSubtitleSelector = false;
  let selectedAudioTime = 0;
  let searchQuery = '';
  let filteredSubtitles: SubtitleEntry[] = [];
  let timeInput = '00:00:00.000';
  let isWaveformSelected = false;

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

    // Keyboard event listener for waveform controls
    const handleKeydown = (event: KeyboardEvent) => {
      // Waveform-specific controls (only when waveform is selected)
      if (isWaveformSelected && wavesurfer && isAudioReady) {
        switch (event.code) {
          case 'Space':
            event.preventDefault();
            togglePlayPause();
            break;
            
          case 'ArrowLeft':
            event.preventDefault();
            seekByAmount(-getSeekAmount());
            break;
            
          case 'ArrowRight':
            event.preventDefault();
            seekByAmount(getSeekAmount());
            break;
            
          case 'ArrowUp':
            event.preventDefault();
            changeZoom(50);
            break;
            
          case 'ArrowDown':
            event.preventDefault();
            changeZoom(-50);
            break;
        }
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
      duration = formatTimeSRT(wavesurfer!.getDuration());
      isAudioReady = true;
      // Apply initial zoom level
      wavesurfer!.zoom(zoomLevel);
      // Create subtitle regions if subtitles are available
      createSubtitleRegions();
    });

    wavesurfer.on('audioprocess', () => {
      const currentTimeSeconds = wavesurfer!.getCurrentTime();
      currentTime = formatTimeSRT(currentTimeSeconds);
      timeInput = formatTimeWithDots(currentTimeSeconds);
      
      // Update current subtitle based on playback time
      currentSubtitle = findActiveSubtitle(currentTimeSeconds);
    });

    wavesurfer.on('interaction', (newTime: number) => {
      const currentTimeSeconds = newTime || wavesurfer!.getCurrentTime();
      currentTime = formatTimeSRT(currentTimeSeconds);
      timeInput = formatTimeWithDots(currentTimeSeconds);
      
      // Update current subtitle when seeking/clicking
      currentSubtitle = findActiveSubtitle(currentTimeSeconds);
      
      // No automatic modal in sync mode - user will click button manually
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
    // Use corrected subtitles if we have sync points, otherwise use original
    const activeSubtitles = (syncPoints.length > 0 && correctedSubtitles.length > 0) ? 
      correctedSubtitles : subtitles;
    
    if (!activeSubtitles || activeSubtitles.length === 0) {
      return null;
    }

    for (const subtitle of activeSubtitles) {
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

    // Use corrected subtitles if available, otherwise use original
    const displaySubtitles = (correctedSubtitles.length > 0) ? correctedSubtitles : subtitles;

    // Create a region for each subtitle
    displaySubtitles.forEach((subtitle, index) => {
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

  function toggleSyncMode() {
    isSyncMode = !isSyncMode;
    console.log('Sync mode:', isSyncMode ? 'ON' : 'OFF');
    
    // Close subtitle selector if exiting sync mode
    if (!isSyncMode) {
      showSubtitleSelector = false;
    }
  }

  function openSyncPointCreation() {
    if (!wavesurfer) return;
    
    selectedAudioTime = wavesurfer.getCurrentTime();
    showSubtitleSelector = true;
    searchQuery = '';
    filteredSubtitles = subtitles;
  }

  function closeSubtitleSelector() {
    showSubtitleSelector = false;
    searchQuery = '';
  }

  function filterSubtitles() {
    if (!searchQuery.trim()) {
      filteredSubtitles = subtitles;
      return;
    }

    const query = searchQuery.toLowerCase();
    filteredSubtitles = subtitles.filter(subtitle => {
      // Search by ID
      if (subtitle.id.toString().includes(query)) {
        return true;
      }
      
      // Search by text content
      const text = subtitle.text.join(' ').toLowerCase();
      return text.includes(query);
    });
  }

  function selectSubtitleForSync(subtitle: SubtitleEntry) {
    createSyncPointForSubtitle(selectedAudioTime, subtitle);
    closeSubtitleSelector();
  }

  function createSyncPointForSubtitle(audioTimeSeconds: number, subtitle: SubtitleEntry) {
    const subtitleStartSeconds = convertSRTTimeToSeconds(subtitle.startTime);
    
    // Create unique ID for this sync point
    const syncPointId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const syncPoint = {
      id: syncPointId,
      audioTime: audioTimeSeconds,
      subtitleTime: subtitleStartSeconds,
      subtitleId: subtitle.id
    };
    
    syncPoints = [...syncPoints, syncPoint];
    
    console.log('Created sync point:', syncPoint);
    
    // Auto-recalculate corrections using ORIGINAL subtitles as reference
    correctedSubtitles = applySyncCorrection(subtitles);
    console.log('Auto-updated corrected subtitles');
    
    // Update waveform regions to show corrected timings
    createSubtitleRegions();
    
    // Update current subtitle display to use corrected version
    if (wavesurfer) {
      currentSubtitle = findActiveSubtitle(wavesurfer.getCurrentTime());
    }
  }

  function downloadCorrectedSRT() {
    if (correctedSubtitles.length === 0) {
      alert('No corrected subtitles to download. Create some sync points first.');
      return;
    }
    
    // Convert corrected subtitles to SRT format
    const srtContent = formatSRT(correctedSubtitles);
    
    // Create download blob
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `${audioFile?.name.replace(/\.[^/.]+$/, '') || 'subtitles'}_synced.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`Downloaded corrected SRT with ${correctedSubtitles.length} subtitles`);
  }

  function clearSyncPoints() {
    syncPoints = [];
    correctedSubtitles = [];
    
    // Clear sync point markers from waveform
    if (regionsPlugin) {
      regionsPlugin.clearRegions();
      // Recreate subtitle regions
      createSubtitleRegions();
    }
    
    // Update current subtitle display
    if (wavesurfer) {
      currentSubtitle = findActiveSubtitle(wavesurfer.getCurrentTime());
    }
  }

  function removeSyncPoint(syncPointId: string) {
    syncPoints = syncPoints.filter(sp => sp.id !== syncPointId);
    
    // Auto-recalculate corrections with remaining sync points
    if (syncPoints.length > 0) {
      correctedSubtitles = applySyncCorrection(subtitles);
    } else {
      // No sync points left, clear corrected subtitles
      correctedSubtitles = [];
    }
    
    // Update waveform regions to reflect changes
    createSubtitleRegions();
    
    // Update current subtitle display
    if (wavesurfer) {
      currentSubtitle = findActiveSubtitle(wavesurfer.getCurrentTime());
    }
    
    // Remove the corresponding visual marker
    if (regionsPlugin) {
      regionsPlugin.clearRegions();
      // Recreate subtitle regions and remaining sync point markers
      createSubtitleRegions();
      syncPoints.forEach(sp => {
        regionsPlugin.addRegion({
          start: sp.audioTime,
          end: sp.audioTime + 0.1,
          color: '#ff0000aa',
          content: `🎯 Sync #${sp.subtitleId}`,
          drag: false,
          resize: false
        });
      });
    }
  }

  function calculateAverageOffset(): number {
    if (syncPoints.length === 0) return 0;
    
    const totalOffset = syncPoints.reduce((sum, sp) => {
      return sum + (sp.audioTime - sp.subtitleTime);
    }, 0);
    
    return totalOffset / syncPoints.length;
  }



  function applySyncCorrection(originalSubtitles: SubtitleEntry[]): SubtitleEntry[] {
    if (syncPoints.length < 2) {
      // Fall back to simple offset if we don't have enough sync points
      const offsetMs = syncPoints.length === 1 ? 
        Math.round((syncPoints[0].audioTime - syncPoints[0].subtitleTime) * 1000) : 0;
      
      return originalSubtitles.map(subtitle => {
        const startMs = parseTimestamp(subtitle.startTime) + offsetMs;
        const endMs = parseTimestamp(subtitle.endTime) + offsetMs;
        
        const adjustedStartMs = Math.max(0, startMs);
        const adjustedEndMs = Math.max(adjustedStartMs + 100, endMs);
        
        return {
          ...subtitle,
          startTime: formatTimestamp(adjustedStartMs),
          endTime: formatTimestamp(adjustedEndMs)
        };
      });
    }

    // Sort sync points by original time (subtitle time)
    const sortedSyncPoints = [...syncPoints].sort((a, b) => a.subtitleTime - b.subtitleTime);

    return originalSubtitles.map(subtitle => {
      const startTimeSeconds = convertSRTTimeToSeconds(subtitle.startTime);
      const endTimeSeconds = convertSRTTimeToSeconds(subtitle.endTime);

      // Apply interpolation to both start and end times
      const newStartTime = interpolateTime(startTimeSeconds, sortedSyncPoints);
      const newEndTime = interpolateTime(endTimeSeconds, sortedSyncPoints);

      return {
        ...subtitle,
        startTime: formatTimestamp(Math.round(newStartTime * 1000)),
        endTime: formatTimestamp(Math.round(newEndTime * 1000))
      };
    });
  }

  function interpolateTime(originalTime: number, sortedSyncPoints: typeof syncPoints): number {
    // If before first sync point, use linear extrapolation from first two points
    if (originalTime <= sortedSyncPoints[0].subtitleTime) {
      if (sortedSyncPoints.length >= 2) {
        const point1 = sortedSyncPoints[0];
        const point2 = sortedSyncPoints[1];
        const slope = (point2.audioTime - point1.audioTime) / (point2.subtitleTime - point1.subtitleTime);
        return point1.audioTime + slope * (originalTime - point1.subtitleTime);
      } else {
        const offset = sortedSyncPoints[0].audioTime - sortedSyncPoints[0].subtitleTime;
        return originalTime + offset;
      }
    }

    // If after last sync point, use linear extrapolation from last two points
    if (originalTime >= sortedSyncPoints[sortedSyncPoints.length - 1].subtitleTime) {
      if (sortedSyncPoints.length >= 2) {
        const point1 = sortedSyncPoints[sortedSyncPoints.length - 2];
        const point2 = sortedSyncPoints[sortedSyncPoints.length - 1];
        const slope = (point2.audioTime - point1.audioTime) / (point2.subtitleTime - point1.subtitleTime);
        return point2.audioTime + slope * (originalTime - point2.subtitleTime);
      } else {
        const offset = sortedSyncPoints[0].audioTime - sortedSyncPoints[0].subtitleTime;
        return originalTime + offset;
      }
    }

    // Find the two sync points that bracket this time for interpolation
    for (let i = 0; i < sortedSyncPoints.length - 1; i++) {
      const startPoint = sortedSyncPoints[i];
      const endPoint = sortedSyncPoints[i + 1];

      if (originalTime >= startPoint.subtitleTime && originalTime <= endPoint.subtitleTime) {
        // Linear interpolation between the two points
        const segmentOriginalDuration = endPoint.subtitleTime - startPoint.subtitleTime;
        const segmentTargetDuration = endPoint.audioTime - startPoint.audioTime;
        const progress = (originalTime - startPoint.subtitleTime) / segmentOriginalDuration;
        
        return startPoint.audioTime + progress * segmentTargetDuration;
      }
    }

    // Should never reach here, but fallback to no change
    return originalTime;
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

  function seekToTime() {
    if (!wavesurfer || !isAudioReady) return;
    
    try {
      // Parse the time input - handle both . and , as decimal separator
      const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})[.,](\d{3})$/;
      const match = timeInput.match(timeRegex);
      
      if (!match) {
        alert('Invalid time format. Please use HH:MM:SS.mmm (e.g., 00:01:23.500)');
        return;
      }
      
      const [, hours, minutes, seconds, milliseconds] = match;
      const totalSeconds = parseInt(hours) * 3600 + 
                          parseInt(minutes) * 60 + 
                          parseInt(seconds) + 
                          parseInt(milliseconds) / 1000;
      
      // Check if time is within audio duration
      const duration = wavesurfer.getDuration();
      if (totalSeconds > duration) {
        alert(`Time exceeds audio duration (${formatTimeWithDots(duration)})`);
        return;
      }
      
      // Seek to the specified time
      wavesurfer.seekTo(totalSeconds / duration);
    } catch (error) {
      console.error('Error seeking to time:', error);
      alert('Error seeking to specified time');
    }
  }

  function handleTimeInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      seekToTime();
    }
  }

  // Format time consistently with dots for input field
  function formatTimeWithDots(seconds: number): string {
    const totalMs = seconds * 1000;
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = Math.floor(totalMs % 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  // Get seek amount based on zoom level (more zoom = smaller seek steps)
  function getSeekAmount(): number {
    if (!wavesurfer) return 1;
    
    // At zoom 500, we want 50ms (0.05 seconds) movement
    // At zoom 100, we want 250ms (0.25 seconds) movement  
    // At zoom 1, we want 25000ms (25 seconds) movement
    // Formula: seekAmount = 25 / zoomLevel
    const seekAmount = Math.max(0.001, 25 / zoomLevel); // Min 1ms
    return seekAmount;
  }

  // Seek by a specific amount of seconds
  function seekByAmount(seconds: number) {
    if (!wavesurfer || !isAudioReady) return;
    
    const currentTime = wavesurfer.getCurrentTime();
    const duration = wavesurfer.getDuration();
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    
    wavesurfer.seekTo(newTime / duration);
    
    // Manually update the time input field for keyboard navigation
    timeInput = formatTimeWithDots(newTime);
    
    // Update current subtitle display
    currentSubtitle = findActiveSubtitle(newTime);
  }

  // Change zoom level with keyboard
  function changeZoom(deltaZoom: number) {
    const newZoom = Math.max(1, Math.min(500, zoomLevel + deltaZoom));
    zoomLevel = newZoom;
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
  <div 
    bind:this={waveformContainer} 
    class="waveform"
    class:waveform-selected={isWaveformSelected}
    tabindex="0"
    role="application"
    aria-label="Audio waveform - Click to select and use keyboard shortcuts for navigation"
    on:focus={() => isWaveformSelected = true}
    on:blur={() => isWaveformSelected = false}
    on:click={() => waveformContainer?.focus()}
    on:keydown={() => {}}
  ></div>
  
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

  <!-- Time Navigation -->
  <div class="time-navigation">
    <label for="time-input">Jump to time:</label>
    <input 
      id="time-input"
      type="text" 
      bind:value={timeInput}
      on:keydown={handleTimeInputKeydown}
      placeholder="00:00:00.000"
      class="time-input"
      disabled={!isAudioReady}
    />
    <button 
      class="seek-btn"
      on:click={seekToTime}
      disabled={!isAudioReady}
    >
      Go
    </button>
  </div>

  <!-- Sync Mode Controls -->
  {#if subtitles && subtitles.length > 0 && isAudioReady}
    <div class="sync-controls">
      <button 
        class="sync-toggle {isSyncMode ? 'active' : ''}"
        on:click={toggleSyncMode}
      >
        {isSyncMode ? '🎯 Exit Sync Mode' : '🎯 Enter Sync Mode'}
      </button>
      
      {#if isSyncMode}
        <div class="sync-instructions">
          <p><strong>🎯 Sync Workflow:</strong></p>
          <p>1️⃣ Navigate to where a subtitle should be (click/play waveform)</p>
          <p>2️⃣ Click "Create Sync Point" button below</p>
          <p>3️⃣ Search and select which subtitle belongs at this timing</p>
          <p><em>💡 Tip: Start with first and last subtitles for best results</em></p>
        </div>
        
        <div class="sync-current-position">
          <div class="position-info">
            <span class="current-time-display">Current Time: <strong>{currentTime}</strong></span>
            <span class="current-subtitle-display">
              {#if currentSubtitle}
                Playing: <strong>#{currentSubtitle.id}</strong> - {currentSubtitle.text.join(' ').substring(0, 60)}...
              {:else}
                <em>No subtitle at current time</em>
              {/if}
            </span>
          </div>
          <button 
            class="create-sync-btn"
            on:click={openSyncPointCreation}
            disabled={!isAudioReady}
          >
            🎯 Create Sync Point Here
          </button>
        </div>
      {/if}
      
      {#if syncPoints.length > 0}
        <div class="sync-points-summary">
          <span class="sync-count">{syncPoints.length} sync point{syncPoints.length === 1 ? '' : 's'} • Subtitles auto-corrected</span>
          <button class="download-sync-btn" on:click={downloadCorrectedSRT}>📥 Download Corrected SRT</button>
          <button class="clear-sync-btn" on:click={clearSyncPoints}>Clear All</button>
        </div>
        
        <div class="correction-info">
          <p><strong>� Live Corrections:</strong> 
            {#if syncPoints.length === 1}
              Simple offset applied: {Math.round((syncPoints[0].audioTime - syncPoints[0].subtitleTime) * 1000)}ms
            {:else if syncPoints.length > 1}
              Interpolated timing from {syncPoints.length} sync points
            {/if}
          </p>
          <p><em>Subtitle display now shows corrected timings. Add more sync points to improve accuracy.</em></p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Sync Points Management Panel -->
  {#if syncPoints.length > 0}
    <div class="sync-points-panel">
      <h4>🎯 Sync Points</h4>
      <div class="sync-points-list">
        {#each syncPoints as syncPoint (syncPoint.id)}
          <div class="sync-point-item">
            <div class="sync-point-info">
              <span class="subtitle-ref">Subtitle #{syncPoint.subtitleId}</span>
              <div class="timing-info">
                <span class="audio-time">Audio: {formatTimeSRT(syncPoint.audioTime)}</span>
                <span class="arrow">→</span>
                <span class="subtitle-time">Subtitle: {formatTimeSRT(syncPoint.subtitleTime)}</span>
              </div>
              <div class="offset-info">
                Offset: {((syncPoint.audioTime - syncPoint.subtitleTime) * 1000).toFixed(0)}ms
                ({syncPoint.audioTime > syncPoint.subtitleTime ? 'audio ahead' : 'audio behind'})
              </div>
            </div>
            <button 
              class="remove-sync-btn" 
              on:click={() => removeSyncPoint(syncPoint.id)}
              title="Remove sync point"
            >
              ❌
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Subtitle Selector Modal -->
  {#if showSubtitleSelector}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-overlay" on:click={closeSubtitleSelector}>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="subtitle-selector-modal" on:click|stopPropagation>
        <div class="modal-header">
          <h3>🎯 Create Sync Point at {formatTimeSRT(selectedAudioTime)}</h3>
          <button class="close-modal-btn" on:click={closeSubtitleSelector}>✕</button>
        </div>
        
        <div class="search-section">
          <input 
            type="text" 
            placeholder="Search subtitles by text or ID..."
            bind:value={searchQuery}
            on:input={filterSubtitles}
            class="search-input"
          />
        </div>
        
        <div class="subtitles-list">
          {#each filteredSubtitles as subtitle (subtitle.id)}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div 
              class="subtitle-option" 
              role="button"
              tabindex="0"
              on:click={() => selectSubtitleForSync(subtitle)}
              on:keydown={(e) => e.key === 'Enter' && selectSubtitleForSync(subtitle)}
            >
              <div class="subtitle-header">
                <span class="subtitle-number">#{subtitle.id}</span>
                <span class="subtitle-timing">{subtitle.startTime} → {subtitle.endTime}</span>
              </div>
              <div class="subtitle-preview">
                {subtitle.text.join(' ')}
              </div>
            </div>
          {/each}
        </div>
        
        {#if filteredSubtitles.length === 0 && searchQuery}
          <div class="no-results">
            No subtitles found matching "{searchQuery}"
          </div>
        {/if}
      </div>
    </div>
  {/if}

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
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .waveform:focus {
    outline: none;
  }

  .waveform-selected {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2), 
                0 0 20px rgba(79, 70, 229, 0.3);
    background: #fefefe;
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

  .time-navigation {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 6px;
    border: 2px solid #e2e8f0;
  }

  .time-navigation label {
    font-weight: 500;
    color: #475569;
    min-width: 100px;
  }

  .time-input {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    padding: 0.5rem;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    background: white;
    color: #1e293b;
    width: 150px;
    text-align: center;
  }

  .time-input:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
  }

  .time-input:disabled {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }

  .seek-btn {
    padding: 0.5rem 1rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .seek-btn:hover:not(:disabled) {
    background: #4338ca;
  }

  .seek-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  .sync-controls {
    margin: 1rem 0;
    padding: 1.5rem;
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
  }

  .sync-toggle {
    padding: 0.75rem 1.5rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .sync-toggle:hover {
    background: #4338ca;
    transform: translateY(-1px);
  }

  .sync-toggle.active {
    background: #dc2626;
    animation: pulse 2s infinite;
  }

  .sync-toggle.active:hover {
    background: #b91c1c;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  .sync-instructions {
    margin-top: 1rem;
    padding: 1rem;
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    border-radius: 4px;
  }

  .sync-instructions p {
    margin: 0.5rem 0;
    color: #92400e;
    font-weight: 500;
  }

  .sync-points-summary {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #ecfdf5;
    border-radius: 6px;
    border: 1px solid #10b981;
  }

  .sync-count {
    color: #065f46;
    font-weight: 600;
  }

  .clear-sync-btn {
    padding: 0.5rem 1rem;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .clear-sync-btn:hover {
    background: #4b5563;
  }

  .download-sync-btn {
    padding: 0.5rem 1rem;
    background: #059669;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .download-sync-btn:hover {
    background: #047857;
  }

  .correction-info {
    margin-top: 1rem;
    padding: 1rem;
    background: #ecfdf5;
    border: 2px solid #10b981;
    border-radius: 6px;
  }

  .correction-info p {
    margin: 0.25rem 0;
    color: #065f46;
  }

  .sync-current-position {
    margin-top: 1rem;
    padding: 1rem;
    background: #f0f9ff;
    border: 2px solid #0ea5e9;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .position-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .current-time-display {
    font-family: 'Courier New', monospace;
    font-size: 1.1rem;
    color: #0c4a6e;
  }

  .current-subtitle-display {
    font-size: 0.9rem;
    color: #475569;
  }

  .create-sync-btn {
    padding: 0.75rem 1.5rem;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .create-sync-btn:hover:not(:disabled) {
    background: #0284c7;
    transform: translateY(-1px);
  }

  .create-sync-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
  }

  .sync-points-panel {
    margin: 1rem 0;
    padding: 1.5rem;
    background: white;
    border: 2px solid #10b981;
    border-radius: 8px;
  }

  .sync-points-panel h4 {
    margin: 0 0 1rem 0;
    color: #065f46;
    font-size: 1.1rem;
  }

  .sync-points-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .sync-point-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
  }

  .sync-point-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .subtitle-ref {
    font-weight: 600;
    color: #065f46;
  }

  .timing-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }

  .audio-time {
    color: #dc2626;
    font-weight: 600;
  }

  .arrow {
    color: #6b7280;
  }

  .subtitle-time {
    color: #2563eb;
    font-weight: 600;
  }

  .offset-info {
    font-size: 0.75rem;
    color: #6b7280;
    font-style: italic;
  }

  .remove-sync-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .remove-sync-btn:hover {
    background: #fee2e2;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .subtitle-selector-modal {
    background: white;
    border-radius: 12px;
    padding: 0;
    max-width: 800px;
    max-height: 80vh;
    width: 90vw;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .modal-header h3 {
    margin: 0;
    color: #1e293b;
    font-size: 1.1rem;
  }

  .close-modal-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    color: #64748b;
    transition: all 0.2s;
  }

  .close-modal-btn:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  .search-section {
    padding: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .search-input:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .subtitles-list {
    max-height: 400px;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .subtitle-option {
    padding: 1rem;
    margin: 0.25rem 0;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .subtitle-option:hover {
    background: #f1f5f9;
    border-color: #4f46e5;
    transform: translateY(-1px);
  }

  .subtitle-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .subtitle-number {
    background: #4f46e5;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .subtitle-timing {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .subtitle-preview {
    color: #374151;
    line-height: 1.5;
  }

  .no-results {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    font-style: italic;
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