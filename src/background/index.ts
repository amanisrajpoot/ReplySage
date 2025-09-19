import { EmailMessage, AnalysisResult, UserSettings, ProcessingJob } from '@/types'
import { LocalAIManager } from '@/utils/ai-models'
import { ModelAssetManager } from '@/utils/model-asset-manager'
import { OfflineManager } from '@/utils/offline-manager'
import { FallbackManager } from '@/utils/fallback-manager'

class ReplySageBackground {
  private settings: UserSettings
  private jobQueue: ProcessingJob[] = []
  private isProcessing = false
  private aiManager: LocalAIManager
  private assetManager: ModelAssetManager
  private offlineManager: OfflineManager
  private fallbackManager: FallbackManager

  constructor() {
    this.initializeSettings()
    this.setupMessageHandlers()
    this.setupAlarms()
    this.initializeAI()
  }

  private async initializeSettings() {
    try {
      const stored = await chrome.storage.local.get(['replysage_settings'])
      this.settings = stored.replysage_settings || this.getDefaultSettings()
      await this.saveSettings()
    } catch (error) {
      console.error('ReplySage: Failed to initialize settings:', error)
      this.settings = this.getDefaultSettings()
    }
  }

  private async initializeAI() {
    try {
      this.aiManager = LocalAIManager.getInstance()
      this.assetManager = ModelAssetManager.getInstance()
      this.offlineManager = OfflineManager.getInstance()
      this.fallbackManager = FallbackManager.getInstance()
      
      // Initialize AI manager
      await this.aiManager.initialize()
      
      // Initialize offline manager
      await this.offlineManager.initialize()
      
      // Check asset status
      await this.assetManager.checkAssetStatus()
      
      console.log('ReplySage: AI systems initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize AI systems:', error)
    }
  }

  private getDefaultSettings(): UserSettings {
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

  private async saveSettings() {
    try {
      await chrome.storage.local.set({ replysage_settings: this.settings })
    } catch (error) {
      console.error('ReplySage: Failed to save settings:', error)
    }
  }

  private setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse)
      return true // Keep message channel open for async response
    })
  }

  private async handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
    try {
      switch (message.type) {
        case 'ANALYZE_MESSAGE':
          await this.handleAnalyzeMessage(message.payload, sendResponse)
          break
        case 'GET_MODEL_STATUS':
          await this.handleGetModelStatus(sendResponse)
          break
        case 'DOWNLOAD_MODELS':
          await this.handleDownloadModels(message.payload, sendResponse)
          break
        case 'GET_ASSET_STATUS':
          await this.handleGetAssetStatus(sendResponse)
          break
        case 'GET_SETTINGS':
          sendResponse({ settings: this.settings })
          break
        case 'UPDATE_SETTINGS':
          await this.handleUpdateSettings(message.payload, sendResponse)
          break
        case 'CLEAR_CACHE':
          await this.handleClearCache(sendResponse)
          break
        case 'GET_ANALYSIS_HISTORY':
          await this.handleGetAnalysisHistory(sendResponse)
          break
        default:
          sendResponse({ error: 'Unknown message type' })
      }
    } catch (error) {
      console.error('ReplySage: Error handling message:', error)
      sendResponse({ error: error.message })
    }
  }

  private async handleAnalyzeMessage(message: EmailMessage, sendResponse: (response: any) => void) {
    try {
      // Check if we have cached analysis
      const cacheKey = `analysis_${message.id}`
      const cached = await this.getCachedAnalysis(cacheKey)
      
      if (cached && this.settings.enableCaching) {
        console.log('ReplySage: Using cached analysis')
        sendResponse({ success: true, result: cached })
        return
      }

      // Check if local processing is enabled
      if (!this.settings.enableLocalProcessing) {
        sendResponse({ success: false, error: 'Local processing is disabled' })
        return
      }

      // Create processing job
      const job: ProcessingJob = {
        id: this.generateJobId(),
        messageId: message.id,
        type: 'summary',
        status: 'pending',
        createdAt: new Date()
      }

      this.jobQueue.push(job)
      await this.processJobQueue()

      // Use local AI models for analysis
      let analysis: AnalysisResult
      
      try {
        // Check if we should use offline mode
        if (this.offlineManager.shouldUseOfflineMode()) {
          console.log('ReplySage: Using offline mode analysis')
          analysis = await this.fallbackManager.analyzeEmailWithFallback(message)
        } else {
          analysis = await this.aiManager.analyzeEmail(message)
          console.log('ReplySage: Local AI analysis completed')
        }
      } catch (aiError) {
        console.error('ReplySage: Local AI analysis failed, using fallback:', aiError)
        
        // Use fallback manager for better analysis
        try {
          analysis = await this.fallbackManager.analyzeEmailWithFallback(message)
          console.log('ReplySage: Fallback analysis completed')
        } catch (fallbackError) {
          console.error('ReplySage: Fallback analysis failed, using minimal analysis:', fallbackError)
          
          // Final fallback to minimal analysis
          analysis = {
            messageId: message.id,
            summary: this.generateMockSummary(message),
            actionItems: this.generateMockActionItems(message),
            suggestedReplies: this.generateMockReplies(message),
            grammarIssues: this.generateMockGrammarIssues(message),
            sentiment: 'neutral',
            priority: 'medium',
            categories: ['general'],
            extractedDates: [],
            createdAt: new Date(),
            modelUsed: 'local'
          }
        }
      }

      // Cache the result
      if (this.settings.enableCaching) {
        await this.cacheAnalysis(cacheKey, analysis)
      }

      sendResponse({ success: true, result: analysis })
    } catch (error) {
      console.error('ReplySage: Error analyzing message:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleUpdateSettings(newSettings: Partial<UserSettings>, sendResponse: (response: any) => void) {
    try {
      this.settings = { ...this.settings, ...newSettings }
      await this.saveSettings()
      sendResponse({ success: true })
    } catch (error) {
      console.error('ReplySage: Error updating settings:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleClearCache(sendResponse: (response: any) => void) {
    try {
      const keys = await chrome.storage.local.get()
      const analysisKeys = Object.keys(keys).filter(key => key.startsWith('analysis_'))
      
      for (const key of analysisKeys) {
        await chrome.storage.local.remove(key)
      }
      
      sendResponse({ success: true, cleared: analysisKeys.length })
    } catch (error) {
      console.error('ReplySage: Error clearing cache:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleGetAnalysisHistory(sendResponse: (response: any) => void) {
    try {
      const keys = await chrome.storage.local.get()
      const analysisKeys = Object.keys(keys).filter(key => key.startsWith('analysis_'))
      const analyses = analysisKeys.map(key => keys[key])
      
      sendResponse({ success: true, analyses })
    } catch (error) {
      console.error('ReplySage: Error getting analysis history:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleGetModelStatus(sendResponse: (response: any) => void) {
    try {
      const modelStatus = await this.aiManager.getModelStatus()
      sendResponse({ success: true, models: modelStatus })
    } catch (error) {
      console.error('ReplySage: Error getting model status:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleDownloadModels(modelNames: string[], sendResponse: (response: any) => void) {
    try {
      if (!modelNames || modelNames.length === 0) {
        // Download all models
        await this.assetManager.downloadAllAssets((assetName, progress) => {
          // Send progress updates to content script
          chrome.runtime.sendMessage({
            type: 'MODEL_DOWNLOAD_PROGRESS',
            payload: { assetName, progress }
          }).catch(() => {
            // Ignore errors if no content script is listening
          })
        })
      } else {
        // Download specific models
        for (const modelName of modelNames) {
          await this.assetManager.downloadAsset(modelName, (progress) => {
            chrome.runtime.sendMessage({
              type: 'MODEL_DOWNLOAD_PROGRESS',
              payload: { assetName: modelName, progress }
            }).catch(() => {
              // Ignore errors if no content script is listening
            })
          })
        }
      }
      
      sendResponse({ success: true })
    } catch (error) {
      console.error('ReplySage: Error downloading models:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleGetAssetStatus(sendResponse: (response: any) => void) {
    try {
      const assets = await this.assetManager.checkAssetStatus()
      const storageUsage = await this.assetManager.getStorageUsage()
      
      sendResponse({ 
        success: true, 
        assets: Array.from(assets.values()),
        storageUsage
      })
    } catch (error) {
      console.error('ReplySage: Error getting asset status:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async processJobQueue() {
    if (this.isProcessing || this.jobQueue.length === 0) return

    this.isProcessing = true

    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift()
      if (!job) break

      try {
        job.status = 'processing'
        await this.processJob(job)
        job.status = 'completed'
        job.completedAt = new Date()
      } catch (error) {
        job.status = 'failed'
        job.error = error.message
        console.error('ReplySage: Job failed:', error)
      }
    }

    this.isProcessing = false
  }

  private async processJob(job: ProcessingJob) {
    // This is where actual AI processing would happen
    // For now, we'll just simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  private async getCachedAnalysis(key: string): Promise<AnalysisResult | null> {
    try {
      const cached = await chrome.storage.local.get([key])
      return cached[key] || null
    } catch (error) {
      console.error('ReplySage: Error getting cached analysis:', error)
      return null
    }
  }

  private async cacheAnalysis(key: string, analysis: AnalysisResult) {
    try {
      await chrome.storage.local.set({ [key]: analysis })
    } catch (error) {
      console.error('ReplySage: Error caching analysis:', error)
    }
  }

  private setupAlarms() {
    // Set up periodic cleanup of old jobs
    chrome.alarms.create('cleanup-jobs', { periodInMinutes: 60 })
    
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'cleanup-jobs') {
        this.cleanupOldJobs()
      }
    })
  }

  private async cleanupOldJobs() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    this.jobQueue = this.jobQueue.filter(job => 
      job.createdAt > oneHourAgo || job.status === 'processing'
    )
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Mock data generators for development
  private generateMockSummary(message: EmailMessage): string {
    const words = message.body.split(' ').length
    if (words < 50) {
      return `Short message about "${message.subject}"`
    } else if (words < 200) {
      return `Medium-length message discussing "${message.subject}". Contains ${words} words.`
    } else {
      return `Long message about "${message.subject}". This appears to be a detailed communication with ${words} words covering multiple topics.`
    }
  }

  private generateMockActionItems(message: EmailMessage): any[] {
    const actionItems = []
    
    if (message.body.toLowerCase().includes('meeting')) {
      actionItems.push({
        text: 'Schedule meeting',
        priority: 'high' as const,
        category: 'scheduling'
      })
    }
    
    if (message.body.toLowerCase().includes('deadline') || message.body.toLowerCase().includes('due')) {
      actionItems.push({
        text: 'Review deadline requirements',
        priority: 'high' as const,
        category: 'deadline'
      })
    }
    
    if (message.body.toLowerCase().includes('reply') || message.body.toLowerCase().includes('response')) {
      actionItems.push({
        text: 'Send response',
        priority: 'medium' as const,
        category: 'communication'
      })
    }
    
    return actionItems
  }

  private generateMockReplies(message: EmailMessage): any[] {
    return [
      {
        text: `Thank you for your message about "${message.subject}". I'll review this and get back to you soon.`,
        tone: 'formal' as const,
        length: 'short' as const,
        confidence: 0.8
      },
      {
        text: `Thanks for reaching out! I'll look into this and let you know what I find.`,
        tone: 'casual' as const,
        length: 'short' as const,
        confidence: 0.9
      }
    ]
  }

  private generateMockGrammarIssues(message: EmailMessage): any[] {
    const issues = []
    
    // Simple grammar check for common issues
    if (message.body.includes('  ')) {
      issues.push({
        text: 'Double space',
        suggestion: 'Single space',
        severity: 'warning' as const,
        position: { start: 0, end: 0 }
      })
    }
    
    if (message.body.toLowerCase().includes('i am') && !message.body.includes("I'm")) {
      issues.push({
        text: 'i am',
        suggestion: "I'm",
        severity: 'info' as const,
        position: { start: 0, end: 0 }
      })
    }
    
    return issues
  }
}

// Initialize the background script
const replySageBackground = new ReplySageBackground()

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('ReplySage: Service worker started')
})

chrome.runtime.onInstalled.addListener(() => {
  console.log('ReplySage: Extension installed')
})
