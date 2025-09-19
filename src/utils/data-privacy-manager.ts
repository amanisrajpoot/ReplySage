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
  analysisData: number // days
  performanceMetrics: number // days
  auditLogs: number // days
  userSettings: number // days
  cachedModels: number // days
  embeddings: number // days
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

export class DataPrivacyManager {
  private static instance: DataPrivacyManager
  private settings: PrivacySettings
  private retentionPolicy: DataRetentionPolicy
  private isInitialized = false
  private auditLog: PrivacyAudit[] = []

  private constructor() {
    this.settings = {
      enableDataCollection: false,
      enableAnalytics: false,
      enableCrashReporting: false,
      enablePerformanceMonitoring: true,
      dataRetentionDays: 30,
      enableDataExport: true,
      enableDataDeletion: true,
      enablePIIRedaction: true,
      enableEncryption: true,
      enableAuditLogging: true
    }

    this.retentionPolicy = {
      analysisData: 30,
      performanceMetrics: 7,
      auditLogs: 90,
      userSettings: 365,
      cachedModels: 180,
      embeddings: 60
    }
  }

  static getInstance(): DataPrivacyManager {
    if (!DataPrivacyManager.instance) {
      DataPrivacyManager.instance = new DataPrivacyManager()
    }
    return DataPrivacyManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Load settings from storage
      await this.loadSettings()
      
      // Set up data retention cleanup
      this.setupDataRetentionCleanup()
      
      this.isInitialized = true
      console.log('ReplySage: Data privacy manager initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize data privacy manager:', error)
      throw error
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(['privacySettings'])
      if (stored.privacySettings) {
        this.settings = { ...this.settings, ...JSON.parse(stored.privacySettings) }
      }
    } catch (error) {
      console.error('ReplySage: Failed to load privacy settings:', error)
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await chrome.storage.local.set({ privacySettings: JSON.stringify(this.settings) })
    } catch (error) {
      console.error('ReplySage: Failed to save privacy settings:', error)
    }
  }

  private setupDataRetentionCleanup(): void {
    // Run cleanup every 24 hours
    setInterval(() => {
      this.cleanupExpiredData()
    }, 24 * 60 * 60 * 1000)

    // Run initial cleanup
    this.cleanupExpiredData()
  }

  async updateSettings(newSettings: Partial<PrivacySettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings }
      await this.saveSettings()
      
      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: 'settings_change',
        timestamp: new Date(),
        details: { dataType: 'privacy_settings' }
      })
    } catch (error) {
      console.error('ReplySage: Failed to update privacy settings:', error)
      throw error
    }
  }

  getSettings(): PrivacySettings {
    return { ...this.settings }
  }

  async exportData(type: 'full' | 'partial' = 'full'): Promise<DataExport> {
    try {
      if (!this.settings.enableDataExport) {
        throw new Error('Data export is disabled')
      }

      const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const data: any = {}

      if (type === 'full') {
        // Export all data
        const storage = await chrome.storage.local.get(null)
        data.storage = storage

        // Export IndexedDB data
        data.indexedDB = await this.exportIndexedDBData()
      } else {
        // Export only user settings and analysis data
        const storage = await chrome.storage.local.get(['userSettings', 'analysisHistory'])
        data.storage = storage
      }

      const dataString = JSON.stringify(data)
      const size = new Blob([dataString]).size
      const checksum = await this.calculateChecksum(dataString)

      const dataExport: DataExport = {
        id: exportId,
        type,
        data,
        timestamp: new Date(),
        size,
        checksum
      }

      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: 'data_export',
        timestamp: new Date(),
        details: { dataType: type, dataSize: size }
      })

      return dataExport
    } catch (error) {
      console.error('ReplySage: Failed to export data:', error)
      throw error
    }
  }

  async deleteData(type: 'all' | 'analysis' | 'performance' | 'audit' | 'settings' | 'models' | 'embeddings'): Promise<DataDeletionRequest> {
    try {
      if (!this.settings.enableDataDeletion) {
        throw new Error('Data deletion is disabled')
      }

      const requestId = `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const request: DataDeletionRequest = {
        id: requestId,
        type,
        timestamp: new Date(),
        status: 'pending'
      }

      try {
        if (type === 'all') {
          // Delete all data
          await chrome.storage.local.clear()
          await this.clearIndexedDBData()
        } else {
          // Delete specific data types
          await this.deleteSpecificData(type)
        }

        request.status = 'completed'
      } catch (error) {
        request.status = 'failed'
        request.error = error.message
      }

      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: 'data_deletion',
        timestamp: new Date(),
        details: { dataType: type }
      })

      return request
    } catch (error) {
      console.error('ReplySage: Failed to delete data:', error)
      throw error
    }
  }

  private async deleteSpecificData(type: string): Promise<void> {
    const keysToDelete: string[] = []

    switch (type) {
      case 'analysis':
        keysToDelete.push('analysisHistory', 'cachedAnalyses')
        break
      case 'performance':
        keysToDelete.push('performanceMetrics', 'modelPerformance')
        break
      case 'audit':
        keysToDelete.push('auditLogs', 'securityAudit')
        break
      case 'settings':
        keysToDelete.push('userSettings', 'privacySettings')
        break
      case 'models':
        keysToDelete.push('modelAssets', 'quantizedModels')
        break
      case 'embeddings':
        // Clear IndexedDB embeddings
        await this.clearEmbeddingsData()
        break
    }

    if (keysToDelete.length > 0) {
      await chrome.storage.local.remove(keysToDelete)
    }
  }

  private async clearIndexedDBData(): Promise<void> {
    try {
      // Clear all IndexedDB databases
      const databases = await indexedDB.databases()
      for (const db of databases) {
        if (db.name) {
          const deleteReq = indexedDB.deleteDatabase(db.name)
          await new Promise((resolve, reject) => {
            deleteReq.onsuccess = () => resolve(undefined)
            deleteReq.onerror = () => reject(deleteReq.error)
          })
        }
      }
    } catch (error) {
      console.error('ReplySage: Failed to clear IndexedDB data:', error)
    }
  }

  private async clearEmbeddingsData(): Promise<void> {
    try {
      // Clear embeddings from IndexedDB
      const db = await this.openEmbeddingsDB()
      const transaction = db.transaction(['embeddings'], 'readwrite')
      const store = transaction.objectStore('embeddings')
      await store.clear()
    } catch (error) {
      console.error('ReplySage: Failed to clear embeddings data:', error)
    }
  }

  private async openEmbeddingsDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('embeddings', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private async exportIndexedDBData(): Promise<any> {
    try {
      const data: any = {}
      const databases = await indexedDB.databases()
      
      for (const db of databases) {
        if (db.name) {
          const dbData = await this.exportDatabase(db.name)
          data[db.name] = dbData
        }
      }
      
      return data
    } catch (error) {
      console.error('ReplySage: Failed to export IndexedDB data:', error)
      return {}
    }
  }

  private async exportDatabase(dbName: string): Promise<any> {
    try {
      const db = await this.openDatabase(dbName)
      const data: any = {}
      
      for (const storeName of db.objectStoreNames) {
        const storeData = await this.exportObjectStore(db, storeName)
        data[storeName] = storeData
      }
      
      return data
    } catch (error) {
      console.error(`ReplySage: Failed to export database ${dbName}:`, error)
      return {}
    }
  }

  private async openDatabase(dbName: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private async exportObjectStore(db: IDBDatabase, storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private async calculateChecksum(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (error) {
      console.error('ReplySage: Failed to calculate checksum:', error)
      return ''
    }
  }

  async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date()
      
      // Clean up analysis data
      if (this.retentionPolicy.analysisData > 0) {
        await this.cleanupDataByAge('analysisHistory', this.retentionPolicy.analysisData)
      }
      
      // Clean up performance metrics
      if (this.retentionPolicy.performanceMetrics > 0) {
        await this.cleanupDataByAge('performanceMetrics', this.retentionPolicy.performanceMetrics)
      }
      
      // Clean up audit logs
      if (this.retentionPolicy.auditLogs > 0) {
        await this.cleanupDataByAge('auditLogs', this.retentionPolicy.auditLogs)
      }
      
      // Clean up cached models
      if (this.retentionPolicy.cachedModels > 0) {
        await this.cleanupDataByAge('modelAssets', this.retentionPolicy.cachedModels)
      }
      
      // Clean up embeddings
      if (this.retentionPolicy.embeddings > 0) {
        await this.cleanupEmbeddingsByAge(this.retentionPolicy.embeddings)
      }
      
      console.log('ReplySage: Data cleanup completed')
    } catch (error) {
      console.error('ReplySage: Failed to cleanup expired data:', error)
    }
  }

  private async cleanupDataByAge(key: string, retentionDays: number): Promise<void> {
    try {
      const stored = await chrome.storage.local.get([key])
      if (!stored[key]) return

      const data = stored[key]
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      const filteredData = data.filter((item: any) => {
        const itemDate = new Date(item.timestamp || item.createdAt)
        return itemDate > cutoffDate
      })

      await chrome.storage.local.set({ [key]: filteredData })
    } catch (error) {
      console.error(`ReplySage: Failed to cleanup data for ${key}:`, error)
    }
  }

  private async cleanupEmbeddingsByAge(retentionDays: number): Promise<void> {
    try {
      const db = await this.openEmbeddingsDB()
      const transaction = db.transaction(['embeddings'], 'readwrite')
      const store = transaction.objectStore('embeddings')
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      
      const request = store.getAll()
      request.onsuccess = () => {
        const embeddings = request.result
        const filteredEmbeddings = embeddings.filter((embedding: any) => {
          const embeddingDate = new Date(embedding.createdAt)
          return embeddingDate > cutoffDate
        })
        
        store.clear()
        filteredEmbeddings.forEach((embedding: any) => {
          store.add(embedding)
        })
      }
    } catch (error) {
      console.error('ReplySage: Failed to cleanup embeddings:', error)
    }
  }

  getRetentionPolicy(): DataRetentionPolicy {
    return { ...this.retentionPolicy }
  }

  updateRetentionPolicy(newPolicy: Partial<DataRetentionPolicy>): void {
    this.retentionPolicy = { ...this.retentionPolicy, ...newPolicy }
  }

  getAuditLog(): PrivacyAudit[] {
    return [...this.auditLog]
  }

  clearAuditLog(): void {
    this.auditLog = []
  }

  async giveConsent(consentType: string): Promise<void> {
    this.auditLog.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'consent_given',
      timestamp: new Date(),
      details: { consentType }
    })
  }

  async revokeConsent(consentType: string): Promise<void> {
    this.auditLog.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'consent_revoked',
      timestamp: new Date(),
      details: { consentType }
    })
  }

  async logDataAccess(dataType: string, dataSize: number): Promise<void> {
    this.auditLog.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'data_access',
      timestamp: new Date(),
      details: { dataType, dataSize }
    })
  }

  getDataSummary(): {
    totalSize: number
    dataTypes: { [key: string]: number }
    retentionStatus: { [key: string]: boolean }
  } {
    // This would be implemented to provide a summary of stored data
    return {
      totalSize: 0,
      dataTypes: {},
      retentionStatus: {}
    }
  }
}
