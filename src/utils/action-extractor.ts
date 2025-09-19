import { EmailMessage, ActionItem, ExtractedDate } from '@/types'

export interface ActionExtractionResult {
  actionItems: ActionItem[]
  extractedDates: ExtractedDate[]
  confidence: number
  method: 'heuristic' | 'llm' | 'hybrid'
}

export interface ActionPattern {
  pattern: RegExp
  priority: 'high' | 'medium' | 'low'
  category: string
  requiresDate: boolean
  description: string
}

export class ActionExtractor {
  private static instance: ActionExtractor
  private patterns: ActionPattern[] = []
  private datePatterns: RegExp[] = []
  private isInitialized = false

  private constructor() {
    this.initializePatterns()
  }

  static getInstance(): ActionExtractor {
    if (!ActionExtractor.instance) {
      ActionExtractor.instance = new ActionExtractor()
    }
    return ActionExtractor.instance
  }

  private initializePatterns(): void {
    // High priority action patterns
    this.patterns = [
      // Urgent/ASAP patterns
      {
        pattern: /(?:urgent|asap|immediately|right away|as soon as possible)\s*:?\s*(.+?)(?:by|before|until|due|deadline)\s+([^.!?]+)/gi,
        priority: 'high',
        category: 'urgent',
        requiresDate: true,
        description: 'Urgent tasks with deadlines'
      },
      {
        pattern: /(?:need to|must|should|have to|required to)\s+(.+?)(?:by|before|until|due|deadline)\s+([^.!?]+)/gi,
        priority: 'high',
        category: 'required',
        requiresDate: true,
        description: 'Required tasks with deadlines'
      },
      
      // Meeting-related patterns
      {
        pattern: /(?:schedule|arrange|set up|book)\s+(?:a\s+)?(?:meeting|call|appointment|demo|presentation)\s+(?:with|for)\s+(.+?)(?:on|for|at)\s+([^.!?]+)/gi,
        priority: 'medium',
        category: 'scheduling',
        requiresDate: true,
        description: 'Meeting scheduling tasks'
      },
      {
        pattern: /(?:prepare|get ready|organize)\s+(?:for\s+)?(?:meeting|call|presentation|demo)\s+(?:with|for)\s+(.+?)(?:on|for|at)\s+([^.!?]+)/gi,
        priority: 'medium',
        category: 'preparation',
        requiresDate: true,
        description: 'Meeting preparation tasks'
      },
      
      // Review/approval patterns
      {
        pattern: /(?:review|check|approve|sign off on)\s+(.+?)(?:by|before|until|due)\s+([^.!?]+)/gi,
        priority: 'medium',
        category: 'review',
        requiresDate: true,
        description: 'Review and approval tasks'
      },
      {
        pattern: /(?:look at|examine|go through)\s+(.+?)(?:and\s+)?(?:let me know|get back to me|respond)\s+(?:by|before|until)\s+([^.!?]+)/gi,
        priority: 'medium',
        category: 'review',
        requiresDate: true,
        description: 'Review tasks with response required'
      },
      
      // Communication patterns
      {
        pattern: /(?:send|email|message|call|contact)\s+(.+?)(?:by|before|until|on)\s+([^.!?]+)/gi,
        priority: 'medium',
        category: 'communication',
        requiresDate: true,
        description: 'Communication tasks with deadlines'
      },
      {
        pattern: /(?:follow up|follow-up|check in|touch base)\s+(?:with|on)\s+(.+?)(?:by|before|until|on)\s+([^.!?]+)/gi,
        priority: 'medium',
        category: 'follow-up',
        requiresDate: true,
        description: 'Follow-up tasks with deadlines'
      },
      
      // Project/work patterns
      {
        pattern: /(?:work on|complete|finish|deliver)\s+(.+?)(?:by|before|until|due)\s+([^.!?]+)/gi,
        priority: 'medium',
        category: 'project',
        requiresDate: true,
        description: 'Project work with deadlines'
      },
      {
        pattern: /(?:update|modify|change|revise)\s+(.+?)(?:by|before|until|due)\s+([^.!?]+)/gi,
        priority: 'medium',
        category: 'modification',
        requiresDate: true,
        description: 'Modification tasks with deadlines'
      },
      
      // General action patterns (without specific dates)
      {
        pattern: /(?:please|can you|could you|would you)\s+(.+?)(?:\.|!|\?|$)/gi,
        priority: 'low',
        category: 'request',
        requiresDate: false,
        description: 'General requests'
      },
      {
        pattern: /(?:action|task|todo|next step|follow up|follow-up)\s*:?\s*(.+?)(?:\.|!|\?|$)/gi,
        priority: 'medium',
        category: 'general',
        requiresDate: false,
        description: 'General action items'
      },
      {
        pattern: /(?:remember to|don't forget to|make sure to)\s+(.+?)(?:\.|!|\?|$)/gi,
        priority: 'medium',
        category: 'reminder',
        requiresDate: false,
        description: 'Reminder tasks'
      }
    ]

    // Date extraction patterns
    this.datePatterns = [
      // Specific dates
      /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi,
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
      
      // Relative dates
      /\b(?:today|tomorrow|yesterday|this\s+(?:week|month|year)|next\s+(?:week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|last\s+(?:week|month|year))\b/gi,
      /\b(?:in\s+)?(\d+)\s+(?:days?|weeks?|months?|years?)\s+(?:from\s+now|ago|later)\b/gi,
      /\b(?:end\s+of\s+)?(?:this|next)\s+(?:week|month|quarter|year)\b/gi,
      
      // Time expressions
      /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(?:morning|afternoon|evening|night)\b/gi,
      /\b(?:am|pm|a\.m\.|p\.m\.)\b/gi,
      
      // Deadline expressions
      /\b(?:by|before|until|due\s+by|deadline\s+is|due\s+date\s+is)\s+([^.!?]+)/gi,
      /\b(?:no\s+later\s+than|by\s+the\s+end\s+of)\s+([^.!?]+)/gi
    ]
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    this.isInitialized = true
    console.log('ReplySage: Action extractor initialized')
  }

  async extractActions(message: EmailMessage): Promise<ActionExtractionResult> {
    try {
      await this.initialize()
      
      // Extract using heuristics first
      const heuristicResult = this.extractWithHeuristics(message)
      
      // If we have cloud processing available, enhance with LLM
      let llmResult: ActionExtractionResult | null = null
      try {
        llmResult = await this.extractWithLLM(message)
      } catch (error) {
        console.log('ReplySage: LLM extraction failed, using heuristics only:', error)
      }
      
      // Combine results
      const combinedResult = this.combineResults(heuristicResult, llmResult)
      
      return combinedResult
    } catch (error) {
      console.error('ReplySage: Action extraction failed:', error)
      return {
        actionItems: [],
        extractedDates: [],
        confidence: 0,
        method: 'heuristic'
      }
    }
  }

  private extractWithHeuristics(message: EmailMessage): ActionExtractionResult {
    const actionItems: ActionItem[] = []
    const extractedDates: ExtractedDate[] = []
    const text = `${message.subject} ${message.body}`
    
    // Extract dates first
    const dates = this.extractDates(text)
    extractedDates.push(...dates)
    
    // Extract action items
    this.patterns.forEach(pattern => {
      const matches = text.matchAll(pattern.pattern)
      
      for (const match of matches) {
        const actionText = match[1]?.trim()
        const dateText = match[2]?.trim()
        
        if (!actionText || actionText.length < 3) continue
        
        // Find associated date
        let dueDate: Date | undefined
        if (dateText) {
          dueDate = this.parseDate(dateText)
        } else if (pattern.requiresDate) {
          // Try to find a nearby date
          dueDate = this.findNearbyDate(actionText, text, dates)
        }
        
        // Skip if required date is missing
        if (pattern.requiresDate && !dueDate) continue
        
        const actionItem: ActionItem = {
          text: actionText,
          dueDate,
          priority: pattern.priority,
          category: pattern.category,
          isCompleted: false
        }
        
        // Avoid duplicates
        if (!this.isDuplicateAction(actionItem, actionItems)) {
          actionItems.push(actionItem)
        }
      }
    })
    
    // Extract additional dates from context
    const contextDates = this.extractContextDates(text, actionItems)
    extractedDates.push(...contextDates)
    
    return {
      actionItems,
      extractedDates,
      confidence: this.calculateConfidence(actionItems, extractedDates),
      method: 'heuristic'
    }
  }

  private async extractWithLLM(message: EmailMessage): Promise<ActionExtractionResult> {
    // This would integrate with the cloud API manager
    // For now, return a placeholder that would be enhanced with LLM
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_WITH_CLOUD',
        payload: {
          message,
          analysisType: 'action_items'
        }
      })
      
      if (response.success && response.result) {
        return {
          actionItems: response.result.actionItems || [],
          extractedDates: response.result.extractedDates || [],
          confidence: 0.9,
          method: 'llm'
        }
      }
    } catch (error) {
      console.error('ReplySage: LLM action extraction failed:', error)
    }
    
    throw new Error('LLM extraction not available')
  }

  private extractDates(text: string): ExtractedDate[] {
    const dates: ExtractedDate[] = []
    
    this.datePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern)
      
      for (const match of matches) {
        const dateText = match[0]
        const date = this.parseDate(dateText)
        
        if (date && !isNaN(date.getTime())) {
          dates.push({
            text: dateText,
            date,
            type: this.categorizeDate(dateText),
            confidence: this.calculateDateConfidence(dateText)
          })
        }
      }
    })
    
    return dates
  }

  private extractContextDates(text: string, actionItems: ActionItem[]): ExtractedDate[] {
    const dates: ExtractedDate[] = []
    
    // Look for dates mentioned near action items
    actionItems.forEach(action => {
      if (action.dueDate) return
      
      // Find dates in the same sentence or nearby
      const sentences = text.split(/[.!?]+/)
      const actionSentence = sentences.find(sentence => 
        sentence.toLowerCase().includes(action.text.toLowerCase())
      )
      
      if (actionSentence) {
        const sentenceDates = this.extractDates(actionSentence)
        if (sentenceDates.length > 0) {
          action.dueDate = sentenceDates[0].date
          dates.push(sentenceDates[0])
        }
      }
    })
    
    return dates
  }

  private parseDate(dateText: string): Date | undefined {
    try {
      // Handle relative dates
      const lowerText = dateText.toLowerCase().trim()
      const now = new Date()
      
      if (lowerText === 'today') {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      }
      
      if (lowerText === 'tomorrow') {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow
      }
      
      if (lowerText === 'yesterday') {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        return yesterday
      }
      
      if (lowerText.includes('next week')) {
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)
        return nextWeek
      }
      
      if (lowerText.includes('next month')) {
        const nextMonth = new Date(now)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        return nextMonth
      }
      
      if (lowerText.includes('next year')) {
        const nextYear = new Date(now)
        nextYear.setFullYear(nextYear.getFullYear() + 1)
        return nextYear
      }
      
      // Handle specific weekdays
      const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const weekdayIndex = weekdays.findIndex(day => lowerText.includes(day))
      
      if (weekdayIndex !== -1) {
        const daysUntilWeekday = (weekdayIndex - now.getDay() + 7) % 7
        const targetDate = new Date(now)
        targetDate.setDate(targetDate.getDate() + daysUntilWeekday)
        return targetDate
      }
      
      // Handle "in X days/weeks/months"
      const inMatch = lowerText.match(/in\s+(\d+)\s+(days?|weeks?|months?)/)
      if (inMatch) {
        const amount = parseInt(inMatch[1])
        const unit = inMatch[2]
        const futureDate = new Date(now)
        
        if (unit.startsWith('day')) {
          futureDate.setDate(futureDate.getDate() + amount)
        } else if (unit.startsWith('week')) {
          futureDate.setDate(futureDate.getDate() + (amount * 7))
        } else if (unit.startsWith('month')) {
          futureDate.setMonth(futureDate.getMonth() + amount)
        }
        
        return futureDate
      }
      
      // Try standard date parsing
      const parsed = new Date(dateText)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
      
      return undefined
    } catch (error) {
      console.error('ReplySage: Date parsing failed:', error)
      return undefined
    }
  }

  private categorizeDate(dateText: string): 'deadline' | 'meeting' | 'event' | 'general' {
    const lowerText = dateText.toLowerCase()
    
    if (lowerText.includes('deadline') || lowerText.includes('due')) {
      return 'deadline'
    }
    
    if (lowerText.includes('meeting') || lowerText.includes('call') || lowerText.includes('appointment')) {
      return 'meeting'
    }
    
    if (lowerText.includes('event') || lowerText.includes('conference') || lowerText.includes('workshop')) {
      return 'event'
    }
    
    return 'general'
  }

  private calculateDateConfidence(dateText: string): number {
    // Higher confidence for more specific date formats
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(dateText)) {
      return 0.9
    }
    
    if (/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)/i.test(dateText)) {
      return 0.8
    }
    
    if (/\b(?:today|tomorrow|yesterday|next\s+week|next\s+month|next\s+year)/i.test(dateText)) {
      return 0.7
    }
    
    return 0.5
  }

  private findNearbyDate(actionText: string, fullText: string, dates: ExtractedDate[]): Date | undefined {
    // Find the sentence containing the action
    const sentences = fullText.split(/[.!?]+/)
    const actionSentence = sentences.find(sentence => 
      sentence.toLowerCase().includes(actionText.toLowerCase())
    )
    
    if (!actionSentence) return undefined
    
    // Look for dates in the same sentence
    const sentenceDates = this.extractDates(actionSentence)
    if (sentenceDates.length > 0) {
      return sentenceDates[0].date
    }
    
    // Look for dates in nearby sentences
    const actionIndex = sentences.findIndex(sentence => 
      sentence.toLowerCase().includes(actionText.toLowerCase())
    )
    
    if (actionIndex > 0) {
      const prevSentence = sentences[actionIndex - 1]
      const prevDates = this.extractDates(prevSentence)
      if (prevDates.length > 0) {
        return prevDates[0].date
      }
    }
    
    if (actionIndex < sentences.length - 1) {
      const nextSentence = sentences[actionIndex + 1]
      const nextDates = this.extractDates(nextSentence)
      if (nextDates.length > 0) {
        return nextDates[0].date
      }
    }
    
    return undefined
  }

  private isDuplicateAction(newAction: ActionItem, existingActions: ActionItem[]): boolean {
    return existingActions.some(existing => 
      existing.text.toLowerCase() === newAction.text.toLowerCase() &&
      existing.category === newAction.category
    )
  }

  private calculateConfidence(actionItems: ActionItem[], extractedDates: ExtractedDate[]): number {
    if (actionItems.length === 0) return 0
    
    let confidence = 0.5 // Base confidence
    
    // Increase confidence based on number of items
    confidence += Math.min(actionItems.length * 0.1, 0.3)
    
    // Increase confidence if we have dates
    if (extractedDates.length > 0) {
      confidence += 0.2
    }
    
    // Increase confidence for high-priority items
    const highPriorityCount = actionItems.filter(item => item.priority === 'high').length
    confidence += highPriorityCount * 0.1
    
    return Math.min(confidence, 1.0)
  }

  private combineResults(heuristicResult: ActionExtractionResult, llmResult: ActionExtractionResult | null): ActionExtractionResult {
    if (!llmResult) {
      return heuristicResult
    }
    
    // Combine action items, avoiding duplicates
    const combinedActions = [...heuristicResult.actionItems]
    
    llmResult.actionItems.forEach(llmAction => {
      if (!this.isDuplicateAction(llmAction, combinedActions)) {
        combinedActions.push(llmAction)
      }
    })
    
    // Combine dates, avoiding duplicates
    const combinedDates = [...heuristicResult.extractedDates]
    
    llmResult.extractedDates.forEach(llmDate => {
      if (!combinedDates.some(existing => existing.text === llmDate.text)) {
        combinedDates.push(llmDate)
      }
    })
    
    return {
      actionItems: combinedActions,
      extractedDates: combinedDates,
      confidence: Math.max(heuristicResult.confidence, llmResult.confidence),
      method: 'hybrid'
    }
  }

  getPatterns(): ActionPattern[] {
    return [...this.patterns]
  }

  addCustomPattern(pattern: ActionPattern): void {
    this.patterns.push(pattern)
  }

  removeCustomPattern(index: number): void {
    if (index >= 0 && index < this.patterns.length) {
      this.patterns.splice(index, 1)
    }
  }
}
