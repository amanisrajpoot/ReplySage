import { pipeline } from '@xenova/transformers'
import { AnalysisResult, EmailMessage, ActionItem, ExtractedDate, SuggestedReply, GrammarIssue } from '@/types'

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
  private models: Map<string, any> = new Map()
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

  async loadModel(modelName: string): Promise<any> {
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

  // Public methods for testing and external use
  async generateReplies(message: EmailMessage, type: string): Promise<{ replies: SuggestedReply[]; confidence: number; method: string; processingTime: number }> {
    const startTime = Date.now()
    try {
      await this.initialize()
      
      // Load text generation model
      const textGenerator = await this.loadModel('text-generator')
      
      // Generate context-aware replies using AI
      const replies = await this.generateAISuggestedReplies(message, textGenerator, type)
      const processingTime = Date.now() - startTime
      
      return {
        replies,
        confidence: 0.85,
        method: 'local',
        processingTime
      }
    } catch (error) {
      console.error('ReplySage: Failed to generate replies:', error)
      // Fallback to template-based replies
      const replies = await this.generateSuggestedReplies(message, '')
      return {
        replies,
        confidence: 0.6,
        method: 'template',
        processingTime: Date.now() - startTime
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      await this.initialize()
      
      const embeddingModel = await this.loadModel('embeddings')
      
      // Generate embedding using the actual model
      const result = await embeddingModel(text, {
        pooling: 'mean',
        normalize: true
      })
      
      return result.data || result
    } catch (error) {
      console.error('ReplySage: Failed to generate embedding:', error)
      // Fallback to mock embedding if model fails
      const embedding = new Array(384).fill(0).map(() => Math.random() - 0.5)
      return embedding
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
      
      // Extract action items using AI
      const actionItems = await this.extractActionItems(message.body)
      
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
        categories: await this.categorizeEmail(message, summary),
        extractedDates: await this.extractDates(message.body),
        createdAt: new Date(),
        modelUsed: 'local'
      }
    } catch (error) {
      console.error('ReplySage: Failed to analyze email:', error)
      throw error
    }
  }

  private async generateSummary(text: string, model: any): Promise<string> {
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

  private async analyzeSentiment(text: string, model: any): Promise<'positive' | 'negative' | 'neutral'> {
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

  async extractActionItems(text: string): Promise<ActionItem[]> {
    try {
      // Use AI for better action item extraction
      await this.initialize()
      const textGenerator = await this.loadModel('text-generator')
      
      const prompt = `Extract action items from this email text. Return only the action items in this format:
ACTION: [action description] | PRIORITY: [high/medium/low] | CATEGORY: [category] | DUE: [due date if mentioned]

Email text: ${text.substring(0, 1000)}

Action items:`

      const result = await textGenerator(prompt, {
        max_length: 200,
        temperature: 0.3,
        do_sample: true
      })

      const aiResponse = result[0]?.generated_text || ''
      return this.parseAIActionItems(aiResponse)
    } catch (error) {
      console.error('ReplySage: AI action extraction failed, using fallback:', error)
      return this.extractActionItemsFallback(text)
    }
  }

  private parseAIActionItems(aiResponse: string): ActionItem[] {
    const actionItems: ActionItem[] = []
    const lines = aiResponse.split('\n')
    
    lines.forEach(line => {
      const actionMatch = line.match(/ACTION:\s*(.+?)(?:\s*\||$)/i)
      const priorityMatch = line.match(/PRIORITY:\s*(high|medium|low)/i)
      const categoryMatch = line.match(/CATEGORY:\s*(.+?)(?:\s*\||$)/i)
      const dueMatch = line.match(/DUE:\s*(.+?)(?:\s*\||$)/i)
      
      if (actionMatch) {
        actionItems.push({
          text: actionMatch[1].trim(),
          dueDate: dueMatch ? this.parseDate(dueMatch[1].trim()) : undefined,
          priority: (priorityMatch?.[1]?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
          category: categoryMatch?.[1]?.trim() || 'general',
          isCompleted: false
        })
      }
    })

    return actionItems
  }

  private extractActionItemsFallback(text: string): ActionItem[] {
    const actionItems: ActionItem[] = []
    const lines = text.split('\n')
    
    // Common action item patterns
    const patterns = [
      /(?:please|need to|must|should|have to)\s+(.+?)(?:by|before|until|due)\s+([^.!?]+)/gi,
      /(?:action|task|todo|follow.?up|next steps?):\s*(.+?)(?:by|before|until|due)\s+([^.!?]+)/gi,
      /(?:deadline|due date|deadline):\s*([^.!?]+)/gi
    ]

    lines.forEach((line, _index) => {
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

  private async generateAISuggestedReplies(message: EmailMessage, model: any, type: string): Promise<SuggestedReply[]> {
    const replies: SuggestedReply[] = []
    
    // Generate different tone variations using AI
    const tones: Array<'formal' | 'casual' | 'concise'> = ['formal', 'casual', 'concise']
    
    for (const tone of tones) {
      try {
        const prompt = this.buildReplyPrompt(message, tone, type)
        const result = await model(prompt, {
          max_length: tone === 'concise' ? 50 : tone === 'casual' ? 100 : 150,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.9
        })
        
        const replyText = result[0]?.generated_text || this.generateReplyByTone(message, '', tone)
        
        replies.push({
          text: replyText,
          tone,
          length: this.determineReplyLength(replyText),
          confidence: 0.85
        })
      } catch (error) {
        console.error(`ReplySage: Failed to generate ${tone} reply:`, error)
        // Fallback to template-based reply
        const reply = this.generateReplyByTone(message, '', tone)
        replies.push({
          text: reply,
          tone,
          length: this.determineReplyLength(reply),
          confidence: 0.6
        })
      }
    }

    return replies
  }

  private buildReplyPrompt(message: EmailMessage, tone: 'formal' | 'casual' | 'concise', type: string): string {
    const toneInstructions = {
      formal: "Write a professional, polite response",
      casual: "Write a friendly, conversational response", 
      concise: "Write a brief, direct response"
    }
    
    return `Email Subject: ${message.subject}
Email Content: ${message.body.substring(0, 500)}...

${toneInstructions[tone]} to this email. ${type === 'acknowledgment' ? 'Acknowledge receipt and confirm understanding.' : 
type === 'question' ? 'Ask relevant follow-up questions.' : 
type === 'decline' ? 'Politely decline the request.' : 
type === 'accept' ? 'Accept the request and provide next steps.' : 
'Provide an appropriate response.'}

Response:`
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

  private generateReplyByTone(message: EmailMessage, _summary: string, tone: 'formal' | 'casual' | 'concise'): string {
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
    try {
      // Use LanguageTool API for grammar checking
      const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: text,
          language: 'en-US',
          enabledOnly: 'false'
        })
      })

      if (!response.ok) {
        throw new Error('LanguageTool API request failed')
      }

      const data = await response.json()
      const issues: GrammarIssue[] = []

      data.matches?.forEach((match: any) => {
        issues.push({
          text: match.context.text.substring(match.offset, match.offset + match.length),
          suggestion: match.replacements?.[0]?.value || match.message,
          severity: match.rule.severity === 'error' ? 'error' : 'warning',
          position: {
            start: match.offset,
            end: match.offset + match.length
          }
        })
      })

      return issues
    } catch (error) {
      console.error('ReplySage: Grammar check failed, using fallback:', error)
      
      // Fallback to simple heuristic-based grammar checking
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

  private async categorizeEmail(message: EmailMessage, summary: string): Promise<string[]> {
    try {
      // Use AI for better categorization
      await this.initialize()
      const textGenerator = await this.loadModel('text-generator')
      
      const prompt = `Categorize this email into relevant categories. Choose from: meeting, deadline, project, budget, appreciation, urgent, question, request, follow-up, general.
      
Subject: ${message.subject}
Content: ${message.body.substring(0, 500)}
Summary: ${summary}

Return only the categories separated by commas:`

      const result = await textGenerator(prompt, {
        max_length: 50,
        temperature: 0.3,
        do_sample: true
      })

      const aiResponse = result[0]?.generated_text || ''
      const categories = aiResponse.split(',').map((cat: string) => cat.trim().toLowerCase()).filter((cat: string) => cat)
      
      return categories.length > 0 ? categories : ['general']
    } catch (error) {
      console.error('ReplySage: AI categorization failed, using fallback:', error)
      return this.categorizeEmailFallback(message, summary)
    }
  }

  private categorizeEmailFallback(message: EmailMessage, _summary: string): string[] {
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

  async extractDates(text: string): Promise<ExtractedDate[]> {
    try {
      // Use AI for better date extraction
      await this.initialize()
      const textGenerator = await this.loadModel('text-generator')
      
      const prompt = `Extract all dates and time references from this text. Return in format:
DATE: [date text] | TYPE: [deadline/meeting/event/general] | CONFIDENCE: [0.0-1.0]

Text: ${text.substring(0, 1000)}

Dates:`

      const result = await textGenerator(prompt, {
        max_length: 200,
        temperature: 0.3,
        do_sample: true
      })

      const aiResponse = result[0]?.generated_text || ''
      return this.parseAIDates(aiResponse)
    } catch (error) {
      console.error('ReplySage: AI date extraction failed, using fallback:', error)
      return this.extractDatesFallback(text)
    }
  }

  private parseAIDates(aiResponse: string): ExtractedDate[] {
    const dates: ExtractedDate[] = []
    const lines = aiResponse.split('\n')
    
    lines.forEach(line => {
      const dateMatch = line.match(/DATE:\s*(.+?)(?:\s*\||$)/i)
      const typeMatch = line.match(/TYPE:\s*(deadline|meeting|event|general)/i)
      const confidenceMatch = line.match(/CONFIDENCE:\s*([0-9.]+)/i)
      
      if (dateMatch) {
        const dateText = dateMatch[1].trim()
        const date = new Date(dateText)
        
        if (!isNaN(date.getTime())) {
          dates.push({
            text: dateText,
            date,
            type: (typeMatch?.[1]?.toLowerCase() as 'deadline' | 'meeting' | 'event' | 'general') || 'general',
            confidence: parseFloat(confidenceMatch?.[1] || '0.8')
          })
        }
      }
    })

    return dates
  }

  private extractDatesFallback(text: string): ExtractedDate[] {
    const dates: ExtractedDate[] = []
    
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
            type: type as 'deadline' | 'meeting' | 'event' | 'general',
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
