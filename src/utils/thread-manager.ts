import { EmailMessage } from '@/types'

export interface ThreadMessage extends EmailMessage {
  threadPosition: number
  isReply: boolean
  replyTo?: string
  participants: string[]
  timestamp: Date
}

export interface EmailThread {
  id: string
  subject: string
  participants: string[]
  messageCount: number
  messages: ThreadMessage[]
  startDate: Date
  endDate: Date
  lastActivity: Date
  isActive: boolean
  categories: string[]
  priority: 'low' | 'medium' | 'high'
  summary?: string
  keyPoints?: string[]
  actionItems?: string[]
  decisions?: string[]
}

export interface ThreadSummary {
  threadId: string
  summary: string
  keyPoints: string[]
  actionItems: string[]
  decisions: string[]
  participants: string[]
  timeline: {
    start: Date
    end: Date
    duration: number
  }
  sentiment: 'positive' | 'negative' | 'neutral'
  urgency: 'low' | 'medium' | 'high'
  confidence: number
  createdAt: Date
}

export interface ThreadChunk {
  id: string
  threadId: string
  messages: ThreadMessage[]
  startIndex: number
  endIndex: number
  summary: string
  keyPoints: string[]
  sentiment: 'positive' | 'negative' | 'neutral'
  createdAt: Date
}

export class ThreadManager {
  private static instance: ThreadManager
  private isInitialized = false
  private threadCache: Map<string, EmailThread> = new Map()
  private summaryCache: Map<string, ThreadSummary> = new Map()

  private constructor() {}

  static getInstance(): ThreadManager {
    if (!ThreadManager.instance) {
      ThreadManager.instance = new ThreadManager()
    }
    return ThreadManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    this.isInitialized = true
    console.log('ReplySage: Thread manager initialized')
  }

  async fetchThread(threadId: string): Promise<EmailThread | null> {
    try {
      // Check cache first
      if (this.threadCache.has(threadId)) {
        return this.threadCache.get(threadId)!
      }

      // Try to fetch from DOM (Gmail-specific)
      const thread = await this.fetchThreadFromDOM(threadId)
      if (thread) {
        this.threadCache.set(threadId, thread)
        return thread
      }

      // Try to fetch from Gmail API (if available)
      const apiThread = await this.fetchThreadFromAPI(threadId)
      if (apiThread) {
        this.threadCache.set(threadId, apiThread)
        return apiThread
      }

      return null
    } catch (error) {
      console.error('ReplySage: Failed to fetch thread:', error)
      return null
    }
  }

  private async fetchThreadFromDOM(threadId: string): Promise<EmailThread | null> {
    try {
      // Look for thread container in Gmail
      const threadContainer = document.querySelector(`[data-thread-id="${threadId}"]`) ||
                            document.querySelector(`[data-thread-id="${threadId}"]`) ||
                            document.querySelector('.thread')

      if (!threadContainer) {
        return null
      }

      // Extract messages from thread
      const messageElements = threadContainer.querySelectorAll('.message, .email, [role="listitem"]')
      const messages: ThreadMessage[] = []

      messageElements.forEach((element, index) => {
        const message = this.extractMessageFromElement(element, index)
        if (message) {
          messages.push(message)
        }
      })

      if (messages.length === 0) {
        return null
      }

      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      // Create thread object
      const thread: EmailThread = {
        id: threadId,
        subject: messages[0].subject || 'No Subject',
        participants: this.extractParticipants(messages),
        messageCount: messages.length,
        messages: messages,
        startDate: messages[0].timestamp,
        endDate: messages[messages.length - 1].timestamp,
        lastActivity: messages[messages.length - 1].timestamp,
        isActive: this.isThreadActive(messages),
        categories: this.categorizeThread(messages),
        priority: this.determineThreadPriority(messages)
      }

      return thread
    } catch (error) {
      console.error('ReplySage: Failed to fetch thread from DOM:', error)
      return null
    }
  }

  private extractMessageFromElement(element: Element, index: number): ThreadMessage | null {
    try {
      // Extract basic message information
      const subject = element.querySelector('.subject, .email-subject, [data-subject]')?.textContent?.trim() || ''
      const from = element.querySelector('.from, .sender, [data-from]')?.textContent?.trim() || ''
      const body = element.querySelector('.body, .content, .message-body')?.textContent?.trim() || ''
      const timestamp = element.querySelector('.date, .timestamp, [data-timestamp]')?.textContent?.trim() || ''
      
      // Parse timestamp
      const parsedTimestamp = this.parseTimestamp(timestamp)
      
      // Determine if this is a reply
      const isReply = index > 0 || from.includes('Re:') || subject.includes('Re:')
      
      // Extract participants
      const participants = this.extractMessageParticipants(element)
      
      const message: ThreadMessage = {
        id: `msg_${Date.now()}_${index}`,
        subject: subject,
        from: from,
        to: [], // Will be extracted from email headers
        body: body,
        timestamp: parsedTimestamp,
        threadPosition: index,
        isReply: isReply,
        participants: participants,
        threadId: 'unknown', // Will be set by the thread
        attachments: [], // Will be extracted from email
        isRead: true, // Default to read
        isImportant: false // Default to not important
      }

      return message
    } catch (error) {
      console.error('ReplySage: Failed to extract message from element:', error)
      return null
    }
  }

  private parseTimestamp(timestamp: string): Date {
    try {
      // Try to parse various timestamp formats
      const parsed = new Date(timestamp)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
      
      // Handle relative timestamps
      const now = new Date()
      const lower = timestamp.toLowerCase()
      
      if (lower.includes('now') || lower.includes('just now')) {
        return now
      }
      
      if (lower.includes('minute')) {
        const minutes = parseInt(timestamp.match(/\d+/)?.[0] || '0')
        return new Date(now.getTime() - minutes * 60 * 1000)
      }
      
      if (lower.includes('hour')) {
        const hours = parseInt(timestamp.match(/\d+/)?.[0] || '0')
        return new Date(now.getTime() - hours * 60 * 60 * 1000)
      }
      
      if (lower.includes('day')) {
        const days = parseInt(timestamp.match(/\d+/)?.[0] || '0')
        return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      }
      
      if (lower.includes('week')) {
        const weeks = parseInt(timestamp.match(/\d+/)?.[0] || '0')
        return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000)
      }
      
      // Default to now if parsing fails
      return now
    } catch (error) {
      console.error('ReplySage: Failed to parse timestamp:', error)
      return new Date()
    }
  }

  private extractMessageParticipants(element: Element): string[] {
    const participants: string[] = []
    
    // Extract from field
    const fromElement = element.querySelector('.from, .sender, [data-from]')
    if (fromElement) {
      const fromText = fromElement.textContent?.trim() || ''
      if (fromText) {
        participants.push(fromText)
      }
    }
    
    // Extract to field
    const toElement = element.querySelector('.to, .recipient, [data-to]')
    if (toElement) {
      const toText = toElement.textContent?.trim() || ''
      if (toText) {
        participants.push(toText)
      }
    }
    
    // Extract cc field
    const ccElement = element.querySelector('.cc, [data-cc]')
    if (ccElement) {
      const ccText = ccElement.textContent?.trim() || ''
      if (ccText) {
        participants.push(ccText)
      }
    }
    
    return [...new Set(participants)] // Remove duplicates
  }

  private extractParticipants(messages: ThreadMessage[]): string[] {
    const participants = new Set<string>()
    
    messages.forEach(message => {
      message.participants.forEach(participant => {
        participants.add(participant)
      })
    })
    
    return Array.from(participants)
  }

  private isThreadActive(messages: ThreadMessage[]): boolean {
    const now = new Date()
    const lastMessage = messages[messages.length - 1]
    const timeDiff = now.getTime() - lastMessage.timestamp.getTime()
    
    // Consider thread active if last message was within 7 days
    return timeDiff < 7 * 24 * 60 * 60 * 1000
  }

  private categorizeThread(messages: ThreadMessage[]): string[] {
    const categories: string[] = []
    
    // Analyze message content for categories
    const allText = messages.map(m => `${m.subject} ${m.body}`).join(' ').toLowerCase()
    
    if (allText.includes('urgent') || allText.includes('asap') || allText.includes('immediately')) {
      categories.push('urgent')
    }
    
    if (allText.includes('meeting') || allText.includes('call') || allText.includes('schedule')) {
      categories.push('meeting')
    }
    
    if (allText.includes('project') || allText.includes('task') || allText.includes('work')) {
      categories.push('project')
    }
    
    if (allText.includes('question') || allText.includes('help') || allText.includes('support')) {
      categories.push('support')
    }
    
    if (allText.includes('decision') || allText.includes('approve') || allText.includes('agree')) {
      categories.push('decision')
    }
    
    if (categories.length === 0) {
      categories.push('general')
    }
    
    return categories
  }

  private determineThreadPriority(messages: ThreadMessage[]): 'low' | 'medium' | 'high' {
    const allText = messages.map(m => `${m.subject} ${m.body}`).join(' ').toLowerCase()
    
    if (allText.includes('urgent') || allText.includes('asap') || allText.includes('critical')) {
      return 'high'
    }
    
    if (allText.includes('important') || allText.includes('priority') || allText.includes('deadline')) {
      return 'medium'
    }
    
    return 'low'
  }

  private async fetchThreadFromAPI(_threadId: string): Promise<EmailThread | null> {
    // This would integrate with Gmail API or other email APIs
    // For now, return null as we don't have API access
    return null
  }

  async summarizeThread(thread: EmailThread): Promise<ThreadSummary> {
    try {
      // Check cache first
      if (this.summaryCache.has(thread.id)) {
        return this.summaryCache.get(thread.id)!
      }

      // Generate summary using local AI or cloud fallback
      const summary = await this.generateThreadSummary(thread)
      
      // Cache the summary
      this.summaryCache.set(thread.id, summary)
      
      return summary
    } catch (error) {
      console.error('ReplySage: Failed to summarize thread:', error)
      throw error
    }
  }

  private async generateThreadSummary(thread: EmailThread): Promise<ThreadSummary> {
    try {
      // Try local AI first
      const localSummary = await this.generateLocalThreadSummary(thread)
      if (localSummary) {
        return localSummary
      }

      // Fallback to cloud AI
      const cloudSummary = await this.generateCloudThreadSummary(thread)
      if (cloudSummary) {
        return cloudSummary
      }

      // Final fallback to heuristic summary
      return this.generateHeuristicThreadSummary(thread)
    } catch (error) {
      console.error('ReplySage: Failed to generate thread summary:', error)
      return this.generateHeuristicThreadSummary(thread)
    }
  }

  private async generateLocalThreadSummary(_thread: EmailThread): Promise<ThreadSummary | null> {
    try {
      // This would integrate with the local AI manager
      // For now, return null to use fallback
      return null
    } catch (error) {
      console.error('ReplySage: Local thread summary failed:', error)
      return null
    }
  }

  private async generateCloudThreadSummary(_thread: EmailThread): Promise<ThreadSummary | null> {
    try {
      // This would integrate with the cloud API manager
      // For now, return null to use fallback
      return null
    } catch (error) {
      console.error('ReplySage: Cloud thread summary failed:', error)
      return null
    }
  }

  private generateHeuristicThreadSummary(thread: EmailThread): ThreadSummary {
    const keyPoints: string[] = []
    const actionItems: string[] = []
    const decisions: string[] = []
    
    // Extract key points from messages
    thread.messages.forEach(message => {
      const text = `${message.subject} ${message.body}`.toLowerCase()
      
      // Extract action items
      if (text.includes('todo') || text.includes('action') || text.includes('task')) {
        actionItems.push(message.body.substring(0, 100) + '...')
      }
      
      // Extract decisions
      if (text.includes('decide') || text.includes('agree') || text.includes('approve')) {
        decisions.push(message.body.substring(0, 100) + '...')
      }
      
      // Extract key points
      if (message.subject && !message.subject.includes('Re:')) {
        keyPoints.push(message.subject)
      }
    })
    
    // Generate summary
    const summary = `Thread with ${thread.messageCount} messages between ${thread.participants.length} participants. ` +
                   `Started on ${thread.startDate.toLocaleDateString()} and ` +
                   `last active on ${thread.lastActivity.toLocaleDateString()}. ` +
                   `Categories: ${thread.categories.join(', ')}.`
    
    // Determine sentiment
    const allText = thread.messages.map(m => `${m.subject} ${m.body}`).join(' ').toLowerCase()
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
    
    if (allText.includes('thank') || allText.includes('great') || allText.includes('excellent')) {
      sentiment = 'positive'
    } else if (allText.includes('problem') || allText.includes('issue') || allText.includes('error')) {
      sentiment = 'negative'
    }
    
    return {
      threadId: thread.id,
      summary,
      keyPoints: keyPoints.slice(0, 5), // Limit to 5 key points
      actionItems: actionItems.slice(0, 5), // Limit to 5 action items
      decisions: decisions.slice(0, 3), // Limit to 3 decisions
      participants: thread.participants,
      timeline: {
        start: thread.startDate,
        end: thread.endDate,
        duration: thread.endDate.getTime() - thread.startDate.getTime()
      },
      sentiment,
      urgency: thread.priority,
      confidence: 0.7, // Heuristic confidence
      createdAt: new Date()
    }
  }

  async chunkThread(thread: EmailThread, maxChunkSize: number = 5): Promise<ThreadChunk[]> {
    const chunks: ThreadChunk[] = []
    const messages = thread.messages
    
    for (let i = 0; i < messages.length; i += maxChunkSize) {
      const chunkMessages = messages.slice(i, i + maxChunkSize)
      
      const chunk: ThreadChunk = {
        id: `chunk_${thread.id}_${i}`,
        threadId: thread.id,
        messages: chunkMessages,
        startIndex: i,
        endIndex: i + chunkMessages.length - 1,
        summary: this.generateChunkSummary(chunkMessages),
        keyPoints: this.extractChunkKeyPoints(chunkMessages),
        sentiment: this.analyzeChunkSentiment(chunkMessages),
        createdAt: new Date()
      }
      
      chunks.push(chunk)
    }
    
    return chunks
  }

  private generateChunkSummary(messages: ThreadMessage[]): string {
    if (messages.length === 1) {
      return messages[0].body.substring(0, 200) + '...'
    }
    
    const firstMessage = messages[0]
    const lastMessage = messages[messages.length - 1]
    
    return `Exchange between ${firstMessage.from} and ${lastMessage.from} ` +
           `(${messages.length} messages). Started: ${firstMessage.timestamp.toLocaleDateString()}, ` +
           `Ended: ${lastMessage.timestamp.toLocaleDateString()}.`
  }

  private extractChunkKeyPoints(messages: ThreadMessage[]): string[] {
    const keyPoints: string[] = []
    
    messages.forEach(message => {
      if (message.subject && !message.subject.includes('Re:')) {
        keyPoints.push(message.subject)
      }
      
      // Extract first sentence of each message as key point
      const firstSentence = message.body.split('.')[0]
      if (firstSentence.length > 20) {
        keyPoints.push(firstSentence + '...')
      }
    })
    
    return keyPoints.slice(0, 3) // Limit to 3 key points per chunk
  }

  private analyzeChunkSentiment(messages: ThreadMessage[]): 'positive' | 'negative' | 'neutral' {
    const allText = messages.map(m => `${m.subject} ${m.body}`).join(' ').toLowerCase()
    
    if (allText.includes('thank') || allText.includes('great') || allText.includes('excellent')) {
      return 'positive'
    } else if (allText.includes('problem') || allText.includes('issue') || allText.includes('error')) {
      return 'negative'
    }
    
    return 'neutral'
  }

  async getThreadStats(): Promise<{
    totalThreads: number
    activeThreads: number
    averageMessageCount: number
    averageThreadDuration: number
    categoryDistribution: { [key: string]: number }
    priorityDistribution: { [key: string]: number }
  }> {
    const threads = Array.from(this.threadCache.values())
    
    const stats = {
      totalThreads: threads.length,
      activeThreads: threads.filter(t => t.isActive).length,
      averageMessageCount: threads.reduce((sum, t) => sum + t.messageCount, 0) / threads.length || 0,
      averageThreadDuration: threads.reduce((sum, t) => sum + (t.endDate.getTime() - t.startDate.getTime()), 0) / threads.length || 0,
      categoryDistribution: {} as { [key: string]: number },
      priorityDistribution: {} as { [key: string]: number }
    }
    
    // Calculate category distribution
    threads.forEach(thread => {
      thread.categories.forEach(category => {
        stats.categoryDistribution[category] = (stats.categoryDistribution[category] || 0) + 1
      })
    })
    
    // Calculate priority distribution
    threads.forEach(thread => {
      stats.priorityDistribution[thread.priority] = (stats.priorityDistribution[thread.priority] || 0) + 1
    })
    
    return stats
  }

  clearCache(): void {
    this.threadCache.clear()
    this.summaryCache.clear()
  }
}
