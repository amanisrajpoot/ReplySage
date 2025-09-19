// Options page JavaScript
class ReplySageOptions {
  constructor() {
    this.settings = null
    this.init()
  }

  async init() {
    await this.loadSettings()
    this.setupEventListeners()
    this.updateUI()
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' })
      this.settings = response.settings
    } catch (error) {
      console.error('ReplySage: Failed to load settings:', error)
      this.settings = this.getDefaultSettings()
    }
  }

  getDefaultSettings() {
    return {
      enableLocalProcessing: true,
      enableCloudFallback: false,
      enablePIIRedaction: true,
      enableCaching: true,
      enableAnalytics: false,
      preferredTone: 'casual',
      maxSummaryLength: 200,
      enableThreadAnalysis: false,
      enableSimilaritySearch: false
    }
  }

  setupEventListeners() {
    // Checkbox changes
    document.getElementById('enableLocalProcessing').addEventListener('change', (e) => {
      this.settings.enableLocalProcessing = e.target.checked
      this.updateUI()
    })

    document.getElementById('enableCloudFallback').addEventListener('change', (e) => {
      this.settings.enableCloudFallback = e.target.checked
      this.updateUI()
    })

    document.getElementById('enablePIIRedaction').addEventListener('change', (e) => {
      this.settings.enablePIIRedaction = e.target.checked
    })

    document.getElementById('enableCaching').addEventListener('change', (e) => {
      this.settings.enableCaching = e.target.checked
    })

    document.getElementById('enableAnalytics').addEventListener('change', (e) => {
      this.settings.enableAnalytics = e.target.checked
    })

    document.getElementById('enableThreadAnalysis').addEventListener('change', (e) => {
      this.settings.enableThreadAnalysis = e.target.checked
    })

    document.getElementById('enableSimilaritySearch').addEventListener('change', (e) => {
      this.settings.enableSimilaritySearch = e.target.checked
    })

    // Select changes
    document.getElementById('preferredTone').addEventListener('change', (e) => {
      this.settings.preferredTone = e.target.value
    })

    // Range changes
    const summaryLengthRange = document.getElementById('maxSummaryLength')
    const summaryLengthValue = document.getElementById('summaryLengthValue')
    
    summaryLengthRange.addEventListener('input', (e) => {
      this.settings.maxSummaryLength = parseInt(e.target.value)
      summaryLengthValue.textContent = e.target.value
    })

    // API key changes
    document.getElementById('userApiKey').addEventListener('input', (e) => {
      this.settings.userApiKey = e.target.value
    })

    // Action buttons
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings()
    })

    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings()
    })

    document.getElementById('clearCache').addEventListener('click', () => {
      this.clearCache()
    })

    document.getElementById('exportData').addEventListener('click', () => {
      this.exportData()
    })

    document.getElementById('importData').addEventListener('click', () => {
      this.importData()
    })

    document.getElementById('manageModels').addEventListener('click', () => {
      this.openModelManager()
    })

    document.getElementById('manageCloudProviders').addEventListener('click', () => {
      this.openCloudProviderManager()
    })
  }

  updateUI() {
    // Update checkboxes
    document.getElementById('enableLocalProcessing').checked = this.settings.enableLocalProcessing
    document.getElementById('enableCloudFallback').checked = this.settings.enableCloudFallback
    document.getElementById('enablePIIRedaction').checked = this.settings.enablePIIRedaction
    document.getElementById('enableCaching').checked = this.settings.enableCaching
    document.getElementById('enableAnalytics').checked = this.settings.enableAnalytics
    document.getElementById('enableThreadAnalysis').checked = this.settings.enableThreadAnalysis
    document.getElementById('enableSimilaritySearch').checked = this.settings.enableSimilaritySearch

    // Update select
    document.getElementById('preferredTone').value = this.settings.preferredTone

    // Update range
    document.getElementById('maxSummaryLength').value = this.settings.maxSummaryLength
    document.getElementById('summaryLengthValue').textContent = this.settings.maxSummaryLength

    // Update API key
    document.getElementById('userApiKey').value = this.settings.userApiKey || ''

    // Show/hide API key section based on cloud fallback
    const apiKeySection = document.getElementById('apiKeySection')
    if (this.settings.enableCloudFallback) {
      apiKeySection.style.display = 'block'
    } else {
      apiKeySection.style.display = 'none'
    }
  }

  async saveSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: this.settings
      })

      if (response.success) {
        this.showNotification('Settings saved successfully!', 'success')
      } else {
        this.showNotification('Failed to save settings', 'error')
      }
    } catch (error) {
      console.error('ReplySage: Error saving settings:', error)
      this.showNotification('Failed to save settings', 'error')
    }
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      this.settings = this.getDefaultSettings()
      this.updateUI()
      await this.saveSettings()
      this.showNotification('Settings reset to defaults', 'success')
    }
  }

  async clearCache() {
    if (confirm('Are you sure you want to clear all cached data? This will remove all stored analysis results.')) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' })
        
        if (response.success) {
          this.showNotification(`Cleared ${response.cleared} cached items`, 'success')
        } else {
          this.showNotification('Failed to clear cache', 'error')
        }
      } catch (error) {
        console.error('ReplySage: Error clearing cache:', error)
        this.showNotification('Failed to clear cache', 'error')
      }
    }
  }

  async exportData() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ANALYSIS_HISTORY' })
      
      if (response.success) {
        const data = {
          settings: this.settings,
          analyses: response.analyses,
          exportDate: new Date().toISOString(),
          version: '1.0.0'
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `replysage-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        this.showNotification('Data exported successfully!', 'success')
      } else {
        this.showNotification('Failed to export data', 'error')
      }
    } catch (error) {
      console.error('ReplySage: Error exporting data:', error)
      this.showNotification('Failed to export data', 'error')
    }
  }

  importData() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        if (data.version && data.settings) {
          this.settings = { ...this.settings, ...data.settings }
          this.updateUI()
          await this.saveSettings()
          this.showNotification('Data imported successfully!', 'success')
        } else {
          this.showNotification('Invalid data format', 'error')
        }
      } catch (error) {
        console.error('ReplySage: Error importing data:', error)
        this.showNotification('Failed to import data', 'error')
      }
    }

    input.click()
  }

  openModelManager() {
    // Create and show the model manager modal
    const modal = document.createElement('div')
    modal.id = 'model-manager-modal'
    modal.innerHTML = `
      <div class="model-manager-overlay">
        <div class="model-manager-modal">
          <div class="model-manager-header">
            <h2>AI Model Manager</h2>
            <button class="close-button" onclick="this.closest('.model-manager-overlay').remove()">×</button>
          </div>
          <div class="model-manager-content">
            <div id="model-manager-content">
              <p>Loading model information...</p>
            </div>
          </div>
        </div>
      </div>
    `
    
    // Add styles
    const style = document.createElement('link')
    style.rel = 'stylesheet'
    style.href = 'components/ModelManager.css'
    document.head.appendChild(style)
    
    document.body.appendChild(modal)
    
    // Load model information
    this.loadModelManagerContent()
  }

  async loadModelManagerContent() {
    const content = document.getElementById('model-manager-content')
    if (!content) return

    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ASSET_STATUS' })
      
      if (response.success) {
        this.renderModelManager(response.assets, response.storageUsage)
      } else {
        content.innerHTML = '<p class="error-message">Failed to load model information</p>'
      }
    } catch (error) {
      console.error('ReplySage: Failed to load model manager content:', error)
      content.innerHTML = '<p class="error-message">Failed to load model information</p>'
    }
  }

  renderModelManager(assets, storageUsage) {
    const content = document.getElementById('model-manager-content')
    if (!content) return

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getModelDisplayName = (name) => {
      const names = {
        'summarizer': 'Text Summarizer',
        'text-generator': 'Text Generator',
        'embeddings': 'Embeddings Model',
        'sentiment': 'Sentiment Analyzer'
      }
      return names[name] || name
    }

    const getModelDescription = (name) => {
      const descriptions = {
        'summarizer': 'Generates concise summaries of email content',
        'text-generator': 'Creates suggested replies and text completions',
        'embeddings': 'Creates semantic embeddings for similarity search',
        'sentiment': 'Analyzes email sentiment (positive, negative, neutral)'
      }
      return descriptions[name] || 'AI model for email processing'
    }

    let html = ''

    if (storageUsage) {
      html += `
        <div class="storage-info">
          <h3>Storage Usage</h3>
          <div class="storage-stats">
            <div class="stat">
              <span class="label">Downloaded Models:</span>
              <span class="value">${storageUsage.downloadedAssets}</span>
            </div>
            <div class="stat">
              <span class="label">Total Size:</span>
              <span class="value">${formatFileSize(storageUsage.totalSize)}</span>
            </div>
            <div class="stat">
              <span class="label">Available Space:</span>
              <span class="value">${formatFileSize(storageUsage.availableSpace)}</span>
            </div>
          </div>
        </div>
      `
    }

    html += `
      <div class="models-section">
        <div class="models-header">
          <h3>Available Models</h3>
          <button id="download-all-models" class="download-all-button">
            Download All
          </button>
        </div>
        <div class="models-list">
    `

    assets.forEach(asset => {
      html += `
        <div class="model-item">
          <div class="model-info">
            <h4>${getModelDisplayName(asset.name)}</h4>
            <p class="model-description">${getModelDescription(asset.name)}</p>
            <div class="model-details">
              <span class="size">${formatFileSize(asset.size)}</span>
              ${asset.downloaded ? 
                '<span class="status downloaded">Downloaded</span>' : 
                '<span class="status not-downloaded">Not Downloaded</span>'
              }
            </div>
          </div>
          <div class="model-actions">
            ${asset.downloaded ? 
              '<span class="downloaded-indicator">✓</span>' :
              `<button class="download-button" data-model="${asset.name}">Download</button>`
            }
          </div>
        </div>
      `
    })

    html += `
        </div>
      </div>
      <div class="model-manager-footer">
        <p class="info-text">
          Models are downloaded and stored locally for privacy. 
          They enable offline AI processing of your emails.
        </p>
      </div>
    `

    content.innerHTML = html

    // Add event listeners
    document.getElementById('download-all-models')?.addEventListener('click', () => {
      this.downloadAllModels()
    })

    document.querySelectorAll('.download-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const modelName = e.target.getAttribute('data-model')
        this.downloadModel(modelName)
      })
    })
  }

  async downloadModel(modelName) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_MODELS',
        payload: [modelName]
      })

      if (response.success) {
        this.showNotification(`Downloading ${modelName}...`, 'info')
        // Reload the model manager content
        setTimeout(() => this.loadModelManagerContent(), 1000)
      } else {
        this.showNotification(`Failed to download ${modelName}`, 'error')
      }
    } catch (error) {
      console.error('ReplySage: Failed to download model:', error)
      this.showNotification(`Failed to download ${modelName}`, 'error')
    }
  }

  async downloadAllModels() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_MODELS',
        payload: []
      })

      if (response.success) {
        this.showNotification('Downloading all models...', 'info')
        // Reload the model manager content
        setTimeout(() => this.loadModelManagerContent(), 1000)
      } else {
        this.showNotification('Failed to download models', 'error')
      }
    } catch (error) {
      console.error('ReplySage: Failed to download models:', error)
      this.showNotification('Failed to download models', 'error')
    }
  }

  openCloudProviderManager() {
    // Create and show the cloud provider manager modal
    const modal = document.createElement('div')
    modal.id = 'cloud-provider-manager-modal'
    modal.innerHTML = `
      <div class="cloud-provider-manager-overlay">
        <div class="cloud-provider-manager-modal">
          <div class="cloud-provider-manager-header">
            <h2>Cloud Provider Manager</h2>
            <button class="close-button" onclick="this.closest('.cloud-provider-manager-overlay').remove()">×</button>
          </div>
          <div class="cloud-provider-manager-content">
            <div id="cloud-provider-manager-content">
              <p>Loading cloud providers...</p>
            </div>
          </div>
        </div>
      </div>
    `
    
    // Add styles
    const style = document.createElement('link')
    style.rel = 'stylesheet'
    style.href = 'components/CloudProviderSettings.css'
    document.head.appendChild(style)
    
    document.body.appendChild(modal)
    
    // Load cloud provider information
    this.loadCloudProviderManagerContent()
  }

  async loadCloudProviderManagerContent() {
    const content = document.getElementById('cloud-provider-manager-content')
    if (!content) return

    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CLOUD_PROVIDERS' })
      
      if (response.success) {
        this.renderCloudProviderManager(response.providers)
      } else {
        content.innerHTML = '<p class="error-message">Failed to load cloud providers</p>'
      }
    } catch (error) {
      console.error('ReplySage: Failed to load cloud provider manager content:', error)
      content.innerHTML = '<p class="error-message">Failed to load cloud providers</p>'
    }
  }

  renderCloudProviderManager(providers) {
    const content = document.getElementById('cloud-provider-manager-content')
    if (!content) return

    let html = `
      <div class="providers-section">
        <div class="providers-header">
          <h3>Configured Providers</h3>
          <button id="add-provider" class="add-provider-button">
            + Add Provider
          </button>
        </div>
        <div class="providers-list">
    `

    if (providers.length === 0) {
      html += `
        <div class="no-providers">
          <p>No cloud providers configured yet.</p>
          <p>Add a provider to enable cloud AI processing.</p>
        </div>
      `
    } else {
      providers.forEach(provider => {
        html += `
          <div class="provider-item">
            <div class="provider-info">
              <h4>${provider.toUpperCase()}</h4>
              <p>Configured and ready</p>
            </div>
            <div class="provider-actions">
              <button class="test-button" data-provider="${provider}">Test</button>
              <button class="remove-button" data-provider="${provider}">Remove</button>
            </div>
          </div>
        `
      })
    }

    html += `
        </div>
      </div>
      <div class="cloud-provider-manager-footer">
        <p class="info-text">
          Cloud providers use your own API keys for enhanced AI processing.
          Your data is sent directly to the provider - we never see it.
        </p>
      </div>
    `

    content.innerHTML = html

    // Add event listeners
    document.getElementById('add-provider')?.addEventListener('click', () => {
      this.openCloudProviderSettings()
    })

    document.querySelectorAll('.test-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const provider = e.target.getAttribute('data-provider')
        this.testCloudProvider(provider)
      })
    })

    document.querySelectorAll('.remove-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const provider = e.target.getAttribute('data-provider')
        this.removeCloudProvider(provider)
      })
    })
  }

  openCloudProviderSettings(existingProvider = null) {
    const modal = document.createElement('div')
    modal.id = 'cloud-provider-settings-modal'
    modal.innerHTML = `
      <div class="cloud-provider-overlay">
        <div class="cloud-provider-modal">
          <div class="cloud-provider-header">
            <h2>${existingProvider ? 'Edit' : 'Add'} Cloud Provider</h2>
            <button class="close-button" onclick="this.closest('.cloud-provider-overlay').remove()">×</button>
          </div>
          <div class="cloud-provider-content">
            <div class="form-group">
              <label for="provider-name">Provider</label>
              <select id="provider-name" ${existingProvider ? 'disabled' : ''}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="azure">Azure OpenAI</option>
              </select>
            </div>
            <div class="form-group">
              <label for="api-key">API Key</label>
              <input id="api-key" type="password" placeholder="Enter your API key" />
              <small class="help-text">Your API key is encrypted and stored locally.</small>
            </div>
            <div class="form-group" id="base-url-group" style="display: none;">
              <label for="base-url">Base URL</label>
              <input id="base-url" type="url" placeholder="https://your-resource.openai.azure.com" />
              <small class="help-text">Your Azure OpenAI endpoint URL</small>
            </div>
            <div class="form-group">
              <label for="model">Model</label>
              <select id="model">
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="max-tokens">Max Tokens</label>
                <input id="max-tokens" type="number" value="1000" min="100" max="4000" />
              </div>
              <div class="form-group">
                <label for="temperature">Temperature</label>
                <input id="temperature" type="range" min="0" max="1" step="0.1" value="0.7" />
                <div class="range-value">0.7</div>
              </div>
            </div>
            <div id="test-result"></div>
          </div>
          <div class="cloud-provider-footer">
            <button id="test-connection" class="test-button">Test Connection</button>
            <div class="footer-actions">
              <button class="cancel-button">Cancel</button>
              <button class="save-button">Save Provider</button>
            </div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Add event listeners
    this.setupCloudProviderSettingsEvents(existingProvider)
  }

  setupCloudProviderSettingsEvents(existingProvider) {
    const providerSelect = document.getElementById('provider-name')
    const baseUrlGroup = document.getElementById('base-url-group')
    const temperatureSlider = document.getElementById('temperature')
    const rangeValue = document.querySelector('.range-value')
    const testButton = document.getElementById('test-connection')
    const saveButton = document.querySelector('.save-button')
    const cancelButton = document.querySelector('.cancel-button')

    // Provider change handler
    providerSelect.addEventListener('change', (e) => {
      const provider = e.target.value
      const modelSelect = document.getElementById('model')
      
      // Show/hide base URL for Azure
      if (provider === 'azure') {
        baseUrlGroup.style.display = 'block'
      } else {
        baseUrlGroup.style.display = 'none'
      }
      
      // Update model options
      const models = {
        openai: [
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ],
        anthropic: [
          { value: 'claude-3-opus', label: 'Claude 3 Opus' },
          { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
        ],
        azure: [
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' }
        ]
      }
      
      modelSelect.innerHTML = models[provider].map(model => 
        `<option value="${model.value}">${model.label}</option>`
      ).join('')
    })

    // Temperature slider handler
    temperatureSlider.addEventListener('input', (e) => {
      rangeValue.textContent = e.target.value
    })

    // Test connection handler
    testButton.addEventListener('click', () => {
      this.testCloudProviderConnection()
    })

    // Save handler
    saveButton.addEventListener('click', () => {
      this.saveCloudProvider()
    })

    // Cancel handler
    cancelButton.addEventListener('click', () => {
      document.getElementById('cloud-provider-settings-modal').remove()
    })
  }

  async testCloudProviderConnection() {
    const testButton = document.getElementById('test-connection')
    const testResult = document.getElementById('test-result')
    
    testButton.textContent = 'Testing...'
    testButton.disabled = true
    testResult.innerHTML = ''

    try {
      const provider = {
        name: document.getElementById('provider-name').value,
        apiKey: document.getElementById('api-key').value,
        model: document.getElementById('model').value,
        maxTokens: parseInt(document.getElementById('max-tokens').value),
        temperature: parseFloat(document.getElementById('temperature').value),
        baseUrl: document.getElementById('base-url').value || undefined
      }

      const response = await chrome.runtime.sendMessage({
        type: 'TEST_CLOUD_PROVIDER',
        payload: provider
      })

      if (response.success) {
        testResult.innerHTML = '<div class="test-result success">Connection successful!</div>'
      } else {
        testResult.innerHTML = `<div class="test-result error">Test failed: ${response.error}</div>`
      }
    } catch (error) {
      testResult.innerHTML = `<div class="test-result error">Test failed: ${error.message}</div>`
    } finally {
      testButton.textContent = 'Test Connection'
      testButton.disabled = false
    }
  }

  async saveCloudProvider() {
    try {
      const provider = {
        name: document.getElementById('provider-name').value,
        apiKey: document.getElementById('api-key').value,
        model: document.getElementById('model').value,
        maxTokens: parseInt(document.getElementById('max-tokens').value),
        temperature: parseFloat(document.getElementById('temperature').value),
        baseUrl: document.getElementById('base-url').value || undefined
      }

      const response = await chrome.runtime.sendMessage({
        type: 'ADD_CLOUD_PROVIDER',
        payload: provider
      })

      if (response.success) {
        this.showNotification('Cloud provider added successfully', 'success')
        document.getElementById('cloud-provider-settings-modal').remove()
        this.loadCloudProviderManagerContent()
      } else {
        this.showNotification(`Failed to add provider: ${response.error}`, 'error')
      }
    } catch (error) {
      this.showNotification(`Failed to add provider: ${error.message}`, 'error')
    }
  }

  async testCloudProvider(providerName) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_CLOUD_PROVIDER',
        payload: { name: providerName }
      })

      if (response.success) {
        this.showNotification(`${providerName} connection successful`, 'success')
      } else {
        this.showNotification(`${providerName} test failed: ${response.error}`, 'error')
      }
    } catch (error) {
      this.showNotification(`Test failed: ${error.message}`, 'error')
    }
  }

  async removeCloudProvider(providerName) {
    if (!confirm(`Are you sure you want to remove ${providerName}?`)) {
      return
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REMOVE_CLOUD_PROVIDER',
        payload: providerName
      })

      if (response.success) {
        this.showNotification(`${providerName} removed successfully`, 'success')
        this.loadCloudProviderManagerContent()
      } else {
        this.showNotification(`Failed to remove provider: ${response.error}`, 'error')
      }
    } catch (error) {
      this.showNotification(`Failed to remove provider: ${error.message}`, 'error')
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '6px',
      color: 'white',
      fontWeight: '500',
      zIndex: '10000',
      opacity: '0',
      transform: 'translateX(100%)',
      transition: 'all 0.3s ease'
    })

    // Set background color based on type
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6'
    }
    notification.style.backgroundColor = colors[type] || colors.info

    // Add to page
    document.body.appendChild(notification)

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1'
      notification.style.transform = 'translateX(0)'
    }, 100)

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0'
      notification.style.transform = 'translateX(100%)'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ReplySageOptions()
})
