<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { TranslationSettings, SupportedLanguage, GPTModel } from '../types/translation';
  import { LANGUAGE_NAMES, GPT_MODELS } from '../types/translation';
  import { 
    DEFAULT_TRANSLATION_SETTINGS, 
    TranslationSettingsManager,
    OpenAITranslationService 
  } from '../lib/translation-service';

  export let isOpen = false;
  export let settings: TranslationSettings = { ...DEFAULT_TRANSLATION_SETTINGS };

  const dispatch = createEventDispatcher<{
    save: { settings: TranslationSettings };
    close: void;
  }>();

  let apiKey = '';
  let targetLanguage = settings.targetLanguage;
  let model = settings.model;
  let batchSize = settings.batchSize;
  let maxRetries = settings.maxRetries;
  let customPrompt = settings.customPrompt || '';
  let isTestingConnection = false;
  let connectionTestResult: 'idle' | 'success' | 'error' = 'idle';
  let showApiKey = false;

  // Language options for dropdown - filter out short codes to avoid duplicates
  const languageOptions = Object.entries(LANGUAGE_NAMES).filter(([key]) => 
    !['es', 'fr', 'de', 'it', 'pt', 'pt-br', 'ja', 'ko', 'zh', 'ru', 'ar', 'hi', 'nl', 'sv', 'no', 'da', 'fi'].includes(key)
  );

  onMount(() => {
    // Load saved settings
    const savedSettings = TranslationSettingsManager.load();
    if (savedSettings.targetLanguage) targetLanguage = savedSettings.targetLanguage;
    if (savedSettings.model) model = savedSettings.model;
    if (savedSettings.batchSize) batchSize = savedSettings.batchSize;
    if (savedSettings.maxRetries) maxRetries = savedSettings.maxRetries;
    if (savedSettings.customPrompt) customPrompt = savedSettings.customPrompt;
  });

  function handleClose() {
    isOpen = false;
    connectionTestResult = 'idle';
    dispatch('close');
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      alert('Please enter your OpenAI API key');
      return;
    }

    if (!OpenAITranslationService.validateApiKey(apiKey)) {
      alert('Invalid API key format. API key should start with "sk-" followed by alphanumeric characters.');
      return;
    }

    const newSettings: TranslationSettings = {
      apiKey: apiKey.trim(),
      targetLanguage: targetLanguage as SupportedLanguage,
      model: model as GPTModel,
      batchSize,
      maxRetries,
      customPrompt: customPrompt.trim()
    };

    // Save settings (excluding API key for security)
    TranslationSettingsManager.save(newSettings);

    dispatch('save', { settings: newSettings });
    handleClose();
  }

  async function testConnection() {
    if (!apiKey.trim()) {
      alert('Please enter your API key first');
      return;
    }

    if (!OpenAITranslationService.validateApiKey(apiKey)) {
      alert('Invalid API key format');
      return;
    }

    isTestingConnection = true;
    connectionTestResult = 'idle';

    try {
      const testSettings: TranslationSettings = {
        ...settings,
        apiKey: apiKey.trim()
      };
      
      const service = new OpenAITranslationService(testSettings);
      const success = await service.testConnection();
      
      connectionTestResult = success ? 'success' : 'error';
    } catch (error) {
      console.error('Connection test failed:', error);
      connectionTestResult = 'error';
    } finally {
      isTestingConnection = false;
    }
  }

  function resetToDefaults() {
    apiKey = '';
    targetLanguage = DEFAULT_TRANSLATION_SETTINGS.targetLanguage;
    model = DEFAULT_TRANSLATION_SETTINGS.model;
    batchSize = DEFAULT_TRANSLATION_SETTINGS.batchSize;
    maxRetries = DEFAULT_TRANSLATION_SETTINGS.maxRetries;
    customPrompt = DEFAULT_TRANSLATION_SETTINGS.customPrompt || '';
    connectionTestResult = 'idle';
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-interactive-supports-focus -->
  <div class="modal-overlay" on:click={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="settings-title" tabindex="-1">
    <div class="modal-content" role="document">
      <header class="modal-header">
        <h2 id="settings-title">🌐 Translation Settings</h2>
        <button type="button" class="close-button" on:click={handleClose} aria-label="Close settings">
          ✕
        </button>
      </header>

      <div class="modal-body">
        <div class="settings-section">
          <label class="field-label" for="api-key">
            <span class="label-text">OpenAI API Key</span>
            <span class="required">*</span>
          </label>
          <div class="api-key-container">
            <input
              id="api-key"
              type={showApiKey ? 'text' : 'password'}
              bind:value={apiKey}
              placeholder="sk-..."
              class="api-key-input"
              autocomplete="off"
              spellcheck="false"
            />
            <button 
              type="button" 
              class="toggle-visibility"
              on:click={() => showApiKey = !showApiKey}
              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <p class="field-help">
            Your API key is not stored permanently for security. Should start with "sk-". Get one at 
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
              OpenAI Platform
            </a>
          </p>
          
          <div class="connection-test">
            <button 
              type="button" 
              class="test-button"
              on:click={testConnection}
              disabled={isTestingConnection || !apiKey.trim()}
            >
              {#if isTestingConnection}
                <span class="spinner"></span>
                Testing...
              {:else}
                Test Connection
              {/if}
            </button>
            
            {#if connectionTestResult === 'success'}
              <span class="test-result success">✅ Connection successful!</span>
            {:else if connectionTestResult === 'error'}
              <span class="test-result error">❌ Connection failed. Check your API key.</span>
            {/if}
          </div>
        </div>

        <div class="settings-section">
          <label class="field-label" for="target-language">Target Language</label>
          <select id="target-language" bind:value={targetLanguage} class="language-select">
            {#each languageOptions as [code, name]}
              <option value={code}>{name}</option>
            {/each}
          </select>
        </div>

        <div class="settings-section">
          <label class="field-label" for="gpt-model">GPT Model</label>
          <select id="gpt-model" bind:value={model} class="model-select">
            {#each Object.entries(GPT_MODELS) as [modelCode, modelName]}
              <option value={modelCode}>{modelName}</option>
            {/each}
          </select>
          <p class="field-help">
            <strong>gpt-4o-mini:</strong> Best balance of speed, cost, and quality (recommended)<br>
            <strong>gpt-4o:</strong> Higher quality, moderate cost<br>
            <strong>gpt-4-turbo:</strong> Highest quality, higher cost
          </p>
        </div>

        <div class="settings-row">
          <div class="settings-section">
            <label class="field-label" for="batch-size">Batch Size</label>
            <input
              id="batch-size"
              type="number"
              bind:value={batchSize}
              min="1"
              max="50"
              class="number-input"
            />
            <p class="field-help">Subtitles per API request (1-50). Higher = faster but more expensive.</p>
          </div>

          <div class="settings-section">
            <label class="field-label" for="max-retries">Max Retries</label>
            <input
              id="max-retries"
              type="number"
              bind:value={maxRetries}
              min="1"
              max="10"
              class="number-input"
            />
            <p class="field-help">Retry attempts for failed requests.</p>
          </div>
        </div>

        <div class="settings-section">
          <label class="field-label" for="custom-prompt">Custom Instructions (Optional)</label>
          <textarea
            id="custom-prompt"
            bind:value={customPrompt}
            placeholder="Add specific translation instructions here..."
            class="custom-prompt"
            rows="4"
          ></textarea>
          <p class="field-help">
            Additional instructions for the translator. For skate content, specialized prompts are automatically applied.
          </p>
        </div>

        <div class="info-box">
          <h4>💡 Speed Optimization Tips</h4>
          <ul>
            <li><strong>Batch Size:</strong> Use 10-20 for best speed/cost balance</li>
            <li><strong>API Model:</strong> We use GPT-4o-mini for optimal speed and cost</li>
            <li><strong>Skate Content:</strong> Specialized prompts preserve slang and terminology</li>
            <li><strong>Progress Tracking:</strong> Real-time updates during translation</li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="secondary-button" on:click={resetToDefaults}>
          Reset to Defaults
        </button>
        <div class="primary-buttons">
          <button type="button" class="cancel-button" on:click={handleClose}>
            Cancel
          </button>
          <button type="button" class="save-button" on:click={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem 1rem;
    border-bottom: 1px solid #f0f0f0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-button:hover {
    background: #f5f5f5;
    color: #333;
  }

  .modal-body {
    padding: 1.5rem 2rem;
  }

  .settings-section {
    margin-bottom: 1.5rem;
  }

  .settings-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .field-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
  }

  .label-text {
    margin-right: 0.25rem;
  }

  .required {
    color: #e74c3c;
  }

  .api-key-container {
    display: flex;
    align-items: center;
    position: relative;
  }

  .api-key-input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
    transition: border-color 0.2s;
  }

  .api-key-input:focus {
    outline: none;
    border-color: #0066cc;
  }

  .toggle-visibility {
    position: absolute;
    right: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
  }

  .connection-test {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .test-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .test-button:hover:not(:disabled) {
    background: #e9ecef;
  }

  .test-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #0066cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .test-result {
    font-size: 0.9rem;
    font-weight: 500;
  }

  .test-result.success {
    color: #28a745;
  }

  .test-result.error {
    color: #dc3545;
  }

  .language-select,
  .model-select,
  .number-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  .language-select:focus,
  .model-select:focus,
  .number-input:focus {
    outline: none;
    border-color: #0066cc;
  }

  .custom-prompt {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 1rem;
    resize: vertical;
    min-height: 100px;
    transition: border-color 0.2s;
  }

  .custom-prompt:focus {
    outline: none;
    border-color: #0066cc;
  }

  .field-help {
    margin: 0.5rem 0 0 0;
    font-size: 0.85rem;
    color: #666;
    line-height: 1.4;
  }

  .field-help a {
    color: #0066cc;
    text-decoration: none;
  }

  .field-help a:hover {
    text-decoration: underline;
  }

  .info-box {
    background: #f8f9fa;
    border-left: 4px solid #0066cc;
    padding: 1rem;
    border-radius: 0 6px 6px 0;
    margin-top: 1rem;
  }

  .info-box h4 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1rem;
  }

  .info-box ul {
    margin: 0;
    padding-left: 1.2rem;
  }

  .info-box li {
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
    color: #555;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem 1.5rem;
    border-top: 1px solid #f0f0f0;
  }

  .primary-buttons {
    display: flex;
    gap: 0.75rem;
  }

  .secondary-button,
  .cancel-button,
  .save-button {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-size: 1rem;
  }

  .secondary-button {
    background: #f8f9fa;
    color: #6c757d;
    border: 1px solid #dee2e6;
  }

  .secondary-button:hover {
    background: #e9ecef;
  }

  .cancel-button {
    background: #f8f9fa;
    color: #495057;
    border: 1px solid #dee2e6;
  }

  .cancel-button:hover {
    background: #e9ecef;
  }

  .save-button {
    background: #0066cc;
    color: white;
  }

  .save-button:hover {
    background: #0056b3;
  }

  @media (max-width: 640px) {
    .modal-content {
      margin: 0.5rem;
      max-height: 95vh;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding-left: 1rem;
      padding-right: 1rem;
    }

    .settings-row {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .modal-footer {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .primary-buttons {
      flex-direction: column;
    }
  }
</style>