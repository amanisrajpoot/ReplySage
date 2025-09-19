import { EmailMessage, SuggestedReply, UserSettings } from '@/types'

export interface ReplyGenerationRequest {
  originalMessage: EmailMessage
  replyType: 'acknowledgment' | 'question' | 'decline' | 'accept' | 'follow_up' | 'custom'
  tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'concise'
  length: 'short' | 'medium' | 'long'
  context?: string
  customPrompt?: string
}

export interface ReplyGenerationResult {
  replies: SuggestedReply[]
  confidence: number
  method: 'local' | 'cloud' | 'template'
  processingTime: number
}

export interface ReplyTemplate {
  id: string
  name: string
  category: string
  tone: string
  length: string
  template: string
  variables: string[]
  description: string
}

export class ReplyGenerator {
  private static instance: ReplyGenerator
  private templates: Map<string, ReplyTemplate[]> = new Map()
  private isInitialized = false

  private constructor() {
    this.initializeTemplates()
  }

  static getInstance(): ReplyGenerator {
    if (!ReplyGenerator.instance) {
      ReplyGenerator.instance = new ReplyGenerator()
    }
    return ReplyGenerator.instance
  }

  private initializeTemplates(): void {
    // Acknowledgment templates
    this.templates.set('acknowledgment', [
      {
        id: 'ack_formal_short',
        name: 'Formal Acknowledgment (Short)',
        category: 'acknowledgment',
        tone: 'formal',
        length: 'short',
        template: 'Thank you for your email. I have received your message and will review it shortly.',
        variables: [],
        description: 'Professional acknowledgment for formal communications'
      },
      {
        id: 'ack_casual_short',
        name: 'Casual Acknowledgment (Short)',
        category: 'acknowledgment',
        tone: 'casual',
        length: 'short',
        template: 'Thanks for reaching out! I got your message and will take a look soon.',
        variables: [],
        description: 'Friendly acknowledgment for casual communications'
      },
      {
        id: 'ack_with_timeline',
        name: 'Acknowledgment with Timeline',
        category: 'acknowledgment',
        tone: 'professional',
        length: 'medium',
        template: 'Thank you for your email regarding {{topic}}. I have received your message and will provide a detailed response by {{timeline}}.',
        variables: ['topic', 'timeline'],
        description: 'Acknowledgment with specific response timeline'
      }
    ])

    // Question templates
    this.templates.set('question', [
      {
        id: 'question_clarification',
        name: 'Clarification Question',
        category: 'question',
        tone: 'professional',
        length: 'medium',
        template: 'Thank you for your email. To ensure I provide the most accurate response, could you please clarify {{question}}?',
        variables: ['question'],
        description: 'Professional request for clarification'
      },
      {
        id: 'question_follow_up',
        name: 'Follow-up Question',
        category: 'question',
        tone: 'friendly',
        length: 'medium',
        template: 'Thanks for your message! I have a quick question about {{topic}} - {{question}}',
        variables: ['topic', 'question'],
        description: 'Friendly follow-up question'
      }
    ])

    // Decline templates
    this.templates.set('decline', [
      {
        id: 'decline_polite',
        name: 'Polite Decline',
        category: 'decline',
        tone: 'professional',
        length: 'medium',
        template: 'Thank you for reaching out regarding {{request}}. Unfortunately, I am unable to {{action}} at this time due to {{reason}}. I appreciate your understanding.',
        variables: ['request', 'action', 'reason'],
        description: 'Polite decline with explanation'
      },
      {
        id: 'decline_alternative',
        name: 'Decline with Alternative',
        category: 'decline',
        tone: 'professional',
        length: 'long',
        template: 'Thank you for your email about {{request}}. While I cannot {{action}} as requested, I would be happy to {{alternative}} instead. Would this work for you?',
        variables: ['request', 'action', 'alternative'],
        description: 'Decline with alternative suggestion'
      }
    ])

    // Accept templates
    this.templates.set('accept', [
      {
        id: 'accept_simple',
        name: 'Simple Acceptance',
        category: 'accept',
        tone: 'professional',
        length: 'short',
        template: 'Thank you for your email. I would be happy to {{action}}. Please let me know the next steps.',
        variables: ['action'],
        description: 'Simple acceptance of request'
      },
      {
        id: 'accept_with_details',
        name: 'Acceptance with Details',
        category: 'accept',
        tone: 'professional',
        length: 'medium',
        template: 'Thank you for reaching out. I am pleased to {{action}}. {{details}} Please confirm if this works for you.',
        variables: ['action', 'details'],
        description: 'Acceptance with specific details'
      }
    ])

    // Follow-up templates
    this.templates.set('follow_up', [
      {
        id: 'follow_up_status',
        name: 'Status Follow-up',
        category: 'follow_up',
        tone: 'professional',
        length: 'medium',
        template: 'I wanted to follow up on {{topic}}. {{status}} Please let me know if you need any additional information.',
        variables: ['topic', 'status'],
        description: 'Professional status follow-up'
      },
      {
        id: 'follow_up_reminder',
        name: 'Reminder Follow-up',
        category: 'follow_up',
        tone: 'friendly',
        length: 'short',
        template: 'Just a friendly reminder about {{topic}}. {{reminder}}',
        variables: ['topic', 'reminder'],
        description: 'Friendly reminder follow-up'
      }
    ])

    // Custom templates
    this.templates.set('custom', [
      {
        id: 'custom_generic',
        name: 'Generic Response',
        category: 'custom',
        tone: 'professional',
        length: 'medium',
        template: '{{custom_content}}',
        variables: ['custom_content'],
        description: 'Generic template for custom responses'
      }
    ])
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    this.isInitialized = true
    console.log('ReplySage: Reply generator initialized')
  }

  async generateReplies(request: ReplyGenerationRequest): Promise<ReplyGenerationResult> {
    const startTime = Date.now()
    
    try {
      await this.initialize()
      
      let result: ReplyGenerationResult
      
      // Try local generation first
      try {
        result = await this.generateLocalReplies(request)
      } catch (error) {
        console.log('ReplySage: Local reply generation failed, trying cloud:', error)
        
        // Fallback to cloud generation
        try {
          result = await this.generateCloudReplies(request)
        } catch (cloudError) {
          console.log('ReplySage: Cloud reply generation failed, using templates:', cloudError)
          
          // Final fallback to templates
          result = await this.generateTemplateReplies(request)
        }
      }
      
      result.processingTime = Date.now() - startTime
      return result
    } catch (error) {
      console.error('ReplySage: Reply generation failed:', error)
      return {
        replies: [],
        confidence: 0,
        method: 'template',
        processingTime: Date.now() - startTime
      }
    }
  }

  private async generateLocalReplies(request: ReplyGenerationRequest): Promise<ReplyGenerationResult> {
    // This would integrate with the local AI manager
    // For now, return a placeholder that would be enhanced with local models
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_MESSAGE',
        payload: {
          message: request.originalMessage,
          analysisType: 'reply_suggestion'
        }
      })
      
      if (response && response.success && response.result) {
        return {
          replies: response.result.suggestedReplies || [],
          confidence: 0.8,
          method: 'local'
        }
      }
    } catch (error) {
      console.error('ReplySage: Local reply generation failed:', error)
    }
    
    throw new Error('Local reply generation not available')
  }

  private async generateCloudReplies(request: ReplyGenerationRequest): Promise<ReplyGenerationResult> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_WITH_CLOUD',
        payload: {
          message: request.originalMessage,
          analysisType: 'reply_suggestion'
        }
      })
      
      if (response.success && response.result) {
        return {
          replies: response.result.suggestedReplies || [],
          confidence: 0.9,
          method: 'cloud'
        }
      }
    } catch (error) {
      console.error('ReplySage: Cloud reply generation failed:', error)
    }
    
    throw new Error('Cloud reply generation not available')
  }

  private async generateTemplateReplies(request: ReplyGenerationRequest): Promise<ReplyGenerationResult> {
    const templates = this.templates.get(request.replyType) || []
    const filteredTemplates = templates.filter(t => 
      t.tone === request.tone && t.length === request.length
    )
    
    if (filteredTemplates.length === 0) {
      // Fallback to any template with matching tone or length
      const fallbackTemplates = templates.filter(t => 
        t.tone === request.tone || t.length === request.length
      )
      if (fallbackTemplates.length === 0) {
        // Use any template as last resort
        return {
          replies: this.processTemplates(templates.slice(0, 3), request),
          confidence: 0.5,
          method: 'template'
        }
      }
      return {
        replies: this.processTemplates(fallbackTemplates.slice(0, 3), request),
        confidence: 0.6,
        method: 'template'
      }
    }
    
    return {
      replies: this.processTemplates(filteredTemplates.slice(0, 3), request),
      confidence: 0.7,
      method: 'template'
    }
  }

  private processTemplates(templates: ReplyTemplate[], request: ReplyGenerationRequest): SuggestedReply[] {
    return templates.map(template => {
      let content = template.template
      
      // Replace variables with context-specific content
      if (template.variables.includes('topic')) {
        content = content.replace('{{topic}}', this.extractTopic(request.originalMessage))
      }
      if (template.variables.includes('timeline')) {
        content = content.replace('{{timeline}}', this.suggestTimeline(request.originalMessage))
      }
      if (template.variables.includes('question')) {
        content = content.replace('{{question}}', this.generateQuestion(request.originalMessage))
      }
      if (template.variables.includes('request')) {
        content = content.replace('{{request}}', this.extractRequest(request.originalMessage))
      }
      if (template.variables.includes('action')) {
        content = content.replace('{{action}}', this.extractAction(request.originalMessage))
      }
      if (template.variables.includes('reason')) {
        content = content.replace('{{reason}}', this.suggestReason(request.originalMessage))
      }
      if (template.variables.includes('alternative')) {
        content = content.replace('{{alternative}}', this.suggestAlternative(request.originalMessage))
      }
      if (template.variables.includes('details')) {
        content = content.replace('{{details}}', this.generateDetails(request.originalMessage))
      }
      if (template.variables.includes('status')) {
        content = content.replace('{{status}}', this.generateStatus(request.originalMessage))
      }
      if (template.variables.includes('reminder')) {
        content = content.replace('{{reminder}}', this.generateReminder(request.originalMessage))
      }
      if (template.variables.includes('custom_content')) {
        content = content.replace('{{custom_content}}', request.customPrompt || 'Thank you for your email.')
      }
      
      return {
        text: content,
        tone: template.tone,
        length: template.length,
        confidence: 0.7
      }
    })
  }

  private extractTopic(message: EmailMessage): string {
    // Extract topic from subject or first sentence of body
    if (message.subject) {
      return message.subject
    }
    
    const firstSentence = message.body?.split('.')[0] || 'your message'
    return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence
  }

  private suggestTimeline(message: EmailMessage): string {
    // Suggest appropriate timeline based on message content
    const body = message.body?.toLowerCase() || ''
    
    if (body.includes('urgent') || body.includes('asap')) {
      return 'within 24 hours'
    }
    if (body.includes('soon') || body.includes('quickly')) {
      return 'within 2-3 business days'
    }
    if (body.includes('when possible') || body.includes('convenient')) {
      return 'within 1 week'
    }
    
    return 'within 3-5 business days'
  }

  private generateQuestion(message: EmailMessage): string {
    // Generate relevant question based on message content
    const body = message.body?.toLowerCase() || ''
    
    if (body.includes('meeting') || body.includes('call')) {
      return 'what time would work best for you?'
    }
    if (body.includes('project') || body.includes('task')) {
      return 'what is the expected timeline for this?'
    }
    if (body.includes('proposal') || body.includes('quote')) {
      return 'what is your budget range?'
    }
    
    return 'could you provide more details about this?'
  }

  private extractRequest(message: EmailMessage): string {
    // Extract the main request from the message
    const body = message.body || ''
    const sentences = body.split(/[.!?]+/)
    
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes('would you') || 
          sentence.toLowerCase().includes('could you') ||
          sentence.toLowerCase().includes('please')) {
        return sentence.trim()
      }
    }
    
    return 'your request'
  }

  private extractAction(message: EmailMessage): string {
    // Extract the action being requested
    const body = message.body?.toLowerCase() || ''
    
    if (body.includes('meeting')) return 'accommodate this meeting'
    if (body.includes('call')) return 'schedule this call'
    if (body.includes('review')) return 'review this document'
    if (body.includes('approve')) return 'approve this request'
    if (body.includes('help')) return 'provide assistance'
    
    return 'fulfill this request'
  }

  private suggestReason(message: EmailMessage): string {
    // Suggest appropriate reason for decline
    const body = message.body?.toLowerCase() || ''
    
    if (body.includes('meeting') || body.includes('call')) {
      return 'my current schedule conflicts'
    }
    if (body.includes('project') || body.includes('work')) {
      return 'I have other commitments at this time'
    }
    
    return 'I am unable to accommodate this request'
  }

  private suggestAlternative(message: EmailMessage): string {
    // Suggest alternative action
    const body = message.body?.toLowerCase() || ''
    
    if (body.includes('meeting')) {
      return 'suggest alternative times or discuss this via email'
    }
    if (body.includes('call')) {
      return 'schedule a brief call at a different time'
    }
    if (body.includes('review')) {
      return 'provide initial feedback via email'
    }
    
    return 'explore alternative approaches'
  }

  private generateDetails(message: EmailMessage): string {
    // Generate relevant details for acceptance
    const body = message.body?.toLowerCase() || ''
    
    if (body.includes('meeting')) {
      return 'I will send you a calendar invite with the details shortly.'
    }
    if (body.includes('project')) {
      return 'I will review the requirements and provide a timeline by tomorrow.'
    }
    if (body.includes('call')) {
      return 'I will reach out to schedule a convenient time.'
    }
    
    return 'I will follow up with you soon.'
  }

  private generateStatus(message: EmailMessage): string {
    // Generate status update
    const body = message.body?.toLowerCase() || ''
    
    if (body.includes('project')) {
      return 'The project is progressing well and is on track for completion.'
    }
    if (body.includes('meeting')) {
      return 'The meeting has been scheduled and confirmed.'
    }
    if (body.includes('request')) {
      return 'Your request is being processed and should be completed soon.'
    }
    
    return 'I wanted to provide you with an update on this matter.'
  }

  private generateReminder(message: EmailMessage): string {
    // Generate reminder content
    const body = message.body?.toLowerCase() || ''
    
    if (body.includes('deadline')) {
      return 'Please note the upcoming deadline.'
    }
    if (body.includes('meeting')) {
      return 'Don\'t forget about our upcoming meeting.'
    }
    if (body.includes('response')) {
      return 'Please respond when you have a chance.'
    }
    
    return 'Please let me know if you need anything else.'
  }

  getTemplates(category?: string): ReplyTemplate[] {
    if (category) {
      return this.templates.get(category) || []
    }
    
    const allTemplates: ReplyTemplate[] = []
    this.templates.forEach(templates => {
      allTemplates.push(...templates)
    })
    return allTemplates
  }

  addCustomTemplate(template: ReplyTemplate): void {
    if (!this.templates.has(template.category)) {
      this.templates.set(template.category, [])
    }
    this.templates.get(template.category)!.push(template)
  }

  removeTemplate(templateId: string): boolean {
    for (const [category, templates] of this.templates.entries()) {
      const index = templates.findIndex(t => t.id === templateId)
      if (index !== -1) {
        templates.splice(index, 1)
        return true
      }
    }
    return false
  }
}
