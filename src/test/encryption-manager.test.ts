import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EncryptionManager } from '../utils/encryption-manager'

describe('EncryptionManager', () => {
  let encryptionManager: EncryptionManager

  beforeEach(() => {
    encryptionManager = EncryptionManager.getInstance()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(encryptionManager.initialize()).resolves.not.toThrow()
    })
  })

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt data correctly', async () => {
      await encryptionManager.initialize()
      
      const testData = 'Hello, World!'
      const encrypted = await encryptionManager.encrypt(testData)
      const decrypted = await encryptionManager.decrypt(encrypted)
      
      expect(encrypted).toBeDefined()
      expect(encrypted.data).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.keyId).toBe('master')
      expect(decrypted).toBe(testData)
    })

    it('should handle empty string', async () => {
      await encryptionManager.initialize()
      
      const testData = ''
      const encrypted = await encryptionManager.encrypt(testData)
      const decrypted = await encryptionManager.decrypt(encrypted)
      
      expect(decrypted).toBe(testData)
    })

    it('should handle special characters', async () => {
      await encryptionManager.initialize()
      
      const testData = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?'
      const encrypted = await encryptionManager.encrypt(testData)
      const decrypted = await encryptionManager.decrypt(encrypted)
      
      expect(decrypted).toBe(testData)
    })
  })

  describe('password-based encryption', () => {
    it('should encrypt and decrypt with password', async () => {
      await encryptionManager.initialize()
      
      const testData = 'Sensitive data'
      const password = 'test-password'
      
      const encrypted = await encryptionManager.encryptWithPassword(testData, password)
      const decrypted = await encryptionManager.decryptWithPassword(encrypted, password)
      
      expect(encrypted).toBeDefined()
      expect(encrypted.keyId).toBe('password-derived')
      expect(decrypted).toBe(testData)
    })

    it('should fail with wrong password', async () => {
      await encryptionManager.initialize()
      
      const testData = 'Sensitive data'
      const password = 'correct-password'
      const wrongPassword = 'wrong-password'
      
      const encrypted = await encryptionManager.encryptWithPassword(testData, password)
      
      await expect(
        encryptionManager.decryptWithPassword(encrypted, wrongPassword)
      ).rejects.toThrow()
    })
  })

  describe('key management', () => {
    it('should generate data key', async () => {
      await encryptionManager.initialize()
      
      const key = await encryptionManager.generateDataKey()
      expect(key).toBeDefined()
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
    })

    it('should get all keys', async () => {
      await encryptionManager.initialize()
      
      const keys = encryptionManager.getAllKeys()
      expect(Array.isArray(keys)).toBe(true)
      expect(keys.length).toBeGreaterThan(0)
    })
  })

  describe('hashing', () => {
    it('should hash data consistently', async () => {
      await encryptionManager.initialize()
      
      const data = 'test data'
      const hash1 = await encryptionManager.hashData(data)
      const hash2 = await encryptionManager.hashData(data)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toBeDefined()
      expect(typeof hash1).toBe('string')
    })

    it('should verify data correctly', async () => {
      await encryptionManager.initialize()
      
      const data = 'test data'
      const hash = await encryptionManager.hashData(data)
      const isValid = await encryptionManager.verifyData(data, hash)
      
      expect(isValid).toBe(true)
    })

    it('should detect data tampering', async () => {
      await encryptionManager.initialize()
      
      const data = 'test data'
      const modifiedData = 'modified data'
      const hash = await encryptionManager.hashData(data)
      const isValid = await encryptionManager.verifyData(modifiedData, hash)
      
      expect(isValid).toBe(false)
    })
  })

  describe('audit logging', () => {
    it('should log encryption operations', async () => {
      await encryptionManager.initialize()
      
      const testData = 'test data'
      await encryptionManager.encrypt(testData)
      
      const auditLog = encryptionManager.getAuditLog()
      expect(auditLog.length).toBeGreaterThan(0)
      
      const encryptionLog = auditLog.find(log => log.type === 'encryption')
      expect(encryptionLog).toBeDefined()
      expect(encryptionLog?.success).toBe(true)
    })
  })
})
