import { EmailMessage } from '@/types'

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

export class EmbeddingsManager {
  private static instance: EmbeddingsManager
  private db: IDBDatabase | null = null
  private isInitialized = false
  private embeddingPipeline: any = null
  private readonly DB_NAME = 'ReplySageEmbeddings'
  private readonly DB_VERSION = 1
  private readonly VECTOR_DIMENSION = 384 // MiniLM-L6-v2 dimension

  private constructor() {}

  static getInstance(): EmbeddingsManager {
    if (!EmbeddingsManager.instance) {
      EmbeddingsManager.instance = new EmbeddingsManager()
    }
    return EmbeddingsManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Initialize IndexedDB
      await this.initializeDatabase()
      
      // Initialize embedding pipeline
      await this.initializeEmbeddingPipeline()
      
      this.isInitialized = true
      console.log('ReplySage: Embeddings manager initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize embeddings manager:', error)
      throw error
    }
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
      request.onerror = () => {
        console.error('ReplySage: Failed to open embeddings database')
        reject(new Error('Failed to open database'))
      }
      
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create embeddings store
        if (!db.objectStoreNames.contains('embeddings')) {
          const embeddingsStore = db.createObjectStore('embeddings', { keyPath: 'id' })
          embeddingsStore.createIndex('messageId', 'messageId', { unique: false })
          embeddingsStore.createIndex('timestamp', 'metadata.timestamp', { unique: false })
          embeddingsStore.createIndex('sender', 'metadata.sender', { unique: false })
          embeddingsStore.createIndex('category', 'metadata.category', { unique: false })
        }
        
        // Create search cache store
        if (!db.objectStoreNames.contains('searchCache')) {
          const cacheStore = db.createObjectStore('searchCache', { keyPath: 'query' })
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  private async initializeEmbeddingPipeline(): Promise<void> {
    try {
      // Initialize the embedding pipeline using transformers.js
      const { pipeline } = await import('@xenova/transformers')
      this.embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      console.log('ReplySage: Embedding pipeline initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize embedding pipeline:', error)
      // Fallback to mock embeddings for development
      this.embeddingPipeline = null
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (this.embeddingPipeline) {
        // Use the actual embedding pipeline
        const result = await this.embeddingPipeline(text, { pooling: 'mean', normalize: true })
        return Array.from(result.data)
      } else {
        // Fallback to mock embeddings for development
        return this.generateMockEmbedding(text)
      }
    } catch (error) {
      console.error('ReplySage: Failed to generate embedding:', error)
      // Fallback to mock embeddings
      return this.generateMockEmbedding(text)
    }
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate a deterministic mock embedding based on text content
    const hash = this.simpleHash(text)
    const vector = new Array(this.VECTOR_DIMENSION).fill(0)
    
    // Use hash to generate pseudo-random but deterministic values
    for (let i = 0; i < this.VECTOR_DIMENSION; i++) {
      vector[i] = Math.sin(hash + i) * 0.5
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    return vector.map(val => val / magnitude)
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  async storeEmbedding(message: EmailMessage, text: string, category?: string, priority?: string): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const embeddingId = `embedding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const vector = await this.generateEmbedding(text)
      
      const embedding: EmbeddingVector = {
        id: embeddingId,
        messageId: message.id,
        text: text,
        vector: vector,
        metadata: {
          subject: message.subject || '',
          sender: message.from || '',
          timestamp: new Date(message.timestamp || Date.now()),
          threadId: message.threadId,
          category: category || 'general',
          priority: priority || 'medium'
        },
        createdAt: new Date()
      }

      const transaction = this.db.transaction(['embeddings'], 'readwrite')
      const store = transaction.objectStore('embeddings')
      await store.add(embedding)

      console.log('ReplySage: Embedding stored successfully:', embeddingId)
      return embeddingId
    } catch (error) {
      console.error('ReplySage: Failed to store embedding:', error)
      throw error
    }
  }

  async searchSimilar(query: SearchQuery): Promise<EmbeddingSearchResult> {
    const startTime = Date.now()
    
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      // Check cache first
      const cachedResult = await this.getCachedSearch(query.text)
      if (cachedResult) {
        return cachedResult
      }

      // Generate query embedding
      const queryVector = await this.generateEmbedding(query.text)
      
      // Get all embeddings from database
      const allEmbeddings = await this.getAllEmbeddings()
      
      // Filter by criteria
      let filteredEmbeddings = allEmbeddings
      
      if (query.category) {
        filteredEmbeddings = filteredEmbeddings.filter(e => e.metadata.category === query.category)
      }
      
      if (query.sender) {
        filteredEmbeddings = filteredEmbeddings.filter(e => 
          e.metadata.sender.toLowerCase().includes(query.sender!.toLowerCase())
        )
      }
      
      if (query.dateRange) {
        filteredEmbeddings = filteredEmbeddings.filter(e => 
          e.metadata.timestamp >= query.dateRange!.start && 
          e.metadata.timestamp <= query.dateRange!.end
        )
      }

      // Calculate similarities
      const similarities = filteredEmbeddings.map(embedding => {
        const similarity = this.cosineSimilarity(queryVector, embedding.vector)
        const distance = 1 - similarity
        
        return {
          messageId: embedding.messageId,
          similarity,
          text: embedding.text,
          metadata: embedding.metadata,
          distance
        }
      })

      // Sort by similarity (descending)
      similarities.sort((a, b) => b.similarity - a.similarity)

      // Apply threshold and limit
      const threshold = query.threshold || 0.3
      const limit = query.limit || 10
      
      const results = similarities
        .filter(s => s.similarity >= threshold)
        .slice(0, limit)

      const searchResult: EmbeddingSearchResult = {
        results,
        totalFound: similarities.filter(s => s.similarity >= threshold).length,
        query: query.text,
        processingTime: Date.now() - startTime
      }

      // Cache the result
      await this.cacheSearchResult(query.text, searchResult)

      return searchResult
    } catch (error) {
      console.error('ReplySage: Search failed:', error)
      throw error
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  private async getAllEmbeddings(): Promise<EmbeddingVector[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(['embeddings'], 'readonly')
      const store = transaction.objectStore('embeddings')
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to retrieve embeddings'))
      }
    })
  }

  private async getCachedSearch(query: string): Promise<EmbeddingSearchResult | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null)
        return
      }

      const transaction = this.db.transaction(['searchCache'], 'readonly')
      const store = transaction.objectStore('searchCache')
      const request = store.get(query)

      request.onsuccess = () => {
        const result = request.result
        if (result && Date.now() - result.timestamp < 300000) { // 5 minutes cache
          resolve(result.data)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        resolve(null)
      }
    })
  }

  private async cacheSearchResult(query: string, result: EmbeddingSearchResult): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve()
        return
      }

      const transaction = this.db.transaction(['searchCache'], 'readwrite')
      const store = transaction.objectStore('searchCache')
      const request = store.put({
        query,
        data: result,
        timestamp: Date.now()
      })

      request.onsuccess = () => resolve()
      request.onerror = () => resolve() // Don't fail if caching fails
    })
  }

  async deleteEmbedding(messageId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const transaction = this.db.transaction(['embeddings'], 'readwrite')
      const store = transaction.objectStore('embeddings')
      const index = store.index('messageId')
      const request = index.getAll(messageId)

      request.onsuccess = () => {
        const embeddings = request.result
        embeddings.forEach(embedding => {
          store.delete(embedding.id)
        })
      }

      console.log('ReplySage: Embedding deleted for message:', messageId)
    } catch (error) {
      console.error('ReplySage: Failed to delete embedding:', error)
      throw error
    }
  }

  async getEmbeddingStats(): Promise<{
    totalEmbeddings: number
    categories: { [key: string]: number }
    oldestEmbedding: Date | null
    newestEmbedding: Date | null
    storageSize: number
  }> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const allEmbeddings = await this.getAllEmbeddings()
      
      const categories: { [key: string]: number } = {}
      let oldestDate: Date | null = null
      let newestDate: Date | null = null

      allEmbeddings.forEach(embedding => {
        const category = embedding.metadata.category || 'general'
        categories[category] = (categories[category] || 0) + 1

        const date = embedding.metadata.timestamp
        if (!oldestDate || date < oldestDate) {
          oldestDate = date
        }
        if (!newestDate || date > newestDate) {
          newestDate = date
        }
      })

      // Estimate storage size (rough calculation)
      const avgVectorSize = this.VECTOR_DIMENSION * 8 // 8 bytes per float64
      const avgMetadataSize = 200 // Rough estimate for metadata
      const storageSize = allEmbeddings.length * (avgVectorSize + avgMetadataSize)

      return {
        totalEmbeddings: allEmbeddings.length,
        categories,
        oldestEmbedding: oldestDate,
        newestEmbedding: newestDate,
        storageSize
      }
    } catch (error) {
      console.error('ReplySage: Failed to get embedding stats:', error)
      throw error
    }
  }

  async clearAllEmbeddings(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const transaction = this.db.transaction(['embeddings', 'searchCache'], 'readwrite')
      
      // Clear embeddings
      const embeddingsStore = transaction.objectStore('embeddings')
      await embeddingsStore.clear()

      // Clear search cache
      const cacheStore = transaction.objectStore('searchCache')
      await cacheStore.clear()

      console.log('ReplySage: All embeddings cleared')
    } catch (error) {
      console.error('ReplySage: Failed to clear embeddings:', error)
      throw error
    }
  }

  async exportEmbeddings(): Promise<EmbeddingVector[]> {
    return await this.getAllEmbeddings()
  }

  async importEmbeddings(embeddings: EmbeddingVector[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const transaction = this.db.transaction(['embeddings'], 'readwrite')
      const store = transaction.objectStore('embeddings')

      for (const embedding of embeddings) {
        await store.put(embedding)
      }

      console.log('ReplySage: Embeddings imported successfully')
    } catch (error) {
      console.error('ReplySage: Failed to import embeddings:', error)
      throw error
    }
  }
}
