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

export interface EmbeddingVector {
  id: string
  messageId: string
  text: string
  vector: number[]
  metadata: {
    subject: string
    sender: string
    timestamp: Date
    threadId?: string
    category?: string
    priority?: string
  }
  createdAt: Date
}

export interface SimilarityResult {
  messageId: string
  similarity: number
  text: string
  metadata: EmbeddingVector['metadata']
  distance: number
}

export interface SearchQuery {
  text: string
  limit?: number
  threshold?: number
  category?: string
  dateRange?: {
    start: Date
    end: Date
  }
  sender?: string
}

export interface EmbeddingSearchResult {
  results: SimilarityResult[]
  totalFound: number
  query: string
  processingTime: number
}

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

export interface PerformanceMetric {
  id: string
  name: string
  type: 'timing' | 'memory' | 'cpu' | 'network' | 'custom'
  value: number
  unit: string
  timestamp: Date
  context?: {
    modelName?: string
    operation?: string
    messageId?: string
    threadId?: string
  }
}

export interface PerformanceStats {
  totalOperations: number
  averageLatency: number
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  cpuUsage: {
    average: number
    peak: number
  }
  networkUsage: {
    requests: number
    bytesTransferred: number
  }
  modelPerformance: {
    [modelName: string]: {
      averageLatency: number
      successRate: number
      memoryUsage: number
    }
  }
}

export interface ModelPerformanceMetrics {
  modelName: string
  averageLatency: number
  memoryUsage: number
  accuracy: number
  throughput: number
  lastUsed: Date
  usageCount: number
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
  cloudConsentGiven: boolean
  preferredCloudProvider: string
  maxCloudCostPerDay: number
  enableCloudNotifications: boolean
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
