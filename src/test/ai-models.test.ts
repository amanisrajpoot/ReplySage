import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LocalAIManager } from '../utils/ai-models'

describe('LocalAIManager', () => {
  let aiManager: LocalAIManager

  beforeEach(() => {
    aiManager = LocalAIManager.getInstance()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(aiManager.initialize()).resolves.not.toThrow()
    })

    it('should be a singleton', () => {
      const instance1 = LocalAIManager.getInstance()
      const instance2 = LocalAIManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('summarization', () => {
    it('should generate summary for short text', async () => {
      await aiManager.initialize()
      
      const text = 'This is a test email about a meeting tomorrow at 2 PM.'
      const result = await aiManager.analyzeEmail({
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
      const summary = result.summary
      
      expect(summary).toBeDefined()
      expect(typeof summary).toBe('string')
      expect(summary.length).toBeGreaterThan(0)
      expect(summary.length).toBeLessThan(text.length)
    })

    it('should handle empty text', async () => {
      await aiManager.initialize()
      
      const result = await aiManager.analyzeEmail({
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
      const summary = result.summary
      expect(summary).toBeDefined()
      expect(typeof summary).toBe('string')
    })

    it('should handle long text', async () => {
      await aiManager.initialize()
      
      const longText = 'This is a very long email with multiple paragraphs. '.repeat(100)
      const result = await aiManager.analyzeEmail({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: longText,
        timestamp: new Date(),
        threadId: 'test'
      })
      const summary = result.summary
      
      expect(summary).toBeDefined()
      expect(typeof summary).toBe('string')
      expect(summary.length).toBeLessThan(longText.length)
    })
  })

  describe('text generation', () => {
    it('should generate reply for email', async () => {
      await aiManager.initialize()
      
      const emailText = 'Hi, can we schedule a meeting for next week?'
      const reply = await aiManager.generateReplies({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: emailText,
        timestamp: new Date(),
        threadId: 'test'
      }, 'reply')
      
      expect(reply).toBeDefined()
      expect(typeof reply).toBe('string')
      expect(reply.replies.length).toBeGreaterThan(0)
    })

    it('should generate different types of content', async () => {
      await aiManager.initialize()
      
      const emailText = 'Please review the attached document.'
      const reply = await aiManager.generateReplies({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: emailText,
        timestamp: new Date(),
        threadId: 'test'
      }, 'reply')
      const result = await aiManager.analyzeEmail({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: emailText,
        timestamp: new Date(),
        threadId: 'test'
      })
      const summary = result.summary
      
      expect(reply).toBeDefined()
      expect(summary).toBeDefined()
      expect(reply).not.toBe(summary)
    })
  })

  describe('embeddings', () => {
    it('should generate embeddings for text', async () => {
      await aiManager.initialize()
      
      const text = 'This is a test email about a project update.'
      const embedding = await aiManager.generateEmbedding(text)
      
      expect(embedding).toBeDefined()
      expect(Array.isArray(embedding)).toBe(true)
      expect(embedding.length).toBeGreaterThan(0)
      expect(typeof embedding[0]).toBe('number')
    })

    it('should generate consistent embeddings for same text', async () => {
      await aiManager.initialize()
      
      const text = 'Consistent test text for embedding.'
      const embedding1 = await aiManager.generateEmbedding(text)
      const embedding2 = await aiManager.generateEmbedding(text)
      
      expect(embedding1).toEqual(embedding2)
    })

    it('should generate different embeddings for different text', async () => {
      await aiManager.initialize()
      
      const text1 = 'First test text.'
      const text2 = 'Second test text.'
      const embedding1 = await aiManager.generateEmbedding(text1)
      const embedding2 = await aiManager.generateEmbedding(text2)
      
      expect(embedding1).not.toEqual(embedding2)
    })
  })

  describe('sentiment analysis', () => {
    it('should analyze positive sentiment', async () => {
      await aiManager.initialize()
      
      const text = 'Great work on the project! I am very happy with the results.'
      const result = await aiManager.analyzeEmail({
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
      const sentiment = result.sentiment
      
      expect(sentiment).toBeDefined()
      expect(typeof sentiment).toBe('string')
      expect(['positive', 'negative', 'neutral']).toContain(sentiment)
    })

    it('should analyze negative sentiment', async () => {
      await aiManager.initialize()
      
      const text = 'I am disappointed with the quality of this work.'
      const result = await aiManager.analyzeEmail({
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
      const sentiment = result.sentiment
      
      expect(sentiment).toBeDefined()
      expect(typeof sentiment).toBe('string')
    })

    it('should analyze neutral sentiment', async () => {
      await aiManager.initialize()
      
      const text = 'The meeting is scheduled for tomorrow at 2 PM.'
      const result = await aiManager.analyzeEmail({
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
      const sentiment = result.sentiment
      
      expect(sentiment).toBeDefined()
      expect(typeof sentiment).toBe('string')
    })
  })

  describe('error handling', () => {
    it('should handle model loading errors gracefully', async () => {
      // Mock model loading failure
      vi.spyOn(aiManager, 'loadModel').mockRejectedValue(new Error('Model loading failed'))
      
      await expect(aiManager.initialize()).rejects.toThrow('Model loading failed')
    })

    it('should handle inference errors gracefully', async () => {
      await aiManager.initialize()
      
      // Mock inference failure
      vi.spyOn(aiManager, 'loadModel').mockRejectedValue(new Error('Inference failed'))
      
      await expect(aiManager.analyzeEmail({
        id: 'test',
        to: ['test@example.com'],
        attachments: [],
        isRead: true,
        isImportant: false,
        subject: 'Test',
        from: 'test@example.com',
        body: 'test',
        timestamp: new Date(),
        threadId: 'test'
      })).rejects.toThrow('Inference failed')
    })
  })

  describe('performance', () => {
    it('should complete summarization within reasonable time', async () => {
      await aiManager.initialize()
      
      const start = Date.now()
      const text = 'This is a test email for performance testing.'
      await aiManager.analyzeEmail({
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
      
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should complete embedding generation within reasonable time', async () => {
      await aiManager.initialize()
      
      const start = Date.now()
      const text = 'This is a test email for embedding performance testing.'
      await aiManager.generateEmbedding(text)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(3000) // Should complete within 3 seconds
    })
  })
})
