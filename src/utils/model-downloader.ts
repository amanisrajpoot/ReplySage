import { ModelAssetManager } from './model-asset-manager'

export interface ModelDownloadProgress {
  modelId: string
  progress: number
  status: 'downloading' | 'completed' | 'error'
  error?: string
}

export interface ModelInfo {
  id: string
  name: string
  description: string
  size: number
  url: string
  checksum: string
  version: string
  quantized: boolean
  quantizationType?: 'int8' | 'int16' | 'fp16' | 'fp32'
}

export class ModelDownloader {
  private static instance: ModelDownloader
  private assetManager: ModelAssetManager
  private downloadProgress = new Map<string, ModelDownloadProgress>()
  private downloadCallbacks = new Map<string, (progress: ModelDownloadProgress) => void>()

  private constructor() {
    this.assetManager = ModelAssetManager.getInstance()
  }

  public static getInstance(): ModelDownloader {
    if (!ModelDownloader.instance) {
      ModelDownloader.instance = new ModelDownloader()
    }
    return ModelDownloader.instance
  }

  public async initialize(): Promise<void> {
    // await this.assetManager.initialize()
  }

  public getAvailableModels(): ModelInfo[] {
    return [
      {
        id: 'flan-t5-small',
        name: 'Flan-T5 Small',
        description: 'Small text generation model for summaries and replies',
        size: 60 * 1024 * 1024, // 60MB
        url: 'https://huggingface.co/Xenova/flan-t5-small/resolve/main/model.onnx',
        checksum: 'sha256:abc123...',
        version: '1.0.0',
        quantized: false
      },
      {
        id: 'flan-t5-small-int8',
        name: 'Flan-T5 Small (INT8)',
        description: 'Quantized Flan-T5 Small for faster inference',
        size: 30 * 1024 * 1024, // 30MB
        url: 'https://huggingface.co/Xenova/flan-t5-small/resolve/main/model_int8.onnx',
        checksum: 'sha256:def456...',
        version: '1.0.0',
        quantized: true,
        quantizationType: 'int8'
      },
      {
        id: 'all-minilm-l6-v2',
        name: 'All-MiniLM-L6-v2',
        description: 'Sentence transformer for embeddings and similarity search',
        size: 80 * 1024 * 1024, // 80MB
        url: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/model.onnx',
        checksum: 'sha256:ghi789...',
        version: '1.0.0',
        quantized: false
      },
      {
        id: 'all-minilm-l6-v2-int8',
        name: 'All-MiniLM-L6-v2 (INT8)',
        description: 'Quantized sentence transformer for faster embeddings',
        size: 40 * 1024 * 1024, // 40MB
        url: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/model_int8.onnx',
        checksum: 'sha256:jkl012...',
        version: '1.0.0',
        quantized: true,
        quantizationType: 'int8'
      },
      {
        id: 'distilbert-base-uncased',
        name: 'DistilBERT Base',
        description: 'Lightweight BERT model for text classification',
        size: 100 * 1024 * 1024, // 100MB
        url: 'https://huggingface.co/Xenova/distilbert-base-uncased/resolve/main/model.onnx',
        checksum: 'sha256:mno345...',
        version: '1.0.0',
        quantized: false
      }
    ]
  }

  public async downloadModel(modelId: string, onProgress?: (progress: ModelDownloadProgress) => void): Promise<void> {
    const modelInfo = this.getAvailableModels().find(m => m.id === modelId)
    if (!modelInfo) {
      throw new Error(`Model ${modelId} not found`)
    }

    // Check if model is already downloaded
    const existingAsset = this.assetManager.getAssetInfo(modelId)
    if (existingAsset && existingAsset.status === 'downloaded') {
      return
    }

    // Set up progress tracking
    this.downloadProgress.set(modelId, {
      modelId,
      progress: 0,
      status: 'downloading'
    })

    if (onProgress) {
      this.downloadCallbacks.set(modelId, onProgress)
    }

    try {
      // Simulate download progress (in real implementation, this would be actual download)
      await this.simulateDownload(modelId, modelInfo)
      
      // Update asset status
      // await this.assetManager.updateAssetStatus(modelId, 'downloaded')
      
      // Mark as completed
      const progress = this.downloadProgress.get(modelId)!
      progress.status = 'completed'
      progress.progress = 100
      
      if (onProgress) {
        onProgress(progress)
      }
      
    } catch (error) {
      const progress = this.downloadProgress.get(modelId)!
      progress.status = 'error'
      progress.error = error instanceof Error ? error.message : 'Unknown error'
      
      if (onProgress) {
        onProgress(progress)
      }
      
      throw error
    } finally {
      this.downloadCallbacks.delete(modelId)
    }
  }

  private async simulateDownload(modelId: string, _modelInfo: ModelInfo): Promise<void> {
    return new Promise((resolve, _reject) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 20
        
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          resolve()
        }
        
        const progressData = this.downloadProgress.get(modelId)!
        progressData.progress = Math.min(progress, 100)
        
        const callback = this.downloadCallbacks.get(modelId)
        if (callback) {
          callback(progressData)
        }
      }, 200)
    })
  }

  public async downloadAllModels(onProgress?: (progress: ModelDownloadProgress) => void): Promise<void> {
    const models = this.getAvailableModels()
    const promises = models.map(model => 
      this.downloadModel(model.id, onProgress)
    )
    
    await Promise.all(promises)
  }

  public getDownloadProgress(modelId: string): ModelDownloadProgress | undefined {
    return this.downloadProgress.get(modelId)
  }

  public getAllDownloadProgress(): ModelDownloadProgress[] {
    return Array.from(this.downloadProgress.values())
  }

  public async verifyModel(modelId: string): Promise<boolean> {
    const modelInfo = this.getAvailableModels().find(m => m.id === modelId)
    if (!modelInfo) {
      return false
    }

    const asset = this.assetManager.getAssetInfo(modelId)
    if (!asset || asset.status !== 'downloaded') {
      return false
    }

    // In real implementation, this would verify the checksum
    return true
  }

  public async deleteModel(modelId: string): Promise<void> {
    await this.assetManager.deleteAsset(modelId)
    this.downloadProgress.delete(modelId)
    this.downloadCallbacks.delete(modelId)
  }

  public getModelSize(modelId: string): number {
    const modelInfo = this.getAvailableModels().find(m => m.id === modelId)
    return modelInfo?.size || 0
  }

  public getTotalDownloadedSize(): number {
    const assets = this.assetManager.getAllAssets()
    return assets
      .filter(asset => asset.status === 'downloaded')
      .reduce((total, asset) => total + asset.size, 0)
  }

  public getStorageUsage(): { used: number; available: number; total: number } {
    const used = this.getTotalDownloadedSize()
    const total = 500 * 1024 * 1024 // 500MB limit
    const available = total - used
    
    return { used, available, total }
  }

  public async cleanupOldModels(): Promise<void> {
    const assets = this.assetManager.getAllAssets()
    const now = Date.now()
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
    
    for (const asset of assets) {
      if (asset.lastAccessed && (now - asset.lastAccessed) > maxAge) {
        await this.deleteModel(asset.id)
      }
    }
  }
}
