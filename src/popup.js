// Popup JavaScript
class ReplySagePopup {
  constructor() {
    this.settings = null
    this.stats = {
      emailsAnalyzed: 0,
      actionItemsFound: 0,
      repliesGenerated: 0
    }
    this.init()
  }

  async init() {
    await this.loadSettings()
    await this.loadStats()
    this.setupEventListeners()
    this.updateUI()
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' })
      this.settings = response.settings
    } catch (error) {
      console.error('ReplySage: Failed to load settings:', error)
    }
  }

  async loadStats() {
    try {
      // Load stats from storage
      const stored = await chrome.storage.local.get(['replysage_stats'])
      this.stats = stored.replysage_stats || this.stats
    } catch (error) {
      console.error('ReplySage: Failed to load stats:', error)
    }
  }

  async saveStats() {
    try {
      await chrome.storage.local.set({ replysage_stats: this.stats })
    } catch (error) {
      console.error('ReplySage: Failed to save stats:', error)
    }
  }

  setupEventListeners() {
    document.getElementById('analyzeCurrent').addEventListener('click', () => {
      this.analyzeCurrentEmail()
    })

    document.getElementById('openSettings').addEventListener('click', () => {
      this.openSettings()
    })

    document.getElementById('openOptions').addEventListener('click', (e) => {
      e.preventDefault()
      this.openSettings()
    })

    document.getElementById('openHelp').addEventListener('click', (e) => {
      e.preventDefault()
      this.openHelp()
    })

    document.getElementById('openAbout').addEventListener('click', (e) => {
      e.preventDefault()
      this.openAbout()
    })
  }

  updateUI() {
    // Update status indicator
    const statusIndicator = document.getElementById('statusIndicator')
    const statusDot = statusIndicator.querySelector('.status-dot')
    const statusText = statusIndicator.querySelector('.status-text')
    
    if (this.settings && this.settings.enableLocalProcessing) {
      statusText.textContent = 'Local Processing Enabled'
      statusDot.className = 'status-dot'
    } else if (this.settings && this.settings.enableCloudFallback) {
      statusText.textContent = 'Cloud Fallback Enabled'
      statusDot.className = 'status-dot'
    } else {
      statusText.textContent = 'Processing Disabled'
      statusDot.className = 'status-dot error'
    }

    // Update stats
    document.getElementById('emailsAnalyzed').textContent = this.stats.emailsAnalyzed
    document.getElementById('actionItemsFound').textContent = this.stats.actionItemsFound
    document.getElementById('repliesGenerated').textContent = this.stats.repliesGenerated

    // Show/hide stats section
    const statsSection = document.getElementById('statsSection')
    if (this.stats.emailsAnalyzed > 0) {
      statsSection.style.display = 'block'
    } else {
      statsSection.style.display = 'none'
    }

    // Load recent activity
    this.loadRecentActivity()
  }

  async loadRecentActivity() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ANALYSIS_HISTORY' })
      
      if (response.success && response.analyses.length > 0) {
        const recentActivity = document.getElementById('recentActivity')
        const activityList = document.getElementById('activityList')
        
        // Show recent activity section
        recentActivity.style.display = 'block'
        
        // Clear existing activities
        activityList.innerHTML = ''
        
        // Show last 5 analyses
        const recentAnalyses = response.analyses
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
        
        recentAnalyses.forEach(analysis => {
          const activityItem = document.createElement('div')
          activityItem.className = 'activity-item'
          
          const subject = analysis.summary.substring(0, 50) + (analysis.summary.length > 50 ? '...' : '')
          const time = new Date(analysis.createdAt).toLocaleTimeString()
          
          activityItem.innerHTML = `
            <div class="subject">${subject}</div>
            <div class="time">${time}</div>
          `
          
          activityList.appendChild(activityItem)
        })
      } else {
        document.getElementById('recentActivity').style.display = 'none'
      }
    } catch (error) {
      console.error('ReplySage: Failed to load recent activity:', error)
    }
  }

  async analyzeCurrentEmail() {
    const analyzeButton = document.getElementById('analyzeCurrent')
    const statusDot = document.querySelector('.status-dot')
    const statusText = document.querySelector('.status-text')
    
    try {
      // Update UI to show analyzing state
      analyzeButton.disabled = true
      analyzeButton.textContent = 'Analyzing...'
      statusDot.className = 'status-dot analyzing'
      statusText.textContent = 'Analyzing...'
      
      // Send message to content script to analyze current email
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab || !tab.url || !tab.url.includes('mail.google.com')) {
        this.showNotification('Please open Gmail to analyze an email', 'error')
        return
      }
      
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_CURRENT_MESSAGE' })
      
      if (response && response.success) {
        this.showNotification('Email analyzed successfully!', 'success')
        
        // Update stats
        this.stats.emailsAnalyzed++
        await this.saveStats()
        this.updateUI()
      } else {
        this.showNotification('Failed to analyze email', 'error')
      }
    } catch (error) {
      console.error('ReplySage: Error analyzing email:', error)
      this.showNotification('Failed to analyze email', 'error')
    } finally {
      // Reset UI
      analyzeButton.disabled = false
      analyzeButton.innerHTML = '<span class="button-icon">🔍</span>Analyze Current Email'
      statusDot.className = 'status-dot'
      statusText.textContent = 'Ready'
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage()
  }

  openHelp() {
    // Open help documentation
    chrome.tabs.create({ url: 'https://github.com/replysage/help' })
  }

  openAbout() {
    // Show about information
    this.showNotification('ReplySage v1.0.0 - AI Email Assistant', 'info')
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '10px',
      left: '10px',
      right: '10px',
      padding: '12px 16px',
      borderRadius: '6px',
      color: 'white',
      fontWeight: '500',
      zIndex: '10000',
      opacity: '0',
      transform: 'translateY(-20px)',
      transition: 'all 0.3s ease',
      fontSize: '14px',
      textAlign: 'center'
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
      notification.style.transform = 'translateY(0)'
    }, 100)

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0'
      notification.style.transform = 'translateY(-20px)'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ReplySagePopup()
})
