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

export interface EncryptionKey {
  key: CryptoKey
  algorithm: string
  keyId: string
  createdAt: Date
  expiresAt?: Date
}

export interface EncryptedData {
  data: string
  iv: string
  keyId: string
  algorithm: string
  timestamp: Date
}

export interface SecurityAudit {
  id: string
  type: 'encryption' | 'decryption' | 'key_generation' | 'key_rotation' | 'data_access'
  timestamp: Date
  success: boolean
  details: {
    keyId?: string
    dataSize?: number
    algorithm?: string
    error?: string
  }
}

export interface PrivacySettings {
  enableDataCollection: boolean
  enableAnalytics: boolean
  enableCrashReporting: boolean
  enablePerformanceMonitoring: boolean
  dataRetentionDays: number
  enableDataExport: boolean
  enableDataDeletion: boolean
  enablePIIRedaction: boolean
  enableEncryption: boolean
  enableAuditLogging: boolean
}

export interface DataRetentionPolicy {
  analysisData: number
  performanceMetrics: number
  auditLogs: number
  userSettings: number
  cachedModels: number
  embeddings: number
}

export interface DataExport {
  id: string
  type: 'full' | 'partial'
  data: any
  timestamp: Date
  size: number
  checksum: string
}

export interface DataDeletionRequest {
  id: string
  type: 'all' | 'analysis' | 'performance' | 'audit' | 'settings' | 'models' | 'embeddings'
  timestamp: Date
  status: 'pending' | 'completed' | 'failed'
  error?: string
}

export interface PrivacyAudit {
  id: string
  action: 'data_access' | 'data_export' | 'data_deletion' | 'settings_change' | 'consent_given' | 'consent_revoked'
  timestamp: Date
  details: {
    dataType?: string
    dataSize?: number
    userId?: string
    ipAddress?: string
    userAgent?: string
    consentType?: string
  }
}

export interface TestCase {
  id: string
  name: string
  description: string
  category: 'unit' | 'integration' | 'e2e' | 'performance' | 'security' | 'accessibility'
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  result?: TestResult
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
  test: () => Promise<TestResult>
}

export interface TestResult {
  passed: boolean
  duration: number
  error?: string
  details?: any
  timestamp: Date
}

export interface TestSuite {
  id: string
  name: string
  description: string
  tests: TestCase[]
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
}

export interface TestReport {
  id: string
  timestamp: Date
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  duration: number
  results: TestResult[]
  coverage?: CoverageReport
}

export interface CoverageReport {
  lines: { total: number; covered: number; percentage: number }
  functions: { total: number; covered: number; percentage: number }
  branches: { total: number; covered: number; percentage: number }
  statements: { total: number; covered: number; percentage: number }
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
