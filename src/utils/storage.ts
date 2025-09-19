import { AnalysisResult, UserSettings, CacheEntry } from '@/types'
import { SecureStorage } from './encryption'

export class StorageManager {
  private static readonly CACHE_PREFIX = 'replysage_cache_'
  private static readonly SETTINGS_KEY = 'replysage_settings'
  private static readonly STATS_KEY = 'replysage_stats'
  private static readonly CACHE_EXPIRY_DAYS = 30

  /**
   * Store analysis result in cache
   */
  static async cacheAnalysis(messageId: string, analysis: AnalysisResult): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + messageId
      const cacheEntry: CacheEntry = {
        key: cacheKey,
        data: analysis,
        expiresAt: new Date(Date.now() + this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        encrypted: false
      }

      await chrome.storage.local.set({ [cacheKey]: cacheEntry })
      console.log('ReplySage: Analysis cached for message', messageId)
    } catch (error) {
      console.error('ReplySage: Failed to cache analysis:', error)
    }
  }

  /**
   * Retrieve analysis result from cache
   */
  static async getCachedAnalysis(messageId: string): Promise<AnalysisResult | null> {
    try {
      const cacheKey = this.CACHE_PREFIX + messageId
      const result = await chrome.storage.local.get([cacheKey])
      const cacheEntry: CacheEntry = result[cacheKey]

      if (!cacheEntry) {
        return null
      }

      // Check if cache entry has expired
      if (new Date() > cacheEntry.expiresAt) {
        await this.removeCachedAnalysis(messageId)
        return null
      }

      return cacheEntry.data as AnalysisResult
    } catch (error) {
      console.error('ReplySage: Failed to retrieve cached analysis:', error)
      return null
    }
  }

  /**
   * Remove analysis result from cache
   */
  static async removeCachedAnalysis(messageId: string): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + messageId
      await chrome.storage.local.remove([cacheKey])
    } catch (error) {
      console.error('ReplySage: Failed to remove cached analysis:', error)
    }
  }

  /**
   * Clear all cached analyses
   */
  static async clearAllCache(): Promise<number> {
    try {
      const allData = await chrome.storage.local.get()
      const cacheKeys = Object.keys(allData).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      )

      if (cacheKeys.length > 0) {
        await chrome.storage.local.remove(cacheKeys)
      }

      return cacheKeys.length
    } catch (error) {
      console.error('ReplySage: Failed to clear cache:', error)
      return 0
    }
  }

  /**
   * Get all cached analyses
   */
  static async getAllCachedAnalyses(): Promise<AnalysisResult[]> {
    try {
      const allData = await chrome.storage.local.get()
      const analyses: AnalysisResult[] = []

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const cacheEntry = value as CacheEntry
          if (cacheEntry.data && new Date() <= cacheEntry.expiresAt) {
            analyses.push(cacheEntry.data as AnalysisResult)
          }
        }
      }

      return analyses.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    } catch (error) {
      console.error('ReplySage: Failed to get cached analyses:', error)
      return []
    }
  }

  /**
   * Store user settings
   */
  static async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.SETTINGS_KEY]: settings })
      console.log('ReplySage: Settings saved')
    } catch (error) {
      console.error('ReplySage: Failed to save settings:', error)
      throw error
    }
  }

  /**
   * Retrieve user settings
   */
  static async getSettings(): Promise<UserSettings | null> {
    try {
      const result = await chrome.storage.local.get([this.SETTINGS_KEY])
      return result[this.SETTINGS_KEY] || null
    } catch (error) {
      console.error('ReplySage: Failed to get settings:', error)
      return null
    }
  }

  /**
   * Store encrypted settings
   */
  static async saveEncryptedSettings(settings: UserSettings, password: string): Promise<void> {
    try {
      await SecureStorage.setEncrypted(this.SETTINGS_KEY, settings, password)
      console.log('ReplySage: Encrypted settings saved')
    } catch (error) {
      console.error('ReplySage: Failed to save encrypted settings:', error)
      throw error
    }
  }

  /**
   * Retrieve encrypted settings
   */
  static async getEncryptedSettings(password: string): Promise<UserSettings | null> {
    try {
      return await SecureStorage.getEncrypted(this.SETTINGS_KEY, password)
    } catch (error) {
      console.error('ReplySage: Failed to get encrypted settings:', error)
      return null
    }
  }

  /**
   * Store usage statistics
   */
  static async saveStats(stats: any): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.STATS_KEY]: stats })
    } catch (error) {
      console.error('ReplySage: Failed to save stats:', error)
    }
  }

  /**
   * Retrieve usage statistics
   */
  static async getStats(): Promise<any> {
    try {
      const result = await chrome.storage.local.get([this.STATS_KEY])
      return result[this.STATS_KEY] || {}
    } catch (error) {
      console.error('ReplySage: Failed to get stats:', error)
      return {}
    }
  }

  /**
   * Update usage statistics
   */
  static async updateStats(updates: Partial<any>): Promise<void> {
    try {
      const currentStats = await this.getStats()
      const newStats = { ...currentStats, ...updates }
      await this.saveStats(newStats)
    } catch (error) {
      console.error('ReplySage: Failed to update stats:', error)
    }
  }

  /**
   * Export all data for backup
   */
  static async exportData(): Promise<any> {
    try {
      const allData = await chrome.storage.local.get()
      const exportData = {
        settings: allData[this.SETTINGS_KEY] || null,
        stats: allData[this.STATS_KEY] || {},
        analyses: await this.getAllCachedAnalyses(),
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      }

      return exportData
    } catch (error) {
      console.error('ReplySage: Failed to export data:', error)
      throw error
    }
  }

  /**
   * Import data from backup
   */
  static async importData(data: any): Promise<void> {
    try {
      if (data.settings) {
        await this.saveSettings(data.settings)
      }

      if (data.stats) {
        await this.saveStats(data.stats)
      }

      if (data.analyses && Array.isArray(data.analyses)) {
        for (const analysis of data.analyses) {
          if (analysis.messageId) {
            await this.cacheAnalysis(analysis.messageId, analysis)
          }
        }
      }

      console.log('ReplySage: Data imported successfully')
    } catch (error) {
      console.error('ReplySage: Failed to import data:', error)
      throw error
    }
  }

  /**
   * Clear all data
   */
  static async clearAllData(): Promise<void> {
    try {
      await chrome.storage.local.clear()
      console.log('ReplySage: All data cleared')
    } catch (error) {
      console.error('ReplySage: Failed to clear all data:', error)
      throw error
    }
  }

  /**
   * Get storage usage information
   */
  static async getStorageInfo(): Promise<{
    totalSize: number
    cacheSize: number
    settingsSize: number
    statsSize: number
    cacheCount: number
  }> {
    try {
      const allData = await chrome.storage.local.get()
      let totalSize = 0
      let cacheSize = 0
      let settingsSize = 0
      let statsSize = 0
      let cacheCount = 0

      for (const [key, value] of Object.entries(allData)) {
        const size = JSON.stringify(value).length
        totalSize += size

        if (key.startsWith(this.CACHE_PREFIX)) {
          cacheSize += size
          cacheCount++
        } else if (key === this.SETTINGS_KEY) {
          settingsSize += size
        } else if (key === this.STATS_KEY) {
          statsSize += size
        }
      }

      return {
        totalSize,
        cacheSize,
        settingsSize,
        statsSize,
        cacheCount
      }
    } catch (error) {
      console.error('ReplySage: Failed to get storage info:', error)
      return {
        totalSize: 0,
        cacheSize: 0,
        settingsSize: 0,
        statsSize: 0,
        cacheCount: 0
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  static async cleanupExpiredCache(): Promise<number> {
    try {
      const allData = await chrome.storage.local.get()
      const expiredKeys: string[] = []
      const now = new Date()

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const cacheEntry = value as CacheEntry
          if (cacheEntry.expiresAt && now > cacheEntry.expiresAt) {
            expiredKeys.push(key)
          }
        }
      }

      if (expiredKeys.length > 0) {
        await chrome.storage.local.remove(expiredKeys)
      }

      return expiredKeys.length
    } catch (error) {
      console.error('ReplySage: Failed to cleanup expired cache:', error)
      return 0
    }
  }
}
