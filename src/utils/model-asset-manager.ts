// import { ModelConfig } from './ai-models'

export interface ModelAsset {
  id: string
  name: string
  type: 'model' | 'tokenizer' | 'config'
  size: number
  url: string
  checksum: string
  status: 'pending' | 'downloading' | 'downloaded' | 'error'
  progress: number
  lastAccessed?: number
  createdAt: Date
}

export class ModelAssetManager {
  private static instance: ModelAssetManager
  private assets: Map<string, ModelAsset> = new Map()
  // private _downloadQueue: string[] = []
  private isDownloading = false

  private constructor() {
    this.initializeAssets()
  }

  static getInstance(): ModelAssetManager {
    if (!ModelAssetManager.instance) {
      ModelAssetManager.instance = new ModelAssetManager()
    }
    return ModelAssetManager.instance
  }

  private initializeAssets() {
    const baseUrl = 'https://huggingface.co/Xenova'
    
    const modelAssets: ModelAsset[] = [
      {
        id: 'summarizer',
        name: 'summarizer',
        type: 'model',
        url: `${baseUrl}/distilbart-cnn-6-6/resolve/main/onnx/model_quantized.onnx`,
        size: 60 * 1024 * 1024, // 60MB
        checksum: 'abc123',
        status: 'pending',
        progress: 0,
        createdAt: new Date()
      },
      {
        id: 'text-generator',
        name: 'text-generator',
        type: 'model',
        url: `${baseUrl}/distilgpt2/resolve/main/onnx/model_quantized.onnx`,
        size: 40 * 1024 * 1024, // 40MB
        checksum: 'def456',
        status: 'pending',
        progress: 0,
        createdAt: new Date()
      },
      {
        id: 'embeddings',
        name: 'embeddings',
        type: 'model',
        url: `${baseUrl}/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx`,
        size: 90 * 1024 * 1024, // 90MB
        checksum: 'ghi789',
        status: 'pending',
        progress: 0,
        createdAt: new Date()
      },
      {
        id: 'sentiment',
        name: 'sentiment',
        type: 'model',
        url: `${baseUrl}/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/onnx/model_quantized.onnx`,
        size: 30 * 1024 * 1024, // 30MB
        checksum: 'jkl012',
        status: 'pending',
        progress: 0,
        createdAt: new Date()
      }
    ]

    modelAssets.forEach(asset => {
      this.assets.set(asset.name, asset)
    })
  }

  async checkAssetStatus(): Promise<Map<string, ModelAsset>> {
    // Check which assets are already downloaded
    for (const [name, asset] of this.assets) {
      try {
        const isDownloaded = await this.isAssetDownloaded(name)
        asset.status = isDownloaded ? 'downloaded' : 'pending'
        if (isDownloaded) {
          asset.progress = 100
        }
      } catch (error) {
        console.error(`ReplySage: Failed to check status for ${name}:`, error)
      }
    }

    return new Map(this.assets)
  }

  private async isAssetDownloaded(name: string): Promise<boolean> {
    try {
      // Check if the model files exist in IndexedDB
      const db = await this.openDB()
      const transaction = db.transaction(['modelAssets'], 'readonly')
      const store = transaction.objectStore('modelAssets')
      const request = store.get(name)
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve(!!request.result)
        }
        request.onerror = () => {
          resolve(false)
        }
      })
    } catch (error) {
      console.error(`ReplySage: Error checking if ${name} is downloaded:`, error)
      return false
    }
  }

  async downloadAsset(name: string, onProgress?: (progress: number) => void): Promise<void> {
    const asset = this.assets.get(name)
    if (!asset) {
      throw new Error(`Asset ${name} not found`)
    }

    if (asset.status === 'downloaded') {
      return
    }

    try {
      console.log(`ReplySage: Starting download of ${name}...`)
      
      const response = await fetch(asset.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${asset.url}: ${response.statusText}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : asset.size
      let loaded = 0

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      const chunks: Uint8Array[] = []

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        chunks.push(value)
        loaded += value.length
        
        const progress = Math.round((loaded / total) * 100)
        asset.progress = progress
        
        if (onProgress) {
          onProgress(progress)
        }
      }

      // Combine chunks into a single Uint8Array
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }

      // Store the model in IndexedDB
      await this.storeAsset(name, result)
      
      asset.status = 'downloaded'
      asset.progress = 100
      asset.lastAccessed = Date.now()
      
      console.log(`ReplySage: Successfully downloaded ${name}`)
    } catch (error) {
      console.error(`ReplySage: Failed to download ${name}:`, error)
      asset.progress = 0
      throw error
    }
  }

  async downloadAllAssets(onProgress?: (asset: string, progress: number) => void): Promise<void> {
    if (this.isDownloading) {
      throw new Error('Download already in progress')
    }

    this.isDownloading = true

    try {
      const assetsToDownload = Array.from(this.assets.values()).filter(asset => asset.status !== 'downloaded')
      
      for (const asset of assetsToDownload) {
        try {
          await this.downloadAsset(asset.name, (progress) => {
            if (onProgress) {
              onProgress(asset.name, progress)
            }
          })
        } catch (error) {
          console.error(`ReplySage: Failed to download ${asset.name}:`, error)
          // Continue with other assets
        }
      }
    } finally {
      this.isDownloading = false
    }
  }

  private async storeAsset(name: string, data: Uint8Array): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(['modelAssets'], 'readwrite')
      const store = transaction.objectStore('modelAssets')
      
      await store.put({
        name,
        data,
        timestamp: Date.now(),
        size: data.length
      })
    } catch (error) {
      console.error(`ReplySage: Failed to store asset ${name}:`, error)
      throw error
    }
  }

  async getAsset(name: string): Promise<Uint8Array | null> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(['modelAssets'], 'readonly')
      const store = transaction.objectStore('modelAssets')
      const request = store.get(name)
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve(request.result?.data || null)
        }
        request.onerror = () => {
          resolve(null)
        }
      })
    } catch (error) {
      console.error(`ReplySage: Failed to get asset ${name}:`, error)
      return null
    }
  }

  async deleteAsset(name: string): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(['modelAssets'], 'readwrite')
      const store = transaction.objectStore('modelAssets')
      await store.delete(name)
      
      const asset = this.assets.get(name)
      if (asset) {
        asset.status = 'pending'
        asset.progress = 0
      }
    } catch (error) {
      console.error(`ReplySage: Failed to delete asset ${name}:`, error)
      throw error
    }
  }

  async clearAllAssets(): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(['modelAssets'], 'readwrite')
      const store = transaction.objectStore('modelAssets')
      await store.clear()
      
      // Reset all assets
      for (const asset of this.assets.values()) {
        asset.status = 'pending'
        asset.progress = 0
      }
    } catch (error) {
      console.error('ReplySage: Failed to clear all assets:', error)
      throw error
    }
  }

  async getStorageUsage(): Promise<{
    totalSize: number
    downloadedAssets: number
    availableSpace: number
  }> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(['modelAssets'], 'readonly')
      const store = transaction.objectStore('modelAssets')
      const request = store.getAll()
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const assets = request.result || []
          const totalSize = assets.reduce((sum, asset) => sum + (asset.size || 0), 0)
          const downloadedAssets = assets.length
          
          // Estimate available space (this is a rough estimate)
          const availableSpace = 1024 * 1024 * 1024 - totalSize // 1GB - used space
          
          resolve({
            totalSize,
            downloadedAssets,
            availableSpace: Math.max(0, availableSpace)
          })
        }
        request.onerror = () => {
          resolve({
            totalSize: 0,
            downloadedAssets: 0,
            availableSpace: 1024 * 1024 * 1024
          })
        }
      })
    } catch (error) {
      console.error('ReplySage: Failed to get storage usage:', error)
      return {
        totalSize: 0,
        downloadedAssets: 0,
        availableSpace: 1024 * 1024 * 1024
      }
    }
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ReplySageModelAssets', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains('modelAssets')) {
          const store = db.createObjectStore('modelAssets', { keyPath: 'name' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  getAssetInfo(name: string): ModelAsset | undefined {
    return this.assets.get(name)
  }

  getAllAssets(): ModelAsset[] {
    return Array.from(this.assets.values())
  }

  isDownloadInProgress(): boolean {
    return this.isDownloading
  }

  async cancelDownload(): Promise<void> {
    // Note: This is a simplified implementation
    // In a real implementation, you'd need to properly cancel the fetch request
    this.isDownloading = false
  }
}
