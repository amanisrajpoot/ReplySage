import { describe, it, expect, beforeEach } from 'vitest'
import { LocalAIManager } from '../utils/ai-models'
// import { ActionExtractor } from '../utils/action-extractor'
import { EmbeddingsManager } from '../utils/embeddings-manager'

export interface EmailTestData {
  subject: string
  sender: string
  body: string
  expectedActions: number
  expectedSentiment: 'positive' | 'negative' | 'neutral'
  expectedCategory: string
}

export class RealWorldTester {
  private aiManager: LocalAIManager
  // private _actionExtractor: ActionExtractor
  private embeddingsManager: EmbeddingsManager
  private testResults: TestResult[] = []

  constructor() {
    this.aiManager = LocalAIManager.getInstance()
    // this._actionExtractor = ActionExtractor.getInstance()
    this.embeddingsManager = EmbeddingsManager.getInstance()
  }

  public async initialize(): Promise<void> {
    await this.aiManager.initialize()
    await this.embeddingsManager.initialize()
  }

  public getTestEmailData(): EmailTestData[] {
    return [
      {
        subject: 'Meeting Request - Project Review',
        sender: 'john.doe@company.com',
        body: `
          Hi Team,
          
          I hope this email finds you well. I would like to schedule a meeting to review our project progress.
          
          Please let me know your availability for next week. I suggest we meet on Tuesday or Wednesday afternoon.
          
          Agenda:
          - Review current status
          - Discuss upcoming milestones
          - Address any concerns
          
          Please confirm your attendance by Friday.
          
          Best regards,
          John
        `,
        expectedActions: 2,
        expectedSentiment: 'neutral',
        expectedCategory: 'meeting'
      },
      {
        subject: 'URGENT: Critical Bug Fix Required',
        sender: 'sarah.smith@company.com',
        body: `
          Hi All,
          
          We have discovered a critical bug in our production system that needs immediate attention.
          
          The issue affects user authentication and could lead to security vulnerabilities.
          
          Please:
          1. Review the attached bug report
          2. Implement a fix by end of day
          3. Test the fix thoroughly
          4. Deploy to production ASAP
          
          This is a high priority issue that cannot wait.
          
          Thanks,
          Sarah
        `,
        expectedActions: 4,
        expectedSentiment: 'negative',
        expectedCategory: 'urgent'
      },
      {
        subject: 'Great work on the project!',
        sender: 'mike.wilson@company.com',
        body: `
          Hi Team,
          
          I wanted to take a moment to congratulate everyone on the excellent work done on the recent project.
          
          The client was very impressed with our delivery and has already requested us for their next project.
          
          Special thanks to:
          - Alice for her outstanding design work
          - Bob for his technical expertise
          - Carol for her project management skills
          
          Keep up the great work!
          
          Best,
          Mike
        `,
        expectedActions: 0,
        expectedSentiment: 'positive',
        expectedCategory: 'praise'
      },
      {
        subject: 'Invoice #12345 - Payment Due',
        sender: 'billing@vendor.com',
        body: `
          Dear Customer,
          
          This is a reminder that invoice #12345 for $2,500.00 is due for payment.
          
          Payment details:
          - Amount: $2,500.00
          - Due Date: December 31, 2024
          - Payment Method: Bank Transfer or Credit Card
          
          Please process payment by the due date to avoid late fees.
          
          If you have any questions, please contact our billing department.
          
          Thank you,
          Billing Team
        `,
        expectedActions: 1,
        expectedSentiment: 'neutral',
        expectedCategory: 'billing'
      }
    ]
  }

  public async testEmailAnalysis(emailData: EmailTestData): Promise<TestResult> {
    const startTime = Date.now()
    const result: TestResult = {
      testName: `Email Analysis - ${emailData.subject}`,
      passed: true,
      duration: 0,
      errors: [],
      details: {}
    }

    try {
      // Test summarization
      const summary = await this.aiManager.analyzeEmail({
        id: 'test-id',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: emailData.subject,
        from: emailData.sender,
        body: emailData.body,
        timestamp: new Date(),
        threadId: 'test-thread'
      })
      result.details.summary = summary.summary
      result.details.summaryLength = summary.summary.length

      // Test sentiment analysis
      result.details.sentiment = summary.sentiment
      result.details.sentimentMatch = summary.sentiment === emailData.expectedSentiment

      // Test action extraction
      result.details.actions = summary.actionItems
      result.details.actionCount = summary.actionItems.length
      result.details.actionCountMatch = summary.actionItems.length === emailData.expectedActions

      // Test embeddings
      const embedding = await this.embeddingsManager.generateEmbedding(emailData.body)
      result.details.embedding = embedding
      result.details.embeddingLength = embedding.length

      // Test reply generation
      const reply = await this.aiManager.generateReplies({
        id: 'test-id',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: emailData.subject,
        from: emailData.sender,
        body: emailData.body,
        timestamp: new Date(),
        threadId: 'test-thread'
      }, 'reply')
      result.details.reply = reply.replies[0]?.text || ''
      result.details.replyLength = reply.replies[0]?.text?.length || 0

      // Validate results
      if (!result.details.sentimentMatch) {
        result.passed = false
        result.errors.push(`Sentiment mismatch: expected ${emailData.expectedSentiment}, got ${summary.sentiment}`)
      }

      if (!result.details.actionCountMatch) {
        result.passed = false
        result.errors.push(`Action count mismatch: expected ${emailData.expectedActions}, got ${summary.actionItems.length}`)
      }

      if (summary.summary.length === 0) {
        result.passed = false
        result.errors.push('Summary is empty')
      }

      if (embedding.length === 0) {
        result.passed = false
        result.errors.push('Embedding is empty')
      }

    } catch (error) {
      result.passed = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    result.duration = Date.now() - startTime
    this.testResults.push(result)
    return result
  }

  public async runAllTests(): Promise<TestResult[]> {
    await this.initialize()
    
    const emailData = this.getTestEmailData()
    const results: TestResult[] = []

    for (const email of emailData) {
      const result = await this.testEmailAnalysis(email)
      results.push(result)
    }

    return results
  }

  public getTestSummary(): TestSummary {
    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0)
    const averageDuration = totalDuration / totalTests

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      totalDuration,
      averageDuration,
      results: this.testResults
    }
  }

  public async testGmailIntegration(): Promise<TestResult> {
    const result: TestResult = {
      testName: 'Gmail Integration Test',
      passed: true,
      duration: 0,
      errors: [],
      details: {}
    }

    const startTime = Date.now()

    try {
      // Test Gmail DOM selectors
      const gmailSelectors = {
        subject: '[data-thread-perm-id]',
        sender: '[email]',
        body: '[role="listitem"] [role="listitem"]'
      }

      // Check if Gmail elements exist
      const subjectElement = document.querySelector(gmailSelectors.subject)
      const senderElement = document.querySelector(gmailSelectors.sender)
      const bodyElement = document.querySelector(gmailSelectors.body)

      result.details.gmailElementsFound = {
        subject: !!subjectElement,
        sender: !!senderElement,
        body: !!bodyElement
      }

      if (!subjectElement || !senderElement || !bodyElement) {
        result.passed = false
        result.errors.push('Gmail DOM elements not found')
      }

      // Test extension injection
      const extensionElement = document.querySelector('#replysage-sidebar')
      result.details.extensionInjected = !!extensionElement

      if (!extensionElement) {
        result.passed = false
        result.errors.push('Extension UI not injected')
      }

    } catch (error) {
      result.passed = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    result.duration = Date.now() - startTime
    return result
  }

  public async testOutlookIntegration(): Promise<TestResult> {
    const result: TestResult = {
      testName: 'Outlook Integration Test',
      passed: true,
      duration: 0,
      errors: [],
      details: {}
    }

    const startTime = Date.now()

    try {
      // Test Outlook DOM selectors
      const outlookSelectors = {
        subject: '[data-automation-id="message-subject"]',
        sender: '[data-automation-id="message-sender"]',
        body: '[data-automation-id="message-body"]'
      }

      // Check if Outlook elements exist
      const subjectElement = document.querySelector(outlookSelectors.subject)
      const senderElement = document.querySelector(outlookSelectors.sender)
      const bodyElement = document.querySelector(outlookSelectors.body)

      result.details.outlookElementsFound = {
        subject: !!subjectElement,
        sender: !!senderElement,
        body: !!bodyElement
      }

      if (!subjectElement || !senderElement || !bodyElement) {
        result.passed = false
        result.errors.push('Outlook DOM elements not found')
      }

      // Test extension injection
      const extensionElement = document.querySelector('#replysage-sidebar')
      result.details.extensionInjected = !!extensionElement

      if (!extensionElement) {
        result.passed = false
        result.errors.push('Extension UI not injected')
      }

    } catch (error) {
      result.passed = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    result.duration = Date.now() - startTime
    return result
  }
}

interface TestResult {
  testName: string
  passed: boolean
  duration: number
  errors: string[]
  details: Record<string, any>
}

interface TestSummary {
  totalTests: number
  passedTests: number
  failedTests: number
  successRate: number
  totalDuration: number
  averageDuration: number
  results: TestResult[]
}

// Test suite for real-world testing
describe('Real World Testing', () => {
  let tester: RealWorldTester

  beforeEach(() => {
    tester = new RealWorldTester()
  })

  describe('Email Analysis Tests', () => {
    it('should analyze meeting request emails correctly', async () => {
      const emailData = tester.getTestEmailData()[0] // Meeting request
      const result = await tester.testEmailAnalysis(emailData)
      
      expect(result.passed).toBe(true)
      expect(result.details.actionCountMatch).toBe(true)
      expect(result.details.sentimentMatch).toBe(true)
    })

    it('should analyze urgent emails correctly', async () => {
      const emailData = tester.getTestEmailData()[1] // Urgent bug fix
      const result = await tester.testEmailAnalysis(emailData)
      
      expect(result.passed).toBe(true)
      expect(result.details.actionCountMatch).toBe(true)
      expect(result.details.sentimentMatch).toBe(true)
    })

    it('should analyze positive emails correctly', async () => {
      const emailData = tester.getTestEmailData()[2] // Praise email
      const result = await tester.testEmailAnalysis(emailData)
      
      expect(result.passed).toBe(true)
      expect(result.details.sentimentMatch).toBe(true)
    })

    it('should analyze billing emails correctly', async () => {
      const emailData = tester.getTestEmailData()[3] // Invoice email
      const result = await tester.testEmailAnalysis(emailData)
      
      expect(result.passed).toBe(true)
      expect(result.details.actionCountMatch).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    it('should integrate with Gmail', async () => {
      const result = await tester.testGmailIntegration()
      expect(result.passed).toBe(true)
    })

    it('should integrate with Outlook', async () => {
      const result = await tester.testOutlookIntegration()
      expect(result.passed).toBe(true)
    })
  })

  describe('Performance Tests', () => {
    it('should complete all tests within reasonable time', async () => {
      const start = Date.now()
      await tester.runAllTests()
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(30000) // Should complete within 30 seconds
    })

    it('should have high success rate', async () => {
      await tester.runAllTests()
      const summary = tester.getTestSummary()
      
      expect(summary.successRate).toBeGreaterThan(80) // At least 80% success rate
    })
  })
})
