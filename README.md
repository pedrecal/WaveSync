# WaveSync

A web-based tool for synchronizing subtitle files (SRT) with videos that have frame drops or timing issues. WaveSync visualizes audio waveforms alongside subtitles to help identify correct sync points and generate properly synchronized subtitle files.

## Current Tech Stack

- **Framework:** Svelte 5 with TypeScript
- **Build Tool:** Vite
- **Audio Processing:**
  - WaveSurfer.js for waveform visualization
  - FFmpeg.wasm for audio extraction and processing

## Project Status

🚧 **Currently in Development** 🚧

### Planned Features

- [ ] SRT file parsing and display
- [ ] Audio waveform visualization
- [ ] Sync point management
- [ ] Real-time subtitle preview
- [ ] Non-linear timing adjustment
- [ ] Export of corrected SRT files
- [ ] Export of sync points JSON for analysis

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

**Why use this over SvelteKit?**

- It brings its own routing solution which might not be preferable for some users.
- It is first and foremost a framework that just happens to use Vite under the hood, not a Vite app.

This template contains as little as possible to get started with Vite + TypeScript + Svelte, while taking into account the developer experience with regards to HMR and intellisense. It demonstrates capabilities on par with the other `create-vite` templates and is a good starting point for beginners dipping their toes into a Vite + Svelte project.

Should you later need the extended capabilities and extensibility provided by SvelteKit, the template has been structured similarly to SvelteKit so that it is easy to migrate.

**Why `global.d.ts` instead of `compilerOptions.types` inside `jsconfig.json` or `tsconfig.json`?**

Setting `compilerOptions.types` shuts out all other types not explicitly listed in the configuration. Using triple-slash references keeps the default TypeScript setting of accepting type information from the entire workspace, while also adding `svelte` and `vite/client` type information.

**Why include `.vscode/extensions.json`?**

Other templates indirectly recommend extensions via the README, but this file allows VS Code to prompt the user to install the recommended extension upon opening the project.

**Why enable `allowJs` in the TS template?**

While `allowJs: false` would indeed prevent the use of `.js` files in the project, it does not prevent the use of JavaScript syntax in `.svelte` files. In addition, it would force `checkJs: false`, bringing the worst of both worlds: not being able to guarantee the entire codebase is TypeScript, and also having worse typechecking for the existing JavaScript. In addition, there are valid use cases in which a mixed codebase may be relevant.

**Why is HMR not preserving my local component state?**

HMR state preservation comes with a number of gotchas! It has been disabled by default in both `svelte-hmr` and `@sveltejs/vite-plugin-svelte` due to its often surprising behavior. You can read the details [here](https://github.com/rixo/svelte-hmr#svelte-hmr).

If you have state that's important to retain within a component, consider creating an external store which would not be replaced by HMR.

## TODO

1. Core Infrastructure
   - [x] Project setup with Vite + Svelte + TypeScript
   - [x] Basic project structure
   - [ ] SRT parser implementation
   - [ ] Audio extraction setup with FFmpeg.wasm
   - [ ] Waveform visualization with WaveSurfer.js

2. User Interface
   - [ ] Waveform display component
   - [ ] Subtitle display component
   - [ ] Sync point selection interface
   - [ ] Navigation controls

3. Core Functionality
   - [ ] Audio analysis and visualization
   - [ ] Subtitle timing adjustment
   - [ ] Sync point management
   - [ ] Export functionality

## License

[MIT](LICENSE)
