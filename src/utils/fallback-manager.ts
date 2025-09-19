import { EmailMessage, AnalysisResult, ActionItem, SuggestedReply, GrammarIssue } from '@/types'

export interface FallbackOptions {
  enableHeuristics: boolean
  enableLanguageTool: boolean
  enableBasicSummarization: boolean
  enableRuleBasedReplies: boolean
}

export class FallbackManager {
  private static instance: FallbackManager
  private options: FallbackOptions

  private constructor() {
    this.options = {
      enableHeuristics: true,
      enableLanguageTool: true,
      enableBasicSummarization: true,
      enableRuleBasedReplies: true
    }
  }

  static getInstance(): FallbackManager {
    if (!FallbackManager.instance) {
      FallbackManager.instance = new FallbackManager()
    }
    return FallbackManager.instance
  }

  async analyzeEmailWithFallback(message: EmailMessage): Promise<AnalysisResult> {
    try {
      console.log('ReplySage: Using fallback analysis methods')
      
      const analysis: AnalysisResult = {
        messageId: message.id,
        summary: await this.generateFallbackSummary(message),
        actionItems: this.extractActionItemsWithHeuristics(message),
        suggestedReplies: this.generateFallbackReplies(message),
        grammarIssues: await this.checkGrammarWithFallback(message),
        sentiment: this.analyzeSentimentWithHeuristics(message),
        priority: this.determinePriorityWithHeuristics(message),
        categories: this.categorizeWithHeuristics(message),
        extractedDates: this.extractDatesWithHeuristics(message),
        createdAt: new Date(),
        modelUsed: 'local'
      }

      return analysis
    } catch (error) {
      console.error('ReplySage: Fallback analysis failed:', error)
      return this.generateMinimalAnalysis(message)
    }
  }

  private async generateFallbackSummary(message: EmailMessage): Promise<string> {
    if (!this.options.enableBasicSummarization) {
      return `Email from ${message.from} about "${message.subject}"`
    }

    try {
      // Simple extractive summarization
      const sentences = message.body.split(/[.!?]+/).filter(s => s.trim().length > 10)
      
      if (sentences.length === 0) {
        return `Email from ${message.from} about "${message.subject}"`
      }

      // Score sentences based on keywords and position
      const scoredSentences = sentences.map((sentence, index) => {
        const score = this.scoreSentence(sentence, index, sentences.length)
        return { sentence: sentence.trim(), score }
      })

      // Sort by score and take top 2-3 sentences
      const topSentences = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(3, sentences.length))
        .map(s => s.sentence)

      return topSentences.join('. ') + '.'
    } catch (error) {
      console.error('ReplySage: Fallback summary generation failed:', error)
      return `Email from ${message.from} about "${message.subject}"`
    }
  }

  private scoreSentence(sentence: string, index: number, totalSentences: number): number {
    let score = 0
    
    // Position score (first and last sentences are more important)
    if (index === 0) score += 2
    if (index === totalSentences - 1) score += 1
    
    // Length score (medium length sentences are better)
    const length = sentence.length
    if (length > 20 && length < 100) score += 1
    
    // Keyword score
    const keywords = [
      'meeting', 'deadline', 'urgent', 'important', 'project', 'budget',
      'schedule', 'review', 'action', 'task', 'follow', 'next', 'please',
      'need', 'must', 'should', 'will', 'can', 'would'
    ]
    
    const lowerSentence = sentence.toLowerCase()
    keywords.forEach(keyword => {
      if (lowerSentence.includes(keyword)) {
        score += 1
      }
    })
    
    // Question score (questions are often important)
    if (sentence.includes('?')) score += 1
    
    return score
  }

  private extractActionItemsWithHeuristics(message: EmailMessage): ActionItem[] {
    if (!this.options.enableHeuristics) {
      return []
    }

    const actionItems: ActionItem[] = []
    const lines = message.body.split('\n')
    
    // Common action item patterns
    const patterns = [
      { regex: /(?:please|need to|must|should|have to)\s+(.+?)(?:by|before|until|due)\s+([^.!?]+)/gi, hasDeadline: true },
      { regex: /(?:action|task|todo|follow.?up|next steps?):\s*(.+?)(?:by|before|until|due)\s+([^.!?]+)/gi, hasDeadline: true },
      { regex: /(?:deadline|due date):\s*([^.!?]+)/gi, hasDeadline: true },
      { regex: /(?:please|need to|must|should|have to)\s+(.+?)(?:\.|!|\?)/gi, hasDeadline: false },
      { regex: /(?:action|task|todo|follow.?up|next steps?):\s*(.+?)(?:\.|!|\?)/gi, hasDeadline: false }
    ]

    lines.forEach((line, lineIndex) => {
      patterns.forEach(({ regex, hasDeadline }) => {
        const matches = line.matchAll(regex)
        for (const match of matches) {
          const text = match[1]?.trim()
          const dueDate = hasDeadline ? match[2]?.trim() : undefined
          
          if (text && text.length > 5) {
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

  private generateFallbackReplies(message: EmailMessage): SuggestedReply[] {
    if (!this.options.enableRuleBasedReplies) {
      return []
    }

    const replies: SuggestedReply[] = []
    const subject = message.subject.toLowerCase()
    const body = message.body.toLowerCase()
    
    // Generate replies based on email type
    if (subject.includes('meeting') || body.includes('meeting')) {
      replies.push(
        {
          text: "Thank you for the meeting invitation. I'm available and will attend as scheduled.",
          tone: 'formal',
          length: 'short',
          confidence: 0.8
        },
        {
          text: "Thanks for the invite! I'll be there.",
          tone: 'casual',
          length: 'short',
          confidence: 0.9
        }
      )
    } else if (subject.includes('deadline') || body.includes('deadline')) {
      replies.push(
        {
          text: "I understand the deadline and will ensure the task is completed on time.",
          tone: 'formal',
          length: 'short',
          confidence: 0.8
        },
        {
          text: "Got it, I'll make sure to get this done by the deadline.",
          tone: 'casual',
          length: 'short',
          confidence: 0.9
        }
      )
    } else if (subject.includes('thank') || body.includes('thank')) {
      replies.push(
        {
          text: "You're very welcome. I'm happy to help.",
          tone: 'formal',
          length: 'short',
          confidence: 0.9
        },
        {
          text: "No problem at all! Happy to help anytime.",
          tone: 'casual',
          length: 'short',
          confidence: 0.9
        }
      )
    } else {
      replies.push(
        {
          text: "Thank you for your message. I'll review this and get back to you soon.",
          tone: 'formal',
          length: 'short',
          confidence: 0.7
        },
        {
          text: "Thanks for reaching out! I'll get back to you soon.",
          tone: 'casual',
          length: 'short',
          confidence: 0.8
        }
      )
    }

    return replies
  }

  private async checkGrammarWithFallback(message: EmailMessage): Promise<GrammarIssue[]> {
    if (!this.options.enableLanguageTool) {
      return this.checkGrammarWithHeuristics(message.body)
    }

    try {
      // Try to use LanguageTool API if available
      return await this.checkGrammarWithLanguageTool(message.body)
    } catch (error) {
      console.error('ReplySage: LanguageTool check failed, using heuristics:', error)
      return this.checkGrammarWithHeuristics(message.body)
    }
  }

  private checkGrammarWithHeuristics(text: string): GrammarIssue[] {
    const issues: GrammarIssue[] = []
    
    // Simple grammar checks
    const checks = [
      { pattern: /\bi\b/g, suggestion: 'I', severity: 'error' as const },
      { pattern: /\bcan't\b/g, suggestion: 'cannot', severity: 'info' as const },
      { pattern: /\bwon't\b/g, suggestion: 'will not', severity: 'info' as const },
      { pattern: /\bdon't\b/g, suggestion: 'do not', severity: 'info' as const },
      { pattern: /\b  +/g, suggestion: ' ', severity: 'warning' as const },
      { pattern: /([.!?])\s*([a-z])/g, suggestion: '$1 $2', severity: 'warning' as const }
    ]

    checks.forEach(check => {
      const matches = text.matchAll(check.pattern)
      for (const match of matches) {
        issues.push({
          text: match[0],
          suggestion: match[0].replace(check.pattern, check.suggestion),
          severity: check.severity,
          position: {
            start: match.index || 0,
            end: (match.index || 0) + match[0].length
          }
        })
      }
    })

    return issues
  }

  private async checkGrammarWithLanguageTool(text: string): Promise<GrammarIssue[]> {
    // This would integrate with LanguageTool API
    // For now, return empty array as we don't have API access
    return []
  }

  private analyzeSentimentWithHeuristics(message: EmailMessage): 'positive' | 'negative' | 'neutral' {
    const text = (message.subject + ' ' + message.body).toLowerCase()
    
    const positiveWords = ['thank', 'great', 'excellent', 'good', 'happy', 'pleased', 'appreciate', 'wonderful', 'amazing']
    const negativeWords = ['urgent', 'problem', 'issue', 'error', 'failed', 'bad', 'terrible', 'disappointed', 'concerned']
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length
    const negativeCount = negativeWords.filter(word => text.includes(word)).length
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  private determinePriorityWithHeuristics(message: EmailMessage): 'high' | 'medium' | 'low' {
    const subject = message.subject.toLowerCase()
    const body = message.body.toLowerCase()
    
    const highPriorityWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency']
    const mediumPriorityWords = ['important', 'deadline', 'priority', 'soon']
    
    const text = subject + ' ' + body
    
    if (highPriorityWords.some(word => text.includes(word))) {
      return 'high'
    }
    if (mediumPriorityWords.some(word => text.includes(word))) {
      return 'medium'
    }
    
    return 'low'
  }

  private categorizeWithHeuristics(message: EmailMessage): string[] {
    const categories: string[] = []
    const subject = message.subject.toLowerCase()
    const body = message.body.toLowerCase()
    const text = subject + ' ' + body
    
    if (text.includes('meeting') || text.includes('schedule')) {
      categories.push('meeting')
    }
    if (text.includes('deadline') || text.includes('due')) {
      categories.push('deadline')
    }
    if (text.includes('project') || text.includes('task')) {
      categories.push('project')
    }
    if (text.includes('budget') || text.includes('cost')) {
      categories.push('budget')
    }
    if (text.includes('thank') || text.includes('appreciate')) {
      categories.push('appreciation')
    }
    
    return categories.length > 0 ? categories : ['general']
  }

  private extractDatesWithHeuristics(message: EmailMessage): Array<{ text: string; date: Date; type: string; confidence: number }> {
    const dates: Array<{ text: string; date: Date; type: string; confidence: number }> = []
    const text = message.body
    
    // Simple date patterns
    const patterns = [
      { regex: /(\d{1,2}\/\d{1,2}\/\d{4})/g, type: 'deadline' },
      { regex: /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, type: 'meeting' },
      { regex: /(january|february|march|april|may|june|july|august|september|october|november|december)/gi, type: 'event' }
    ]

    patterns.forEach(({ regex, type }) => {
      const matches = text.matchAll(regex)
      for (const match of matches) {
        const dateText = match[0]
        const date = new Date(dateText)
        
        if (!isNaN(date.getTime())) {
          dates.push({
            text: dateText,
            date,
            type,
            confidence: 0.7
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

  private generateMinimalAnalysis(message: EmailMessage): AnalysisResult {
    return {
      messageId: message.id,
      summary: `Email from ${message.from} about "${message.subject}"`,
      actionItems: [],
      suggestedReplies: [],
      grammarIssues: [],
      sentiment: 'neutral',
      priority: 'medium',
      categories: ['general'],
      extractedDates: [],
      createdAt: new Date(),
      modelUsed: 'local'
    }
  }

  setOptions(options: Partial<FallbackOptions>): void {
    this.options = { ...this.options, ...options }
  }

  getOptions(): FallbackOptions {
    return { ...this.options }
  }
}
