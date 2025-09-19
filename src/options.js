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
