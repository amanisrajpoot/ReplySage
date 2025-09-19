import { LocalAIManager } from './ai-models'
import { EmailMessage } from '@/types'

export class AITest {
  private aiManager: LocalAIManager

  constructor() {
    this.aiManager = LocalAIManager.getInstance()
  }

  async runBasicTest(): Promise<boolean> {
    try {
      console.log('ReplySage: Starting AI model test...')
      
      // Initialize AI manager
      await this.aiManager.initialize()
      console.log('ReplySage: AI manager initialized')
      
      // Create a test email
      const testEmail: EmailMessage = {
        id: 'test-email-1',
        subject: 'Meeting Request - Project Review',
        from: 'john.doe@company.com',
        to: ['you@company.com'],
        body: 'Hi, I would like to schedule a meeting to review the project progress. Please let me know if you are available tomorrow at 2 PM. We need to discuss the budget and timeline. Thanks!',
        attachments: [],
        timestamp: new Date(),
        isRead: false,
        isImportant: false
      }
      
      // Test email analysis
      console.log('ReplySage: Testing email analysis...')
      const analysis = await this.aiManager.analyzeEmail(testEmail)
      
      // Verify analysis results
      if (!analysis) {
        throw new Error('Analysis returned null')
      }
      
      if (!analysis.summary || analysis.summary.length === 0) {
        throw new Error('Summary is empty')
      }
      
      if (!Array.isArray(analysis.actionItems)) {
        throw new Error('Action items is not an array')
      }
      
      if (!Array.isArray(analysis.suggestedReplies)) {
        throw new Error('Suggested replies is not an array')
      }
      
      console.log('ReplySage: AI model test completed successfully')
      console.log('ReplySage: Test results:', {
        summary: analysis.summary,
        actionItemsCount: analysis.actionItems.length,
        suggestedRepliesCount: analysis.suggestedReplies.length,
        sentiment: analysis.sentiment,
        priority: analysis.priority,
        categories: analysis.categories
      })
      
      return true
    } catch (error) {
      console.error('ReplySage: AI model test failed:', error)
      return false
    }
  }

  async runPerformanceTest(): Promise<{
    success: boolean
    averageTime: number
    errorRate: number
  }> {
    try {
      console.log('ReplySage: Starting performance test...')
      
      const testEmails: EmailMessage[] = [
        {
          id: 'test-1',
          subject: 'Quick Question',
          from: 'colleague@company.com',
          to: ['you@company.com'],
          body: 'Can you help me with the report?',
          attachments: [],
          timestamp: new Date(),
          isRead: false,
          isImportant: false
        },
        {
          id: 'test-2',
          subject: 'Project Update',
          from: 'manager@company.com',
          to: ['you@company.com'],
          body: 'The project is on track. We need to finish the documentation by Friday. Please review the attached files and provide feedback.',
          attachments: [],
          timestamp: new Date(),
          isRead: false,
          isImportant: true
        },
        {
          id: 'test-3',
          subject: 'Meeting Cancelled',
          from: 'scheduler@company.com',
          to: ['you@company.com'],
          body: 'Unfortunately, we need to cancel tomorrow\'s meeting due to a conflict. We will reschedule for next week.',
          attachments: [],
          timestamp: new Date(),
          isRead: false,
          isImportant: false
        }
      ]
      
      const times: number[] = []
      let errors = 0
      
      for (const email of testEmails) {
        try {
          const startTime = performance.now()
          await this.aiManager.analyzeEmail(email)
          const endTime = performance.now()
          
          times.push(endTime - startTime)
          console.log(`ReplySage: Processed email ${email.id} in ${endTime - startTime}ms`)
        } catch (error) {
          console.error(`ReplySage: Error processing email ${email.id}:`, error)
          errors++
        }
      }
      
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const errorRate = (errors / testEmails.length) * 100
      
      console.log('ReplySage: Performance test completed', {
        averageTime: `${averageTime.toFixed(2)}ms`,
        errorRate: `${errorRate.toFixed(2)}%`
      })
      
      return {
        success: errorRate < 50, // Consider successful if less than 50% errors
        averageTime,
        errorRate
      }
    } catch (error) {
      console.error('ReplySage: Performance test failed:', error)
      return {
        success: false,
        averageTime: 0,
        errorRate: 100
      }
    }
  }

  async runModelStatusTest(): Promise<boolean> {
    try {
      console.log('ReplySage: Testing model status...')
      
      const modelStatus = await this.aiManager.getModelStatus()
      
      if (!Array.isArray(modelStatus)) {
        throw new Error('Model status is not an array')
      }
      
      if (modelStatus.length === 0) {
        throw new Error('No models found')
      }
      
      console.log('ReplySage: Model status test completed', {
        modelCount: modelStatus.length,
        models: modelStatus.map(m => ({ name: m.name, loaded: m.loaded }))
      })
      
      return true
    } catch (error) {
      console.error('ReplySage: Model status test failed:', error)
      return false
    }
  }

  async runAllTests(): Promise<{
    basicTest: boolean
    performanceTest: { success: boolean; averageTime: number; errorRate: number }
    modelStatusTest: boolean
    overallSuccess: boolean
  }> {
    console.log('ReplySage: Running all AI tests...')
    
    const basicTest = await this.runBasicTest()
    const performanceTest = await this.runPerformanceTest()
    const modelStatusTest = await this.runModelStatusTest()
    
    const overallSuccess = basicTest && performanceTest.success && modelStatusTest
    
    console.log('ReplySage: All tests completed', {
      basicTest,
      performanceTest,
      modelStatusTest,
      overallSuccess
    })
    
    return {
      basicTest,
      performanceTest,
      modelStatusTest,
      overallSuccess
    }
  }
}

// Export for use in other parts of the application
export const aiTest = new AITest()
