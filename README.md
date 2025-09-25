# WaveSync

A web-based tool for synchronizing subtitle files (SRT) with videos that have frame drops or timing issues. WaveSync visualizes audio waveforms alongside subtitles to help identify correct sync points and generate properly synchronized subtitle files.

## Current Tech Stack

- **Framework:** Svelte 5 with TypeScript
- **Build Tool:** Vite
- **Audio Processing:**
  - WaveSurfer.js for waveform visualization and interaction
  - Custom SRT parser with robust time format handling

## Project Status

✅ **Fully Functional** - Core subtitle synchronization problem solved!

### ✅ Implemented Features

- [x] SRT file parsing and display
- [x] Audio waveform visualization with interactive controls
- [x] Visual subtitle regions overlaid on waveform
- [x] Click-to-create sync points with real-time feedback
- [x] Linear interpolation algorithm for timing corrections
- [x] Real-time subtitle preview with automatic corrections
- [x] Non-linear timing adjustment via multiple sync points
- [x] Export of corrected SRT files
- [x] Keyboard navigation (spacebar, arrows) with zoom-aware seeking
- [x] Precise time input navigation (HH:MM:SS.mmm format)
- [x] Visual feedback system with color-coded regions
- [x] Accessibility compliance with ARIA attributes

## How to Use

1. **Load Audio**: Select an audio file to display the waveform
2. **Import SRT**: Load your subtitle file - subtitles appear as blue regions on the waveform
3. **Navigate**: Use playback controls, keyboard (spacebar/arrows), or time input to find misaligned subtitles
4. **Create Sync Points**: Click on the waveform where a subtitle should actually start - creates a green corrected region
5. **Automatic Corrections**: All other subtitles update automatically using interpolation
6. **Export**: Download your corrected SRT file when satisfied with the sync

### Keyboard Controls

- **Spacebar**: Play/pause audio
- **Left/Right Arrows**: Seek backward/forward (amount scales with zoom level)
- **Up/Down Arrows**: Zoom in/out
- **Click waveform**: Focus waveform for keyboard control (yellow glow indicates focus)

The app handles non-linear timing drift by interpolating corrections between your sync points, making it perfect for videos with frame drops or variable timing issues.

## Development Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run type checks
pnpm check

# Lint and format code
pnpm lint
pnpm format
```

## Project Structure

```
src/
├── components/     # Svelte components
├── lib/           # Utilities and shared functionality
├── stores/        # Svelte stores for state management
└── types/         # TypeScript type definitions
```

## Technical Details

## Technical Architecture

**Core Algorithm**: Linear interpolation between user-defined sync points

- Single sync point: Apply constant offset to all subtitles
- Multiple sync points: Interpolate corrections between points
- Extrapolation: Extend corrections beyond first/last sync point

**Key Components:**

- `SimpleWavePlayer.svelte`: Main waveform component with sync functionality
- `srt-parser.ts`: Robust SRT file parsing with multiple time format support
- `SubtitleDisplay.svelte`: Real-time subtitle display above waveform
- WaveSurfer.js integration with Regions and Hover plugins for interactive waveform

**Why Svelte over SvelteKit?**
This is a single-page audio processing tool that doesn't require routing or server-side features. The lighter Vite + Svelte setup provides faster development and simpler deployment for this specific use case.

**Accessibility Features:**

- Full keyboard navigation support
- ARIA attributes for screen readers
- Visual focus indicators
- Semantic HTML structure

## Implementation Status

### ✅ Completed

1. **Core Infrastructure**
   - [x] Project setup with Vite + Svelte + TypeScript
   - [x] Basic project structure
   - [x] SRT parser implementation with robust time format handling
   - [x] Waveform visualization with WaveSurfer.js
   - [x] Interactive regions plugin integration

2. **User Interface**
   - [x] Waveform display component with zoom controls
   - [x] Subtitle display component above waveform
   - [x] Sync point selection interface (click-to-create)
   - [x] Navigation controls (playback, keyboard, time input)
   - [x] Visual feedback system with color-coded regions
   - [x] Accessible keyboard controls with focus indicators

3. **Core Functionality**
   - [x] Audio analysis and visualization
   - [x] Subtitle timing adjustment with interpolation algorithm
   - [x] Sync point management with real-time updates
   - [x] Export functionality for corrected SRT files
   - [x] Non-linear timing drift correction
   - [x] Real-time subtitle corrections without manual apply steps

### 🎯 Future Enhancements (Optional)

While the core problem is solved, potential improvements could include:

- Batch processing for multiple files
- Advanced interpolation algorithms (spline, bezier)
- Video preview integration
- Sync point import/export
- Undo/redo functionality
- Enhanced UI/UX polish

## License

[MIT](LICENSE)
