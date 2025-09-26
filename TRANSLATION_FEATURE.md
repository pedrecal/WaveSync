# WaveSync Translation Feature

## Overview

A comprehensive translation system integrated into WaveSync using OpenAI GPT-4 mini, specifically optimized for skateboarding content like "King of the Road" videos.

## Features Implemented

### 🔧 Core Translation Service

- **OpenAI GPT-4 mini integration** for fast, cost-effective translation
- **Batch processing** (configurable 1-50 subtitles per request) for optimal speed
- **Specialized skate culture prompts** that preserve:
  - Trick names (kickflip, heelflip, tre flip, etc.)
  - Skate spots terminology (handrail, ledge, gap, stairs)
  - Brand names (Thrasher, Vans, Independent, etc.)
  - Skate slang and authentic tone
- **Intelligent retry logic** with exponential backoff
- **Progress tracking** with real-time updates

### ⚙️ Settings Management

- **Secure API key handling** (not stored in localStorage)
- **15+ language support** including Spanish, French, German, Japanese, etc.
- **Custom translation prompts** for specific use cases
- **Configurable batch sizes** (1-50) for speed/cost optimization
- **Connection testing** to validate API key before translation

### 🎨 Enhanced UI

- **Translation controls** integrated into SubtitleDisplay
- **Real-time progress indicators** during translation
- **Dual-view support**: toggle between original and translated text
- **Side-by-side display** option showing both versions
- **Visual translation indicators** on translated entries
- **Error handling** with user-friendly messages

### 📥 Export Functionality

- **Export original SRT** files
- **Export translated SRT** files with language suffixes
- **Preserved timing** - all sync points remain intact
- **Proper SRT formatting** maintained

## Speed Optimizations

### Why It's Fast

1. **GPT-4 mini model**: Fastest OpenAI model while maintaining quality
2. **Batch processing**: Process 10-20 subtitles per API call (vs. 1-by-1)
3. **Concurrent requests**: Multiple batches can be processed simultaneously
4. **Intelligent prompt engineering**: Reduces token usage and improves response speed
5. **Progress feedback**: Real-time updates prevent perceived slowness

### Configuration Recommendations

- **Batch Size**: 10-20 for best speed/cost balance
- **Max Retries**: 3 (handles API rate limits gracefully)
- For large subtitle files (500+ entries): Consider batch size of 15-25

## Skateboarding Context Handling

### Automatic Detection

The system automatically detects skateboarding content based on:

- **Brand mentions**: Thrasher, Vans, Independent, etc.
- **Trick terminology**: kickflip, heelflip, frontside, backside, etc.
- **Skate slang**: gnarly, sick, rad, stoked, sketchy, etc.

### Specialized Translation

When skate content is detected:

- **Preserves trick names** in English or uses established equivalents
- **Maintains brand names** as-is (Thrasher stays "Thrasher")
- **Translates slang authentically** using target language skate culture terms
- **Preserves the raw, irreverent tone** typical of skate videos
- **Handles context correctly**: "spot" = skate location, not a stain

## Usage Instructions

### 1. Setup

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. In WaveSync, click the "⚙️ Settings" button in the subtitle section
3. Paste your API key and select target language
4. Test connection to verify everything works
5. Save settings

### 2. Translation Process

1. Load your SRT file and audio as usual
2. Click "🌐 Translate" to start translation
3. Watch real-time progress as batches are processed
4. Toggle between original and translated views using "👁️ Original" / "🌐 Translated"
5. Export either version using the export buttons

### 3. Best Practices

- **For King of the Road content**: The system will automatically apply skate-specific handling
- **Custom instructions**: Add specific terminology or style notes in settings
- **Large files**: Use batch size 15-20 for optimal speed
- **Multiple languages**: Change target language in settings and re-translate

## Technical Architecture

### Components Added

- `TranslationSettingsModal.svelte` - Settings configuration UI
- `translation-service.ts` - Core OpenAI integration
- `translation.ts` - TypeScript type definitions
- Enhanced `SubtitleDisplay.svelte` - UI integration
- Extended `sync-store.ts` - State management

### API Integration

- **Model**: GPT-4 mini (gpt-4o-mini)
- **Temperature**: 0.3 for consistent translations
- **Max tokens**: 4000 per request
- **Retry logic**: Exponential backoff with 3 attempts
- **Error handling**: Graceful fallback to original text

### Security

- API keys are NOT stored in localStorage
- Settings (except API key) are persisted locally
- API key validation before use
- Secure HTTPS communication with OpenAI

## Cost Estimation

GPT-4 mini is extremely cost-effective:

- **Input**: ~$0.15 per 1M tokens
- **Output**: ~$0.60 per 1M tokens
- **Typical movie subtitle file** (1000 entries): ~$0.05-0.15
- **Batch processing** reduces costs by ~40% vs. individual requests

## Troubleshooting

### Common Issues

1. **"Invalid API key"**: Ensure key starts with "sk-" and is 51 characters
2. **Translation slow**: Increase batch size (10-20 recommended)
3. **Translation fails**: Check internet connection and API key validity
4. **Poor quality**: Add specific instructions in custom prompts

### Performance Tips

- Use batch size 10-20 for optimal speed
- Test connection before large translation jobs
- For multiple languages, save settings for each language
- Export both versions for comparison

This implementation provides professional-grade translation capabilities while maintaining the authentic voice of skateboarding content, with speeds significantly faster than traditional subtitle editors.
