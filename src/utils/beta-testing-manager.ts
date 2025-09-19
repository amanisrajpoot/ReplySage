import { v4 as uuidv4 } from 'uuid'

export interface BetaTester {
  id: string
  email: string
  name: string
  role: string
  company: string
  joinDate: Date
  lastActive: Date
  feedbackCount: number
  bugReports: number
  featureRequests: number
  status: 'active' | 'inactive' | 'banned'
  preferences: {
    emailNotifications: boolean
    weeklyReports: boolean
    betaFeatures: boolean
  }
}

export interface BetaFeedback {
  id: string
  testerId: string
  type: 'bug' | 'feature' | 'general' | 'performance'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  createdAt: Date
  updatedAt: Date
  attachments?: string[]
  tags: string[]
  votes: number
  assignedTo?: string
}

export interface BetaTestSession {
  id: string
  testerId: string
  startTime: Date
  endTime?: Date
  duration?: number
  actions: TestAction[]
  errors: TestError[]
  performance: PerformanceMetrics
  feedback?: string
}

export interface TestAction {
  id: string
  type: string
  timestamp: Date
  details: Record<string, any>
  success: boolean
  duration: number
}

export interface TestError {
  id: string
  type: string
  message: string
  stack?: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolved: boolean
}

export interface PerformanceMetrics {
  memoryUsage: number
  cpuUsage: number
  networkLatency: number
  responseTime: number
  errorRate: number
  successRate: number
}

export interface BetaTestReport {
  id: string
  period: { start: Date; end: Date }
  totalTesters: number
  activeTesters: number
  totalSessions: number
  totalFeedback: number
  bugReports: number
  featureRequests: number
  performanceScore: number
  satisfactionScore: number
  topIssues: string[]
  recommendations: string[]
  generatedAt: Date
}

export class BetaTestingManager {
  private static instance: BetaTestingManager
  private testers: Map<string, BetaTester> = new Map()
  private feedback: Map<string, BetaFeedback> = new Map()
  private sessions: Map<string, BetaTestSession> = new Map()
  private currentSession: BetaTestSession | null = null

  private constructor() {}

  public static getInstance(): BetaTestingManager {
    if (!BetaTestingManager.instance) {
      BetaTestingManager.instance = new BetaTestingManager()
    }
    return BetaTestingManager.instance
  }

  public async initialize(): Promise<void> {
    // Load existing data from storage
    await this.loadData()
  }

  private async loadData(): Promise<void> {
    try {
      const data = await chrome.storage.local.get(['betaTesters', 'betaFeedback', 'betaSessions'])
      
      if (data.betaTesters) {
        this.testers = new Map(JSON.parse(data.betaTesters))
      }
      
      if (data.betaFeedback) {
        this.feedback = new Map(JSON.parse(data.betaFeedback))
      }
      
      if (data.betaSessions) {
        this.sessions = new Map(JSON.parse(data.betaSessions))
      }
    } catch (error) {
      console.error('Failed to load beta testing data:', error)
    }
  }

  private async saveData(): Promise<void> {
    try {
      await chrome.storage.local.set({
        betaTesters: JSON.stringify(Array.from(this.testers.entries())),
        betaFeedback: JSON.stringify(Array.from(this.feedback.entries())),
        betaSessions: JSON.stringify(Array.from(this.sessions.entries()))
      })
    } catch (error) {
      console.error('Failed to save beta testing data:', error)
    }
  }

  public async registerTester(testerData: Omit<BetaTester, 'id' | 'joinDate' | 'lastActive' | 'feedbackCount' | 'bugReports' | 'featureRequests'>): Promise<string> {
    const tester: BetaTester = {
      id: uuidv4(),
      ...testerData,
      joinDate: new Date(),
      lastActive: new Date(),
      feedbackCount: 0,
      bugReports: 0,
      featureRequests: 0,
      status: 'active'
    }

    this.testers.set(tester.id, tester)
    await this.saveData()
    
    return tester.id
  }

  public getTester(testerId: string): BetaTester | undefined {
    return this.testers.get(testerId)
  }

  public getAllTesters(): BetaTester[] {
    return Array.from(this.testers.values())
  }

  public getActiveTesters(): BetaTester[] {
    return Array.from(this.testers.values()).filter(t => t.status === 'active')
  }

  public async updateTesterStatus(testerId: string, status: BetaTester['status']): Promise<void> {
    const tester = this.testers.get(testerId)
    if (tester) {
      tester.status = status
      await this.saveData()
    }
  }

  public async startTestSession(testerId: string): Promise<string> {
    const session: BetaTestSession = {
      id: uuidv4(),
      testerId,
      startTime: new Date(),
      actions: [],
      errors: [],
      performance: {
        memoryUsage: 0,
        cpuUsage: 0,
        networkLatency: 0,
        responseTime: 0,
        errorRate: 0,
        successRate: 100
      }
    }

    this.sessions.set(session.id, session)
    this.currentSession = session
    await this.saveData()
    
    return session.id
  }

  public async endTestSession(sessionId: string, feedback?: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.endTime = new Date()
      session.duration = session.endTime.getTime() - session.startTime.getTime()
      session.feedback = feedback
      
      // Update tester activity
      const tester = this.testers.get(session.testerId)
      if (tester) {
        tester.lastActive = new Date()
      }
      
      await this.saveData()
    }
  }

  public async logAction(action: Omit<TestAction, 'id' | 'timestamp'>): Promise<void> {
    if (this.currentSession) {
      const testAction: TestAction = {
        id: uuidv4(),
        timestamp: new Date(),
        ...action
      }
      
      this.currentSession.actions.push(testAction)
      await this.saveData()
    }
  }

  public async logError(error: Omit<TestError, 'id' | 'timestamp'>): Promise<void> {
    if (this.currentSession) {
      const testError: TestError = {
        id: uuidv4(),
        timestamp: new Date(),
        ...error
      }
      
      this.currentSession.errors.push(testError)
      await this.saveData()
    }
  }

  public async submitFeedback(feedback: Omit<BetaFeedback, 'id' | 'createdAt' | 'updatedAt' | 'votes'>): Promise<string> {
    const feedbackItem: BetaFeedback = {
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      votes: 0,
      ...feedback
    }

    this.feedback.set(feedbackItem.id, feedbackItem)
    
    // Update tester stats
    const tester = this.testers.get(feedback.testerId)
    if (tester) {
      tester.feedbackCount++
      if (feedback.type === 'bug') {
        tester.bugReports++
      } else if (feedback.type === 'feature') {
        tester.featureRequests++
      }
    }
    
    await this.saveData()
    return feedbackItem.id
  }

  public getFeedback(feedbackId: string): BetaFeedback | undefined {
    return this.feedback.get(feedbackId)
  }

  public getAllFeedback(): BetaFeedback[] {
    return Array.from(this.feedback.values())
  }

  public getFeedbackByType(type: BetaFeedback['type']): BetaFeedback[] {
    return Array.from(this.feedback.values()).filter(f => f.type === type)
  }

  public getFeedbackByTester(testerId: string): BetaFeedback[] {
    return Array.from(this.feedback.values()).filter(f => f.testerId === testerId)
  }

  public async updateFeedbackStatus(feedbackId: string, status: BetaFeedback['status']): Promise<void> {
    const feedback = this.feedback.get(feedbackId)
    if (feedback) {
      feedback.status = status
      feedback.updatedAt = new Date()
      await this.saveData()
    }
  }

  public async voteFeedback(feedbackId: string, vote: 'up' | 'down'): Promise<void> {
    const feedback = this.feedback.get(feedbackId)
    if (feedback) {
      feedback.votes += vote === 'up' ? 1 : -1
      await this.saveData()
    }
  }

  public getSession(sessionId: string): BetaTestSession | undefined {
    return this.sessions.get(sessionId)
  }

  public getSessionsByTester(testerId: string): BetaTestSession[] {
    return Array.from(this.sessions.values()).filter(s => s.testerId === testerId)
  }

  public async generateReport(period: { start: Date; end: Date }): Promise<BetaTestReport> {
    const testers = this.getAllTesters()
    const activeTesters = this.getActiveTesters()
    const sessions = Array.from(this.sessions.values()).filter(s => 
      s.startTime >= period.start && s.startTime <= period.end
    )
    const feedback = Array.from(this.feedback.values()).filter(f => 
      f.createdAt >= period.start && f.createdAt <= period.end
    )

    const bugReports = feedback.filter(f => f.type === 'bug').length
    const featureRequests = feedback.filter(f => f.type === 'feature').length

    // Calculate performance score
    const totalSessions = sessions.length
    const successfulSessions = sessions.filter(s => s.errors.length === 0).length
    const performanceScore = totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0

    // Calculate satisfaction score (based on feedback sentiment)
    const satisfactionScore = 85 // Placeholder - would be calculated from feedback analysis

    // Get top issues
    const topIssues = this.getTopIssues(feedback)

    // Generate recommendations
    const recommendations = this.generateRecommendations(feedback, sessions)

    const report: BetaTestReport = {
      id: uuidv4(),
      period,
      totalTesters: testers.length,
      activeTesters: activeTesters.length,
      totalSessions: sessions.length,
      totalFeedback: feedback.length,
      bugReports,
      featureRequests,
      performanceScore,
      satisfactionScore,
      topIssues,
      recommendations,
      generatedAt: new Date()
    }

    return report
  }

  private getTopIssues(feedback: BetaFeedback[]): string[] {
    const issueCounts = new Map<string, number>()
    
    feedback.forEach(f => {
      f.tags.forEach(tag => {
        issueCounts.set(tag, (issueCounts.get(tag) || 0) + 1)
      })
    })

    return Array.from(issueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue)
  }

  private generateRecommendations(feedback: BetaFeedback[], sessions: BetaTestSession[]): string[] {
    const recommendations: string[] = []

    // Analyze feedback patterns
    const bugCount = feedback.filter(f => f.type === 'bug').length
    const featureCount = feedback.filter(f => f.type === 'feature').length

    if (bugCount > featureCount * 2) {
      recommendations.push('Focus on bug fixes before adding new features')
    }

    if (featureCount > bugCount * 2) {
      recommendations.push('Consider implementing requested features to improve user satisfaction')
    }

    // Analyze performance issues
    const slowSessions = sessions.filter(s => s.performance.responseTime > 5000).length
    if (slowSessions > sessions.length * 0.2) {
      recommendations.push('Investigate performance issues - 20% of sessions are slow')
    }

    // Analyze error patterns
    const criticalErrors = sessions.reduce((sum, s) => 
      sum + s.errors.filter(e => e.severity === 'critical').length, 0
    )
    if (criticalErrors > 0) {
      recommendations.push('Address critical errors immediately')
    }

    return recommendations
  }

  public async exportData(): Promise<{
    testers: BetaTester[]
    feedback: BetaFeedback[]
    sessions: BetaTestSession[]
  }> {
    return {
      testers: this.getAllTesters(),
      feedback: this.getAllFeedback(),
      sessions: Array.from(this.sessions.values())
    }
  }

  public async clearData(): Promise<void> {
    this.testers.clear()
    this.feedback.clear()
    this.sessions.clear()
    this.currentSession = null
    await this.saveData()
  }
}
