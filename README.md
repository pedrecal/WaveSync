# WaveSync

A desktop application for synchronizing subtitle files (SRT) with videos that have frame drops or timing issues. WaveSync automatically extracts audio from video files and provides a professional waveform interface to create precise sync points for subtitle correction.

## Current Tech Stack

- **Framework:** Svelte 5 with TypeScript
- **Desktop Platform:** Electron with native system integration
- **Build Tool:** Vite
- **Audio Processing:**
  - Native FFmpeg for video-to-audio extraction
  - WaveSurfer.js for professional waveform visualization
  - Custom SRT parser with robust time format handling

## Project Status

✅ **Fully Functional** - Core subtitle synchronization problem solved!

### ✅ Implemented Features

**Desktop Integration:**

- [x] Native video file selection with system file dialogs
- [x] Automatic audio extraction from video files using FFmpeg
- [x] Progress tracking for video processing operations
- [x] Auto-detection and loading of companion subtitle files
- [x] Cross-platform compatibility (macOS, Windows, Linux)

**Professional Waveform Interface:**

- [x] High-quality audio waveform visualization
- [x] Advanced zoom controls (1x to 500x) with smooth navigation
- [x] SRT-formatted hover timestamps (HH:MM:SS,mmm)
- [x] Keyboard navigation with spacebar play/pause
- [x] Interactive subtitle regions overlaid on waveform

**Subtitle Synchronization:**

- [x] Click-to-create sync points with real-time feedback
- [x] Advanced interpolation algorithm for timing corrections
- [x] Non-linear timing adjustment via multiple sync points
- [x] Real-time preview of all subtitle corrections
- [x] Visual sync point markers on waveform

**File Management:**

- [x] SRT file parsing with comprehensive validation
- [x] Export corrected SRT files with native save dialogs
- [x] Import/export sync points as JSON for analysis
- [x] Autosave system with automatic recovery

**Translation Support:**

- [x] Integrated OpenAI translation service
- [x] Batch subtitle translation with progress tracking
- [x] Side-by-side original and translated subtitle display

## How to Use

### Quick Start Workflow

1. **Select Video**: Click "Select Video File" to choose your video - audio is automatically extracted with progress tracking
2. **Auto-Load Subtitles**: If a matching SRT file exists in the same directory, it's automatically loaded
3. **Visual Sync**: Subtitles appear as colored regions on the professional waveform display
4. **Create Sync Points**:
   - Enter "Sync Mode" to start creating correction points
   - Navigate to where a subtitle should actually start
   - Click "Create Sync Point" and select the correct subtitle from the searchable list
5. **Real-Time Corrections**: All subtitles update automatically using advanced interpolation
6. **Export Results**: Save your corrected SRT file using the native file dialog

### Advanced Features

- **Autosave**: Your work is automatically saved every 30 seconds - recovery prompt appears if previous work is detected
- **Translation**: Translate subtitles to different languages using the integrated translation service
- **Batch Operations**: Import/export sync points as JSON for analysis or sharing
- **Professional Navigation**: Zoom up to 500x for frame-accurate subtitle placement

### Keyboard Controls

- **Spacebar**: Play/pause audio
- **Left/Right Arrows**: Seek backward/forward (amount scales with zoom level)
- **Up/Down Arrows**: Zoom in/out
- **Click waveform**: Focus waveform for keyboard control (yellow glow indicates focus)

The app handles non-linear timing drift by interpolating corrections between your sync points, making it perfect for videos with frame drops or variable timing issues.

## Development Setup

### Prerequisites

- Node.js (18+ recommended)
- pnpm package manager
- FFmpeg installed system-wide (for Electron main process)

### Getting Started

```bash
# Install dependencies
pnpm install

# Development with hot reload
pnpm dev          # Start Vite dev server
pnpm electron:dev # Start Electron with dev server (in separate terminal)

# Production builds
pnpm build           # Build web assets
pnpm electron:build  # Build Electron app
pnpm electron:package # Package for distribution

# Development utilities
pnpm check    # TypeScript type checking
pnpm lint     # ESLint code analysis
pnpm format   # Prettier code formatting
pnpm test     # Run test suite

# Electron-specific commands
pnpm electron:start # Start Electron app directly
```

### Project Structure

```
├── electron/           # Electron main and preload processes
│   ├── main.cjs       # Main process (FFmpeg integration)
│   └── preload.cjs    # Preload script (secure IPC)
├── src/
│   ├── components/    # Svelte UI components
│   ├── lib/          # Utilities and services
│   ├── stores/       # State management with autosave
│   └── types/        # TypeScript definitions
└── test/             # Test files and samples
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

### Architecture Highlights

**Native Desktop Integration:**

- Electron provides access to native file systems and FFmpeg
- Secure IPC communication between renderer and main processes
- Cross-platform native file dialogs and system integration

**Why Svelte + Electron:**

- Svelte provides excellent performance for real-time waveform manipulation
- Electron enables native video processing without browser limitations
- TypeScript ensures type safety across the entire application stack

**Advanced Interpolation Algorithm:**

- Handles single sync points with constant offset correction
- Multiple sync points use linear interpolation between points
- Extrapolation extends corrections beyond first/last sync points
- Real-time preview of all timing adjustments

## Key Features

### Professional Workflow

- **Streamlined Video Processing**: One-click audio extraction from any video format
- **Intelligent File Detection**: Automatically finds and loads companion subtitle files
- **Visual Feedback**: Color-coded subtitle regions show original vs. corrected timings
- **Non-Destructive Editing**: Original files remain untouched, corrections applied on export

### Reliability & Recovery

- **Autosave System**: Automatic saving every 30 seconds prevents work loss
- **Recovery Notifications**: Simple recovery button when previous work is detected
- **Progress Tracking**: Real-time progress for long video processing operations
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Accessibility & Usability

- Full keyboard navigation support with visual focus indicators
- Professional zoom controls for frame-accurate subtitle placement
- Searchable subtitle interface for quick navigation
- Cross-platform compatibility (macOS, Windows, Linux)

## Supported Formats

- **Video Input**: MP4, MKV, AVI, MOV, WebM (any format supported by FFmpeg)
- **Audio Output**: MP3 (extracted automatically to system temp directory)
- **Subtitle Formats**: SRT (SubRip) with comprehensive validation
- **Export Formats**: Corrected SRT files, sync points JSON

## Future Enhancements

- Advanced interpolation algorithms (cubic spline, Bézier curves)
- Video preview integration alongside waveform
- Batch processing for multiple subtitle files
- Additional subtitle formats (VTT, ASS/SSA)
- Undo/redo system for sync operations
- Custom keyboard shortcuts and workspace presets

## License

[MIT](LICENSE)
