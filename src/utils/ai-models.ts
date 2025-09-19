import { pipeline, Pipeline } from '@xenova/transformers'
import { AnalysisResult, EmailMessage, ActionItem, SuggestedReply, GrammarIssue } from '@/types'

export interface ModelConfig {
  name: string
  task: 'summarization' | 'text-generation' | 'feature-extraction' | 'text-classification'
  modelId: string
  quantized: boolean
  size: number
  loaded: boolean
}

export class LocalAIManager {
  private static instance: LocalAIManager
  private models: Map<string, Pipeline> = new Map()
  private modelConfigs: ModelConfig[] = []
  private isInitialized = false

  private constructor() {
    this.initializeModelConfigs()
  }

  static getInstance(): LocalAIManager {
    if (!LocalAIManager.instance) {
      LocalAIManager.instance = new LocalAIManager()
    }
    return LocalAIManager.instance
  }

  private initializeModelConfigs() {
    this.modelConfigs = [
      {
        name: 'summarizer',
        task: 'summarization',
        modelId: 'Xenova/distilbart-cnn-6-6',
        quantized: true,
        size: 60 * 1024 * 1024, // 60MB
        loaded: false
      },
      {
        name: 'text-generator',
        task: 'text-generation',
        modelId: 'Xenova/distilgpt2',
        quantized: true,
        size: 40 * 1024 * 1024, // 40MB
        loaded: false
      },
      {
        name: 'embeddings',
        task: 'feature-extraction',
        modelId: 'Xenova/all-MiniLM-L6-v2',
        quantized: true,
        size: 90 * 1024 * 1024, // 90MB
        loaded: false
      },
      {
        name: 'sentiment',
        task: 'text-classification',
        modelId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        quantized: true,
        size: 30 * 1024 * 1024, // 30MB
        loaded: false
      }
    ]
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('ReplySage: Initializing local AI models...')
      
      // Set up transformers.js configuration
      const { env } = await import('@xenova/transformers')
      env.allowRemoteModels = false
      env.allowLocalModels = true
      env.useBrowserCache = true
      env.useCustomCache = true

      this.isInitialized = true
      console.log('ReplySage: Local AI models initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize AI models:', error)
      throw error
    }
  }

  async loadModel(modelName: string): Promise<Pipeline> {
    if (this.models.has(modelName)) {
      return this.models.get(modelName)!
    }

    const config = this.modelConfigs.find(c => c.name === modelName)
    if (!config) {
      throw new Error(`Model ${modelName} not found`)
    }

    try {
      console.log(`ReplySage: Loading model ${modelName}...`)
      
      const model = await pipeline(config.task, config.modelId, {
        quantized: config.quantized,
        progress_callback: (progress: any) => {
          console.log(`Loading ${modelName}: ${Math.round(progress.progress * 100)}%`)
        }
      })

      this.models.set(modelName, model)
      config.loaded = true
      
      console.log(`ReplySage: Model ${modelName} loaded successfully`)
      return model
    } catch (error) {
      console.error(`ReplySage: Failed to load model ${modelName}:`, error)
      throw error
    }
  }

  async analyzeEmail(message: EmailMessage): Promise<AnalysisResult> {
    try {
      await this.initialize()
      
      // Load essential models
      const [summarizer, sentiment] = await Promise.all([
        this.loadModel('summarizer'),
        this.loadModel('sentiment')
      ])

      // Generate summary
      const summary = await this.generateSummary(message.body, summarizer)
      
      // Analyze sentiment
      const sentimentResult = await this.analyzeSentiment(message.body, sentiment)
      
      // Extract action items using heuristics
      const actionItems = this.extractActionItems(message.body)
      
      // Generate suggested replies
      const suggestedReplies = await this.generateSuggestedReplies(message, summary)
      
      // Check grammar
      const grammarIssues = await this.checkGrammar(message.body)

      return {
        messageId: message.id,
        summary,
        actionItems,
        suggestedReplies,
        grammarIssues,
        sentiment: sentimentResult,
        priority: this.determinePriority(message, actionItems),
        categories: this.categorizeEmail(message, summary),
        extractedDates: this.extractDates(message.body),
        createdAt: new Date(),
        modelUsed: 'local'
      }
    } catch (error) {
      console.error('ReplySage: Failed to analyze email:', error)
      throw error
    }
  }

  private async generateSummary(text: string, model: Pipeline): Promise<string> {
    try {
      // Truncate text if too long
      const maxLength = 512
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength) + '...'
        : text

      const result = await model(truncatedText, {
        max_length: 100,
        min_length: 20,
        do_sample: false
      })

      return result[0]?.summary_text || 'Unable to generate summary'
    } catch (error) {
      console.error('ReplySage: Failed to generate summary:', error)
      return 'Summary generation failed'
    }
  }

  private async analyzeSentiment(text: string, model: Pipeline): Promise<'positive' | 'negative' | 'neutral'> {
    try {
      const result = await model(text)
      const label = result[0]?.label || 'NEUTRAL'
      
      if (label.includes('POSITIVE')) return 'positive'
      if (label.includes('NEGATIVE')) return 'negative'
      return 'neutral'
    } catch (error) {
      console.error('ReplySage: Failed to analyze sentiment:', error)
      return 'neutral'
    }
  }

  private extractActionItems(text: string): ActionItem[] {
    const actionItems: ActionItem[] = []
    const lines = text.split('\n')
    
    // Common action item patterns
    const patterns = [
      /(?:please|need to|must|should|have to)\s+(.+?)(?:by|before|until|due)\s+([^.!?]+)/gi,
      /(?:action|task|todo|follow.?up|next steps?):\s*(.+?)(?:by|before|until|due)\s+([^.!?]+)/gi,
      /(?:deadline|due date|deadline):\s*([^.!?]+)/gi
    ]

    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        const matches = line.matchAll(pattern)
        for (const match of matches) {
          const text = match[1]?.trim()
          const dueDate = match[2]?.trim()
          
          if (text) {
            actionItems.push({
              text,
              dueDate: dueDate ? this.parseDate(dueDate) : undefined,
              priority: this.determineActionPriority(text),
              category: this.categorizeActionItem(text),
              isCompleted: false
            })
          }
        }
      })
    })

    return actionItems
  }

  private async generateSuggestedReplies(message: EmailMessage, summary: string): Promise<SuggestedReply[]> {
    const replies: SuggestedReply[] = []
    
    // Generate different tone variations
    const tones: Array<'formal' | 'casual' | 'concise'> = ['formal', 'casual', 'concise']
    
    for (const tone of tones) {
      const reply = this.generateReplyByTone(message, summary, tone)
      replies.push({
        text: reply,
        tone,
        length: this.determineReplyLength(reply),
        confidence: 0.8
      })
    }

    return replies
  }

  private generateReplyByTone(message: EmailMessage, summary: string, tone: 'formal' | 'casual' | 'concise'): string {
    const subject = message.subject.toLowerCase()
    
    if (subject.includes('meeting') || subject.includes('schedule')) {
      return this.generateMeetingReply(tone)
    } else if (subject.includes('deadline') || subject.includes('urgent')) {
      return this.generateDeadlineReply(tone)
    } else if (subject.includes('thank') || subject.includes('appreciate')) {
      return this.generateThankYouReply(tone)
    } else {
      return this.generateGenericReply(tone)
    }
  }

  private generateMeetingReply(tone: 'formal' | 'casual' | 'concise'): string {
    const replies = {
      formal: "Thank you for the meeting invitation. I'm available and will attend as scheduled. Please let me know if you need any preparation materials from me.",
      casual: "Thanks for the invite! I'll be there. Let me know if you need anything beforehand.",
      concise: "Confirmed. Will attend."
    }
    return replies[tone]
  }

  private generateDeadlineReply(tone: 'formal' | 'casual' | 'concise'): string {
    const replies = {
      formal: "I understand the urgency and will prioritize this task. I'll provide an update on progress by the specified deadline.",
      casual: "Got it, I'll make sure to get this done on time. I'll keep you posted on how it's going.",
      concise: "Understood. Will meet deadline."
    }
    return replies[tone]
  }

  private generateThankYouReply(tone: 'formal' | 'casual' | 'concise'): string {
    const replies = {
      formal: "You're very welcome. I'm happy to help and look forward to our continued collaboration.",
      casual: "No problem at all! Happy to help anytime.",
      concise: "You're welcome!"
    }
    return replies[tone]
  }

  private generateGenericReply(tone: 'formal' | 'casual' | 'concise'): string {
    const replies = {
      formal: "Thank you for your message. I've reviewed the information and will respond with my thoughts shortly.",
      casual: "Thanks for reaching out! I'll get back to you soon with my response.",
      concise: "Received. Will respond soon."
    }
    return replies[tone]
  }

  private async checkGrammar(text: string): Promise<GrammarIssue[]> {
    // Simple grammar checking using heuristics
    // In a real implementation, you'd use a proper grammar checker
    const issues: GrammarIssue[] = []
    
    // Check for common issues
    const commonIssues = [
      { pattern: /\bi\b/g, suggestion: 'I', severity: 'error' as const },
      { pattern: /\bcan't\b/g, suggestion: 'cannot', severity: 'info' as const },
      { pattern: /\bwon't\b/g, suggestion: 'will not', severity: 'info' as const },
      { pattern: /\bdon't\b/g, suggestion: 'do not', severity: 'info' as const }
    ]

    commonIssues.forEach(issue => {
      const matches = text.matchAll(issue.pattern)
      for (const match of matches) {
        issues.push({
          text: match[0],
          suggestion: issue.suggestion,
          severity: issue.severity,
          position: {
            start: match.index || 0,
            end: (match.index || 0) + match[0].length
          }
        })
      }
    })

    return issues
  }

  private determinePriority(message: EmailMessage, actionItems: ActionItem[]): 'high' | 'medium' | 'low' {
    const subject = message.subject.toLowerCase()
    const body = message.body.toLowerCase()
    
    // High priority indicators
    if (subject.includes('urgent') || subject.includes('asap') || 
        body.includes('urgent') || body.includes('asap') ||
        actionItems.some(item => item.priority === 'high')) {
      return 'high'
    }
    
    // Medium priority indicators
    if (subject.includes('important') || subject.includes('deadline') ||
        body.includes('important') || body.includes('deadline') ||
        actionItems.length > 0) {
      return 'medium'
    }
    
    return 'low'
  }

  private categorizeEmail(message: EmailMessage, summary: string): string[] {
    const categories: string[] = []
    const subject = message.subject.toLowerCase()
    const body = message.body.toLowerCase()
    
    if (subject.includes('meeting') || body.includes('meeting')) {
      categories.push('meeting')
    }
    if (subject.includes('deadline') || body.includes('deadline')) {
      categories.push('deadline')
    }
    if (subject.includes('project') || body.includes('project')) {
      categories.push('project')
    }
    if (subject.includes('budget') || body.includes('budget')) {
      categories.push('budget')
    }
    if (subject.includes('thank') || body.includes('thank')) {
      categories.push('appreciation')
    }
    
    return categories.length > 0 ? categories : ['general']
  }

  private extractDates(text: string): Array<{ text: string; date: Date; type: string; confidence: number }> {
    const dates: Array<{ text: string; date: Date; type: string; confidence: number }> = []
    
    // Simple date patterns
    const datePatterns = [
      { pattern: /(\d{1,2}\/\d{1,2}\/\d{4})/g, type: 'deadline' },
      { pattern: /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, type: 'meeting' },
      { pattern: /(january|february|march|april|may|june|july|august|september|october|november|december)/gi, type: 'event' }
    ]

    datePatterns.forEach(({ pattern, type }) => {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        const dateText = match[0]
        const date = new Date(dateText)
        
        if (!isNaN(date.getTime())) {
          dates.push({
            text: dateText,
            date,
            type,
            confidence: 0.8
          })
        }
      }
    })

    return dates
  }

  private determineActionPriority(text: string): 'high' | 'medium' | 'low' {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('immediately')) {
      return 'high'
    }
    if (lowerText.includes('important') || lowerText.includes('priority')) {
      return 'medium'
    }
    return 'low'
  }

  private categorizeActionItem(text: string): string {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('review') || lowerText.includes('check')) {
      return 'review'
    }
    if (lowerText.includes('meeting') || lowerText.includes('schedule')) {
      return 'scheduling'
    }
    if (lowerText.includes('send') || lowerText.includes('email')) {
      return 'communication'
    }
    if (lowerText.includes('deadline') || lowerText.includes('due')) {
      return 'deadline'
    }
    
    return 'general'
  }

  private parseDate(dateString: string): Date | undefined {
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? undefined : date
    } catch {
      return undefined
    }
  }

  private determineReplyLength(reply: string): 'short' | 'medium' | 'long' {
    const wordCount = reply.split(' ').length
    
    if (wordCount <= 10) return 'short'
    if (wordCount <= 30) return 'medium'
    return 'long'
  }

  async getModelStatus(): Promise<ModelConfig[]> {
    return [...this.modelConfigs]
  }

  async unloadModel(modelName: string): Promise<void> {
    if (this.models.has(modelName)) {
      this.models.delete(modelName)
      const config = this.modelConfigs.find(c => c.name === modelName)
      if (config) {
        config.loaded = false
      }
    }
  }

  async unloadAllModels(): Promise<void> {
    this.models.clear()
    this.modelConfigs.forEach(config => {
      config.loaded = false
    })
  }
}
