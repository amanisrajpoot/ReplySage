import React, { useState, useEffect } from 'react'

interface ModelAsset {
  name: string
  url: string
  size: number
  downloaded: boolean
  downloadProgress: number
  lastUpdated: Date
  checksum?: string
}

interface StorageUsage {
  totalSize: number
  downloadedAssets: number
  availableSpace: number
}

interface ModelManagerProps {
  onClose: () => void
}

export const ModelManager: React.FC<ModelManagerProps> = ({ onClose }) => {
  const [assets, setAssets] = useState<ModelAsset[]>([])
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null)
  const [downloading, setDownloading] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAssetStatus()
  }, [])

  const loadAssetStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ASSET_STATUS' })
      if (response.success) {
        setAssets(response.assets)
        setStorageUsage(response.storageUsage)
      } else {
        setError('Failed to load asset status')
      }
    } catch (error) {
      console.error('ReplySage: Failed to load asset status:', error)
      setError('Failed to load asset status')
    }
  }

  const downloadModel = async (modelName: string) => {
    try {
      setDownloading(prev => [...prev, modelName])
      setError(null)

      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_MODELS',
        payload: [modelName]
      })

      if (response.success) {
        await loadAssetStatus()
      } else {
        setError(`Failed to download ${modelName}`)
      }
    } catch (error) {
      console.error('ReplySage: Failed to download model:', error)
      setError(`Failed to download ${modelName}`)
    } finally {
      setDownloading(prev => prev.filter(name => name !== modelName))
    }
  }

  const downloadAllModels = async () => {
    try {
      setDownloading(prev => [...prev, 'all'])
      setError(null)

      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_MODELS',
        payload: []
      })

      if (response.success) {
        await loadAssetStatus()
      } else {
        setError('Failed to download models')
      }
    } catch (error) {
      console.error('ReplySage: Failed to download models:', error)
      setError('Failed to download models')
    } finally {
      setDownloading(prev => prev.filter(name => name !== 'all'))
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getModelDisplayName = (name: string): string => {
    const names: Record<string, string> = {
      'summarizer': 'Text Summarizer',
      'text-generator': 'Text Generator',
      'embeddings': 'Embeddings Model',
      'sentiment': 'Sentiment Analyzer'
    }
    return names[name] || name
  }

  const getModelDescription = (name: string): string => {
    const descriptions: Record<string, string> = {
      'summarizer': 'Generates concise summaries of email content',
      'text-generator': 'Creates suggested replies and text completions',
      'embeddings': 'Creates semantic embeddings for similarity search',
      'sentiment': 'Analyzes email sentiment (positive, negative, neutral)'
    }
    return descriptions[name] || 'AI model for email processing'
  }

  return (
    <div className="model-manager-overlay">
      <div className="model-manager-modal">
        <div className="model-manager-header">
          <h2>AI Model Manager</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="model-manager-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {storageUsage && (
            <div className="storage-info">
              <h3>Storage Usage</h3>
              <div className="storage-stats">
                <div className="stat">
                  <span className="label">Downloaded Models:</span>
                  <span className="value">{storageUsage.downloadedAssets}</span>
                </div>
                <div className="stat">
                  <span className="label">Total Size:</span>
                  <span className="value">{formatFileSize(storageUsage.totalSize)}</span>
                </div>
                <div className="stat">
                  <span className="label">Available Space:</span>
                  <span className="value">{formatFileSize(storageUsage.availableSpace)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="models-section">
            <div className="models-header">
              <h3>Available Models</h3>
              <button
                onClick={downloadAllModels}
                disabled={downloading.includes('all')}
                className="download-all-button"
              >
                {downloading.includes('all') ? 'Downloading...' : 'Download All'}
              </button>
            </div>

            <div className="models-list">
              {assets.map((asset) => (
                <div key={asset.name} className="model-item">
                  <div className="model-info">
                    <h4>{getModelDisplayName(asset.name)}</h4>
                    <p className="model-description">{getModelDescription(asset.name)}</p>
                    <div className="model-details">
                      <span className="size">{formatFileSize(asset.size)}</span>
                      {asset.downloaded && (
                        <span className="status downloaded">Downloaded</span>
                      )}
                      {!asset.downloaded && asset.downloadProgress > 0 && (
                        <span className="status downloading">
                          Downloading... {asset.downloadProgress}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="model-actions">
                    {asset.downloaded ? (
                      <span className="downloaded-indicator">✓</span>
                    ) : (
                      <button
                        onClick={() => downloadModel(asset.name)}
                        disabled={downloading.includes(asset.name)}
                        className="download-button"
                      >
                        {downloading.includes(asset.name) ? 'Downloading...' : 'Download'}
                      </button>
                    )}
                  </div>

                  {asset.downloadProgress > 0 && asset.downloadProgress < 100 && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${asset.downloadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="model-manager-footer">
            <p className="info-text">
              Models are downloaded and stored locally for privacy. 
              They enable offline AI processing of your emails.
            </p>
            <div className="footer-actions">
              <button onClick={onClose} className="close-button-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
