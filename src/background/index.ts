import { EmailMessage, AnalysisResult, UserSettings, ProcessingJob } from '@/types'
import { LocalAIManager } from '@/utils/ai-models'
import { ModelAssetManager } from '@/utils/model-asset-manager'
import { OfflineManager } from '@/utils/offline-manager'
import { FallbackManager } from '@/utils/fallback-manager'
import { CloudAPIManager, CloudProvider } from '@/utils/cloud-apis'
import { PIIRedactionManager } from '@/utils/pii-redaction'
import { ActionExtractor } from '@/utils/action-extractor'
import { CalendarIntegration } from '@/utils/calendar-integration'
import { ReplyGenerator } from '@/utils/reply-generator'
import { ComposeIntegration } from '@/utils/compose-integration'
import { EmbeddingsManager } from '@/utils/embeddings-manager'

class ReplySageBackground {
  private settings: UserSettings
  private jobQueue: ProcessingJob[] = []
  private isProcessing = false
  private aiManager: LocalAIManager
  private assetManager: ModelAssetManager
  private offlineManager: OfflineManager
  private fallbackManager: FallbackManager
  private cloudManager: CloudAPIManager
  private piiManager: PIIRedactionManager
  private actionExtractor: ActionExtractor
  private calendarIntegration: CalendarIntegration
  private replyGenerator: ReplyGenerator
  private composeIntegration: ComposeIntegration
  private embeddingsManager: EmbeddingsManager

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
      this.cloudManager = CloudAPIManager.getInstance()
      this.piiManager = PIIRedactionManager.getInstance()
      this.actionExtractor = ActionExtractor.getInstance()
      this.calendarIntegration = CalendarIntegration.getInstance()
      this.replyGenerator = ReplyGenerator.getInstance()
      this.composeIntegration = ComposeIntegration.getInstance()
      this.embeddingsManager = EmbeddingsManager.getInstance()
      
      // Initialize AI manager
      await this.aiManager.initialize()
      
      // Initialize offline manager
      await this.offlineManager.initialize()
      
      // Initialize PII redaction manager
      await this.piiManager.initialize()
      
      // Initialize action extractor
      await this.actionExtractor.initialize()
      
      // Initialize calendar integration
      await this.calendarIntegration.initialize()
      
      // Initialize reply generator
      await this.replyGenerator.initialize()
      
      // Initialize compose integration
      await this.composeIntegration.initialize()
      
      // Initialize embeddings manager
      await this.embeddingsManager.initialize()
      
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
      enableSimilaritySearch: false,
      cloudConsentGiven: false,
      preferredCloudProvider: '',
      maxCloudCostPerDay: 1.0,
      enableCloudNotifications: true
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
        case 'ADD_CLOUD_PROVIDER':
          await this.handleAddCloudProvider(message.payload, sendResponse)
          break
        case 'TEST_CLOUD_PROVIDER':
          await this.handleTestCloudProvider(message.payload, sendResponse)
          break
        case 'GET_CLOUD_PROVIDERS':
          await this.handleGetCloudProviders(sendResponse)
          break
        case 'REMOVE_CLOUD_PROVIDER':
          await this.handleRemoveCloudProvider(message.payload, sendResponse)
          break
        case 'ANALYZE_WITH_CLOUD':
          await this.handleAnalyzeWithCloud(message.payload, sendResponse)
          break
        case 'EXTRACT_ACTIONS':
          await this.handleExtractActions(message.payload, sendResponse)
          break
        case 'CREATE_CALENDAR_EVENT':
          await this.handleCreateCalendarEvent(message.payload, sendResponse)
          break
        case 'GET_CALENDAR_PROVIDERS':
          await this.handleGetCalendarProviders(sendResponse)
          break
        case 'GENERATE_REPLIES':
          await this.handleGenerateReplies(message.payload, sendResponse)
          break
        case 'INSERT_REPLY':
          await this.handleInsertReply(message.payload, sendResponse)
          break
        case 'GET_COMPOSE_OPTIONS':
          await this.handleGetComposeOptions(sendResponse)
          break
        case 'GENERATE_EMBEDDING':
          await this.handleGenerateEmbedding(message.payload, sendResponse)
          break
        case 'SEARCH_SIMILAR':
          await this.handleSearchSimilar(message.payload, sendResponse)
          break
        case 'GET_EMBEDDING_STATS':
          await this.handleGetEmbeddingStats(sendResponse)
          break
        case 'CLEAR_EMBEDDINGS':
          await this.handleClearEmbeddings(sendResponse)
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
        console.error('ReplySage: Local AI analysis failed, trying cloud fallback:', aiError)
        
        // Try cloud fallback if enabled
        if (this.settings.enableCloudFallback && this.cloudManager.hasProviders()) {
          try {
            console.log('ReplySage: Attempting cloud analysis')
            const cloudResponse = await this.cloudManager.analyzeWithCloud({
              message,
              redactedMessage: this.settings.enablePIIRedaction 
                ? this.piiManager.redactEmail(message).redactedMessage 
                : message,
              analysisType: 'full',
              userPreferences: {
                tone: this.settings.preferredTone,
                maxSummaryLength: this.settings.maxSummaryLength,
                preferredLanguage: 'en'
              }
            })
            
            if (cloudResponse.success && cloudResponse.result) {
              analysis = cloudResponse.result
              console.log('ReplySage: Cloud analysis completed')
            } else {
              throw new Error(cloudResponse.error || 'Cloud analysis failed')
            }
          } catch (cloudError) {
            console.error('ReplySage: Cloud analysis failed, using fallback:', cloudError)
            
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
        } else {
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

  private async handleAddCloudProvider(provider: CloudProvider, sendResponse: (response: any) => void) {
    try {
      await this.cloudManager.addProvider(provider)
      sendResponse({ success: true })
    } catch (error) {
      console.error('ReplySage: Error adding cloud provider:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleTestCloudProvider(provider: CloudProvider, sendResponse: (response: any) => void) {
    try {
      const success = await this.cloudManager.testProvider(provider)
      sendResponse({ success, error: success ? null : 'Connection test failed' })
    } catch (error) {
      console.error('ReplySage: Error testing cloud provider:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleGetCloudProviders(sendResponse: (response: any) => void) {
    try {
      const providers = this.cloudManager.getAvailableProviders()
      sendResponse({ success: true, providers })
    } catch (error) {
      console.error('ReplySage: Error getting cloud providers:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleRemoveCloudProvider(providerName: string, sendResponse: (response: any) => void) {
    try {
      await this.cloudManager.removeProvider(providerName)
      sendResponse({ success: true })
    } catch (error) {
      console.error('ReplySage: Error removing cloud provider:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleAnalyzeWithCloud(request: { message: EmailMessage; analysisType: string }, sendResponse: (response: any) => void) {
    try {
      // Check if cloud fallback is enabled
      if (!this.settings.enableCloudFallback) {
        sendResponse({ success: false, error: 'Cloud fallback is disabled' })
        return
      }

      // Check if we have cloud providers
      if (!this.cloudManager.hasProviders()) {
        sendResponse({ success: false, error: 'No cloud providers configured' })
        return
      }

      // Redact PII if enabled
      let redactedMessage = request.message
      let redactionResult = null
      
      if (this.settings.enablePIIRedaction) {
        const redaction = this.piiManager.redactEmail(request.message)
        redactedMessage = redaction.redactedMessage
        redactionResult = redaction.redactionResult
      }

      // Prepare cloud analysis request
      const cloudRequest = {
        message: request.message,
        redactedMessage,
        analysisType: request.analysisType as any,
        userPreferences: {
          tone: this.settings.preferredTone,
          maxSummaryLength: this.settings.maxSummaryLength,
          preferredLanguage: 'en'
        }
      }

      // Send to cloud for analysis
      const response = await this.cloudManager.analyzeWithCloud(cloudRequest)
      
      if (response.success) {
        // Cache the result if caching is enabled
        if (this.settings.enableCaching) {
          const cacheKey = `analysis_${request.message.id}`
          await this.cacheAnalysis(cacheKey, response.result!)
        }
      }

      sendResponse(response)
    } catch (error) {
      console.error('ReplySage: Error analyzing with cloud:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleExtractActions(message: EmailMessage, sendResponse: (response: any) => void) {
    try {
      const result = await this.actionExtractor.extractActions(message)
      sendResponse({ success: true, result })
    } catch (error) {
      console.error('ReplySage: Error extracting actions:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleCreateCalendarEvent(request: { action?: any; date?: any; title: string; description?: string }, sendResponse: (response: any) => void) {
    try {
      let result: any
      
      if (request.action) {
        result = await this.calendarIntegration.createEventFromAction(request.action, request.description)
      } else if (request.date) {
        result = await this.calendarIntegration.createEventFromDate(request.date, request.title, request.description)
      } else {
        throw new Error('Either action or date must be provided')
      }
      
      sendResponse({ success: true, result })
    } catch (error) {
      console.error('ReplySage: Error creating calendar event:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleGetCalendarProviders(sendResponse: (response: any) => void) {
    try {
      const providers = await this.calendarIntegration.getCalendarProviders()
      const preferred = await this.calendarIntegration.getPreferredCalendarProvider()
      
      sendResponse({ 
        success: true, 
        providers,
        preferred
      })
    } catch (error) {
      console.error('ReplySage: Error getting calendar providers:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleGenerateReplies(request: { message: EmailMessage; replyType: string; tone: string; length: string; customPrompt?: string }, sendResponse: (response: any) => void) {
    try {
      const result = await this.replyGenerator.generateReplies({
        originalMessage: request.message,
        replyType: request.replyType as any,
        tone: request.tone as any,
        length: request.length as any,
        customPrompt: request.customPrompt
      })
      
      sendResponse({ success: true, result })
    } catch (error) {
      console.error('ReplySage: Error generating replies:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleInsertReply(request: { reply: string; method: string }, sendResponse: (response: any) => void) {
    try {
      const result = await this.composeIntegration.insertReply(
        { text: request.reply, tone: 'professional', length: 'medium', confidence: 1.0 },
        { method: request.method as any }
      )
      
      sendResponse({ success: true, result })
    } catch (error) {
      console.error('ReplySage: Error inserting reply:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleGetComposeOptions(sendResponse: (response: any) => void) {
    try {
      const options = await this.composeIntegration.getComposeOptions()
      const info = await this.composeIntegration.getComposeAreaInfo()
      
      sendResponse({ 
        success: true, 
        options,
        info
      })
    } catch (error) {
      console.error('ReplySage: Error getting compose options:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleGenerateEmbedding(request: { message: EmailMessage; text: string; category?: string; priority?: string }, sendResponse: (response: any) => void) {
    try {
      const embeddingId = await this.embeddingsManager.storeEmbedding(
        request.message,
        request.text,
        request.category,
        request.priority
      )
      
      sendResponse({ success: true, embeddingId })
    } catch (error) {
      console.error('ReplySage: Error generating embedding:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleSearchSimilar(request: { query: string; limit?: number; threshold?: number; category?: string; sender?: string; dateRange?: { start: Date; end: Date } }, sendResponse: (response: any) => void) {
    try {
      const result = await this.embeddingsManager.searchSimilar({
        text: request.query,
        limit: request.limit,
        threshold: request.threshold,
        category: request.category,
        sender: request.sender,
        dateRange: request.dateRange
      })
      
      sendResponse({ success: true, result })
    } catch (error) {
      console.error('ReplySage: Error searching similar:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleGetEmbeddingStats(sendResponse: (response: any) => void) {
    try {
      const stats = await this.embeddingsManager.getEmbeddingStats()
      sendResponse({ success: true, stats })
    } catch (error) {
      console.error('ReplySage: Error getting embedding stats:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  private async handleClearEmbeddings(sendResponse: (response: any) => void) {
    try {
      await this.embeddingsManager.clearAllEmbeddings()
      sendResponse({ success: true })
    } catch (error) {
      console.error('ReplySage: Error clearing embeddings:', error)
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
