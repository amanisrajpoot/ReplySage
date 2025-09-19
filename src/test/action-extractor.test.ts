import { describe, it, expect, beforeEach } from 'vitest'
import { ActionExtractor } from '../utils/action-extractor'

describe('ActionExtractor', () => {
  let actionExtractor: ActionExtractor

  beforeEach(() => {
    actionExtractor = ActionExtractor.getInstance()
  })

  describe('action item extraction', () => {
    it('should extract simple action items', async () => {
      const text = 'Please review the document and send feedback by Friday.'
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems).toHaveLength(1)
      expect(actions.actionItems[0].text).toContain('review the document')
      expect(actions.actionItems[0].priority).toBeDefined()
      expect(actions.actionItems[0].category).toBeDefined()
    })

    it('should extract multiple action items', async () => {
      const text = `
        Please review the document and send feedback by Friday.
        Also, schedule a meeting with the team for next week.
        Don't forget to update the project status.
      `
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems.length).toBeGreaterThan(1)
      expect(actions.actionItems.every(action => action.text.length > 0)).toBe(true)
    })

    it('should extract action items with different priorities', async () => {
      const text = `
        URGENT: Fix the critical bug immediately.
        Please review the document when you have time.
        IMPORTANT: Update the documentation by end of week.
      `
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      const urgentAction = actions.actionItems.find(action => action.text.includes('critical bug'))
      const importantAction = actions.actionItems.find(action => action.text.includes('documentation'))
      
      expect(urgentAction?.priority).toBe('high')
      expect(importantAction?.priority).toBe('high')
    })

    it('should categorize action items correctly', async () => {
      const text = `
        Please review the document.
        Schedule a meeting for tomorrow.
        Send the invoice to the client.
        Update the project timeline.
      `
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      const reviewAction = actions.actionItems.find(action => action.text.includes('review'))
      const meetingAction = actions.actionItems.find(action => action.text.includes('meeting'))
      const invoiceAction = actions.actionItems.find(action => action.text.includes('invoice'))
      
      expect(reviewAction?.category).toBe('review')
      expect(meetingAction?.category).toBe('meeting')
      expect(invoiceAction?.category).toBe('communication')
    })
  })

  describe('date extraction', () => {
    it('should extract dates from action items', async () => {
      const text = 'Please review the document by Friday, December 15th.'
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems).toHaveLength(1)
      expect(actions.actionItems[0].dueDate).toBeDefined()
      expect(actions.actionItems[0].dueDate?.getDate()).toBe(15)
    })

    it('should extract relative dates', async () => {
      const text = 'Please complete this task by next week.'
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems).toHaveLength(1)
      expect(actions.actionItems[0].dueDate).toBeDefined()
    })

    it('should extract time-based dates', async () => {
      const text = 'Please attend the meeting tomorrow at 2 PM.'
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems).toHaveLength(1)
      expect(actions.actionItems[0].dueDate).toBeDefined()
    })

    it('should handle multiple dates in one text', async () => {
      const text = `
        Please review the document by Friday.
        Schedule a meeting for next Monday.
        Send the report by end of month.
      `
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems.length).toBeGreaterThan(1)
      expect(actions.actionItems.every(action => action.dueDate)).toBe(true)
    })
  })

  describe('priority classification', () => {
    it('should classify urgent actions as high priority', async () => {
      const text = 'URGENT: Fix the critical bug immediately.'
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems[0].priority).toBe('high')
    })

    it('should classify important actions as high priority', async () => {
      const text = 'IMPORTANT: Update the documentation.'
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems[0].priority).toBe('high')
    })

    it('should classify regular actions as medium priority', async () => {
      const text = 'Please review the document.'
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems[0].priority).toBe('medium')
    })

    it('should classify optional actions as low priority', async () => {
      const text = 'If you have time, please review the document.'
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems[0].priority).toBe('low')
    })
  })

  describe('edge cases', () => {
    it('should handle empty text', async () => {
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: '',
        timestamp: new Date(),
        threadId: 'test'
      })
      expect(actions.actionItems).toHaveLength(0)
    })

    it('should handle text without action items', async () => {
      const text = 'This is just an informational email with no actions required.'
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      expect(actions.actionItems).toHaveLength(0)
    })

    it('should handle very long text', async () => {
      const text = 'Please review the document. '.repeat(1000)
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems).toHaveLength(1)
      expect(actions.actionItems[0].text).toContain('review the document')
    })

    it('should handle text with special characters', async () => {
      const text = 'Please review the document (v2.1) and send feedback by Friday!'
      const actions = await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      
      expect(actions.actionItems).toHaveLength(1)
      expect(actions.actionItems[0].text).toContain('review the document')
    })
  })

  describe('performance', () => {
    it('should process text quickly', async () => {
      const start = Date.now()
      const text = 'Please review the document and send feedback by Friday.'
      await actionExtractor.extractActions({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: text,
        timestamp: new Date(),
        threadId: 'test'
      })
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100) // Should complete within 100ms
    })
  })
})
