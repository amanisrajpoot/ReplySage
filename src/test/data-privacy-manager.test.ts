import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataPrivacyManager } from '../utils/data-privacy-manager'

describe('DataPrivacyManager', () => {
  let privacyManager: DataPrivacyManager

  beforeEach(() => {
    privacyManager = DataPrivacyManager.getInstance()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      await privacyManager.initialize()
      
      const settings = privacyManager.getSettings()
      expect(settings).toBeDefined()
      expect(settings.enableDataCollection).toBe(false)
      expect(settings.enablePIIRedaction).toBe(true)
      expect(settings.enableEncryption).toBe(true)
    })
  })

  describe('settings management', () => {
    it('should update settings correctly', async () => {
      await privacyManager.initialize()
      
      const newSettings = {
        enableDataCollection: true,
        enableAnalytics: true,
        dataRetentionDays: 60
      }
      
      await privacyManager.updateSettings(newSettings)
      
      const settings = privacyManager.getSettings()
      expect(settings.enableDataCollection).toBe(true)
      expect(settings.enableAnalytics).toBe(true)
      expect(settings.dataRetentionDays).toBe(60)
    })

    it('should preserve existing settings when updating', async () => {
      await privacyManager.initialize()
      
      const partialSettings = {
        enableDataCollection: true
      }
      
      await privacyManager.updateSettings(partialSettings)
      
      const settings = privacyManager.getSettings()
      expect(settings.enableDataCollection).toBe(true)
      expect(settings.enablePIIRedaction).toBe(true) // Should remain unchanged
    })
  })

  describe('data export', () => {
    it('should export data when enabled', async () => {
      await privacyManager.initialize()
      
      // Enable data export
      await privacyManager.updateSettings({ enableDataExport: true })
      
      const dataExport = await privacyManager.exportData('partial')
      
      expect(dataExport).toBeDefined()
      expect(dataExport.id).toBeDefined()
      expect(dataExport.type).toBe('partial')
      expect(dataExport.timestamp).toBeInstanceOf(Date)
      expect(dataExport.size).toBeGreaterThan(0)
    })

    it('should throw error when export is disabled', async () => {
      await privacyManager.initialize()
      
      // Disable data export
      await privacyManager.updateSettings({ enableDataExport: false })
      
      await expect(privacyManager.exportData('partial')).rejects.toThrow('Data export is disabled')
    })
  })

  describe('data deletion', () => {
    it('should delete data when enabled', async () => {
      await privacyManager.initialize()
      
      // Enable data deletion
      await privacyManager.updateSettings({ enableDataDeletion: true })
      
      const deletionRequest = await privacyManager.deleteData('analysis')
      
      expect(deletionRequest).toBeDefined()
      expect(deletionRequest.id).toBeDefined()
      expect(deletionRequest.type).toBe('analysis')
      expect(deletionRequest.timestamp).toBeInstanceOf(Date)
      expect(deletionRequest.status).toBe('completed')
    })

    it('should throw error when deletion is disabled', async () => {
      await privacyManager.initialize()
      
      // Disable data deletion
      await privacyManager.updateSettings({ enableDataDeletion: false })
      
      await expect(privacyManager.deleteData('analysis')).rejects.toThrow('Data deletion is disabled')
    })
  })

  describe('retention policy', () => {
    it('should get default retention policy', () => {
      const policy = privacyManager.getRetentionPolicy()
      
      expect(policy).toBeDefined()
      expect(policy.analysisData).toBe(30)
      expect(policy.performanceMetrics).toBe(7)
      expect(policy.auditLogs).toBe(90)
    })

    it('should update retention policy', () => {
      const newPolicy = {
        analysisData: 60,
        performanceMetrics: 14
      }
      
      privacyManager.updateRetentionPolicy(newPolicy)
      
      const policy = privacyManager.getRetentionPolicy()
      expect(policy.analysisData).toBe(60)
      expect(policy.performanceMetrics).toBe(14)
      expect(policy.auditLogs).toBe(90) // Should remain unchanged
    })
  })

  describe('audit logging', () => {
    it('should log consent given', async () => {
      await privacyManager.initialize()
      
      await privacyManager.giveConsent('data_processing')
      
      const auditLog = privacyManager.getAuditLog()
      expect(auditLog.length).toBeGreaterThan(0)
      
      const consentLog = auditLog.find(log => log.action === 'consent_given')
      expect(consentLog).toBeDefined()
      expect(consentLog?.details.consentType).toBe('data_processing')
    })

    it('should log consent revoked', async () => {
      await privacyManager.initialize()
      
      await privacyManager.revokeConsent('data_processing')
      
      const auditLog = privacyManager.getAuditLog()
      expect(auditLog.length).toBeGreaterThan(0)
      
      const consentLog = auditLog.find(log => log.action === 'consent_revoked')
      expect(consentLog).toBeDefined()
      expect(consentLog?.details.consentType).toBe('data_processing')
    })

    it('should log data access', async () => {
      await privacyManager.initialize()
      
      await privacyManager.logDataAccess('analysis', 1024)
      
      const auditLog = privacyManager.getAuditLog()
      expect(auditLog.length).toBeGreaterThan(0)
      
      const accessLog = auditLog.find(log => log.action === 'data_access')
      expect(accessLog).toBeDefined()
      expect(accessLog?.details.dataType).toBe('analysis')
      expect(accessLog?.details.dataSize).toBe(1024)
    })
  })

  describe('data summary', () => {
    it('should get data summary', () => {
      const summary = privacyManager.getDataSummary()
      
      expect(summary).toBeDefined()
      expect(summary.totalSize).toBeDefined()
      expect(summary.dataTypes).toBeDefined()
      expect(summary.retentionStatus).toBeDefined()
    })
  })
})
