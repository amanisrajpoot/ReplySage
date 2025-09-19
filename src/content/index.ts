import { GmailExtractor } from '@/utils/dom-extractor'
import { EmailMessage } from '@/types'
import { ReplySageUI } from './ui/ReplySageUI'

class ReplySageContentScript {
  private ui: ReplySageUI | null = null
  private currentMessage: EmailMessage | null = null
  private isInitialized = false

  constructor() {
    this.init()
  }

  private async init() {
    if (this.isInitialized) return
    
    console.log('ReplySage: Content script initializing...')
    
    // Wait for Gmail to load
    await this.waitForGmail()
    
    // Initialize UI
    this.initializeUI()
    
    // Set up message change detection
    this.setupMessageChangeDetection()
    
    this.isInitialized = true
    console.log('ReplySage: Content script initialized successfully')
  }

  private async waitForGmail(): Promise<void> {
    return new Promise((resolve) => {
      const checkGmail = () => {
        if (GmailExtractor.isGmailPage() && document.querySelector('[data-thread-perm-id]')) {
          resolve()
        } else {
          setTimeout(checkGmail, 100)
        }
      }
      checkGmail()
    })
  }

  private initializeUI() {
    try {
      this.ui = new ReplySageUI()
      this.ui.render()
      console.log('ReplySage: UI initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize UI:', error)
    }
  }

  private setupMessageChangeDetection() {
    // Use MutationObserver to detect when user opens a new email
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          this.handleMessageChange()
        }
      })
    })

    // Observe changes to the main content area
    const contentArea = document.querySelector('[role="main"]') || document.body
    observer.observe(contentArea, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-thread-perm-id']
    })

    // Also listen for URL changes (back/forward navigation)
    let lastUrl = location.href
    new MutationObserver(() => {
      const url = location.href
      if (url !== lastUrl) {
        lastUrl = url
        this.handleMessageChange()
      }
    }).observe(document, { subtree: true, childList: true })
  }

  private async handleMessageChange() {
    try {
      const message = GmailExtractor.extractMessage()
      
      if (message && this.isNewMessage(message)) {
        console.log('ReplySage: New message detected:', message.subject)
        this.currentMessage = message
        
        // Send message to background script for analysis
        await this.sendMessageForAnalysis(message)
        
        // Update UI with new message
        if (this.ui) {
          this.ui.updateMessage(message)
        }
      }
    } catch (error) {
      console.error('ReplySage: Error handling message change:', error)
    }
  }

  private isNewMessage(message: EmailMessage): boolean {
    return !this.currentMessage || this.currentMessage.id !== message.id
  }

  private async sendMessageForAnalysis(message: EmailMessage) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_MESSAGE',
        payload: message
      })
      
      if (response && response.success) {
        console.log('ReplySage: Message analysis completed')
        if (this.ui) {
          this.ui.updateAnalysis(response.result)
        }
      }
    } catch (error) {
      console.error('ReplySage: Failed to send message for analysis:', error)
    }
  }

  // Public method to trigger analysis manually
  public async analyzeCurrentMessage() {
    if (this.currentMessage) {
      await this.sendMessageForAnalysis(this.currentMessage)
    }
  }

  // Public method to get current message
  public getCurrentMessage(): EmailMessage | null {
    return this.currentMessage
  }
}

// Initialize the content script
const replySage = new ReplySageContentScript()

// Expose to global scope for debugging
;(window as any).replySage = replySage

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_CURRENT_MESSAGE') {
    replySage.analyzeCurrentMessage()
    sendResponse({ success: true })
  } else if (message.type === 'GET_CURRENT_MESSAGE') {
    sendResponse({ message: replySage.getCurrentMessage() })
  } else if (message.type === 'MODEL_DOWNLOAD_PROGRESS') {
    // Handle model download progress updates
    console.log(`ReplySage: Model download progress - ${message.payload.assetName}: ${message.payload.progress}%`)
  }
})
