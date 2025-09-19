export interface EmailMessage {
  id: string
  subject: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  body: string
  htmlBody?: string
  attachments: Attachment[]
  timestamp: Date
  threadId?: string
  isRead: boolean
  isImportant: boolean
  labels?: string[]
}

export interface Attachment {
  name: string
  size: number
  type: string
  url?: string
}

export interface AnalysisResult {
  messageId: string
  summary: string
  actionItems: ActionItem[]
  suggestedReplies: SuggestedReply[]
  grammarIssues: GrammarIssue[]
  sentiment: 'positive' | 'negative' | 'neutral'
  priority: 'high' | 'medium' | 'low'
  categories: string[]
  extractedDates: ExtractedDate[]
  createdAt: Date
  modelUsed: 'local' | 'cloud'
}

export interface ActionItem {
  text: string
  dueDate?: Date
  priority: 'high' | 'medium' | 'low'
  category: string
  isCompleted: boolean
}

export interface SuggestedReply {
  text: string
  tone: 'formal' | 'casual' | 'concise'
  length: 'short' | 'medium' | 'long'
  confidence: number
}

export interface GrammarIssue {
  text: string
  suggestion: string
  severity: 'error' | 'warning' | 'info'
  position: {
    start: number
    end: number
  }
}

export interface ExtractedDate {
  text: string
  date: Date
  type: 'deadline' | 'meeting' | 'event' | 'general'
  confidence: number
}

export interface UserSettings {
  enableLocalProcessing: boolean
  enableCloudFallback: boolean
  userApiKey?: string
  enablePIIRedaction: boolean
  enableCaching: boolean
  enableAnalytics: boolean
  preferredTone: 'formal' | 'casual' | 'concise'
  maxSummaryLength: number
  enableThreadAnalysis: boolean
  enableSimilaritySearch: boolean
}

export interface CloudProvider {
  name: string
  apiKey: string
  baseUrl: string
  model: string
}

export interface ProcessingJob {
  id: string
  messageId: string
  type: 'grammar' | 'summary' | 'action_items' | 'reply_suggestion' | 'thread_summary'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: AnalysisResult
  error?: string
  createdAt: Date
  completedAt?: Date
}

export interface CacheEntry {
  key: string
  data: any
  expiresAt: Date
  encrypted: boolean
}
