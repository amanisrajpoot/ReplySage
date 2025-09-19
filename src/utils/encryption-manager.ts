export interface EncryptionKey {
  key: CryptoKey
  algorithm: string
  keyId: string
  createdAt: Date
  expiresAt?: Date
}

export interface EncryptedData {
  data: string
  iv: string
  keyId: string
  algorithm: string
  timestamp: Date
}

export interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
  keyDerivation: {
    algorithm: string
    iterations: number
    saltLength: number
  }
}

export interface SecurityAudit {
  id: string
  type: 'encryption' | 'decryption' | 'key_generation' | 'key_rotation' | 'data_access'
  timestamp: Date
  success: boolean
  details: {
    keyId?: string
    dataSize?: number
    algorithm?: string
    error?: string
  }
}

export class EncryptionManager {
  private static instance: EncryptionManager
  private keys: Map<string, EncryptionKey> = new Map()
  private config: EncryptionConfig
  private isInitialized = false
  private auditLog: SecurityAudit[] = []

  private constructor() {
    this.config = {
      algorithm: 'AES-GCM',
      keyLength: 256,
      ivLength: 12,
      keyDerivation: {
        algorithm: 'PBKDF2',
        iterations: 100000,
        saltLength: 16
      }
    }
  }

  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager()
    }
    return EncryptionManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Check if WebCrypto is available
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('WebCrypto API not available')
      }

      // Generate master key if it doesn't exist
      await this.ensureMasterKey()

      this.isInitialized = true
      console.log('ReplySage: Encryption manager initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize encryption manager:', error)
      throw error
    }
  }

  private async ensureMasterKey(): Promise<void> {
    try {
      const storedKey = await this.getStoredMasterKey()
      if (storedKey) {
        this.keys.set('master', storedKey)
        return
      }

      // Generate new master key
      const masterKey = await this.generateKey('master')
      await this.storeMasterKey(masterKey)
      this.keys.set('master', masterKey)
    } catch (error) {
      console.error('ReplySage: Failed to ensure master key:', error)
      throw error
    }
  }

  private async generateKey(keyId: string, expiresAt?: Date): Promise<EncryptionKey> {
    try {
      const key = await window.crypto.subtle.generateKey(
        {
          name: this.config.algorithm,
          length: this.config.keyLength
        },
        true, // extractable
        ['encrypt', 'decrypt']
      )

      const encryptionKey: EncryptionKey = {
        key,
        algorithm: this.config.algorithm,
        keyId,
        createdAt: new Date(),
        expiresAt
      }

      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'key_generation',
        timestamp: new Date(),
        success: true,
        details: { keyId, algorithm: this.config.algorithm }
      })

      return encryptionKey
    } catch (error) {
      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'key_generation',
        timestamp: new Date(),
        success: false,
        details: { keyId, error: error.message }
      })
      throw error
    }
  }

  private async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    try {
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: this.config.keyDerivation.algorithm },
        false,
        ['deriveKey']
      )

      return await window.crypto.subtle.deriveKey(
        {
          name: this.config.keyDerivation.algorithm,
          salt: salt,
          iterations: this.config.keyDerivation.iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.config.algorithm, length: this.config.keyLength },
        false,
        ['encrypt', 'decrypt']
      )
    } catch (error) {
      console.error('ReplySage: Failed to derive key from password:', error)
      throw error
    }
  }

  async encrypt(data: string, keyId: string = 'master'): Promise<EncryptedData> {
    try {
      const encryptionKey = this.keys.get(keyId)
      if (!encryptionKey) {
        throw new Error(`Key ${keyId} not found`)
      }

      // Check if key is expired
      if (encryptionKey.expiresAt && encryptionKey.expiresAt < new Date()) {
        throw new Error(`Key ${keyId} has expired`)
      }

      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(this.config.ivLength))

      // Encrypt the data
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: this.config.algorithm,
          iv: iv
        },
        encryptionKey.key,
        new TextEncoder().encode(data)
      )

      const result: EncryptedData = {
        data: this.arrayBufferToBase64(encryptedData),
        iv: this.arrayBufferToBase64(iv),
        keyId,
        algorithm: this.config.algorithm,
        timestamp: new Date()
      }

      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'encryption',
        timestamp: new Date(),
        success: true,
        details: { keyId, dataSize: data.length, algorithm: this.config.algorithm }
      })

      return result
    } catch (error) {
      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'encryption',
        timestamp: new Date(),
        success: false,
        details: { keyId, error: error.message }
      })
      throw error
    }
  }

  async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      const encryptionKey = this.keys.get(encryptedData.keyId)
      if (!encryptionKey) {
        throw new Error(`Key ${encryptedData.keyId} not found`)
      }

      // Check if key is expired
      if (encryptionKey.expiresAt && encryptionKey.expiresAt < new Date()) {
        throw new Error(`Key ${encryptedData.keyId} has expired`)
      }

      // Convert base64 to ArrayBuffer
      const data = this.base64ToArrayBuffer(encryptedData.data)
      const iv = this.base64ToArrayBuffer(encryptedData.iv)

      // Decrypt the data
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: encryptedData.algorithm,
          iv: iv
        },
        encryptionKey.key,
        data
      )

      const result = new TextDecoder().decode(decryptedData)

      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'decryption',
        timestamp: new Date(),
        success: true,
        details: { keyId: encryptedData.keyId, dataSize: result.length, algorithm: encryptedData.algorithm }
      })

      return result
    } catch (error) {
      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'decryption',
        timestamp: new Date(),
        success: false,
        details: { keyId: encryptedData.keyId, error: error.message }
      })
      throw error
    }
  }

  async encryptWithPassword(data: string, password: string): Promise<EncryptedData> {
    try {
      // Generate random salt
      const salt = window.crypto.getRandomValues(new Uint8Array(this.config.keyDerivation.saltLength))

      // Derive key from password
      const key = await this.deriveKeyFromPassword(password, salt)

      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(this.config.ivLength))

      // Encrypt the data
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: this.config.algorithm,
          iv: iv
        },
        key,
        new TextEncoder().encode(data)
      )

      // Combine salt and encrypted data
      const combined = new Uint8Array(salt.length + encryptedData.byteLength)
      combined.set(salt)
      combined.set(new Uint8Array(encryptedData), salt.length)

      const result: EncryptedData = {
        data: this.arrayBufferToBase64(combined),
        iv: this.arrayBufferToBase64(iv),
        keyId: 'password-derived',
        algorithm: this.config.algorithm,
        timestamp: new Date()
      }

      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'encryption',
        timestamp: new Date(),
        success: true,
        details: { keyId: 'password-derived', dataSize: data.length, algorithm: this.config.algorithm }
      })

      return result
    } catch (error) {
      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'encryption',
        timestamp: new Date(),
        success: false,
        details: { keyId: 'password-derived', error: error.message }
      })
      throw error
    }
  }

  async decryptWithPassword(encryptedData: EncryptedData, password: string): Promise<string> {
    try {
      // Extract salt and encrypted data
      const combined = this.base64ToArrayBuffer(encryptedData.data)
      const salt = combined.slice(0, this.config.keyDerivation.saltLength)
      const data = combined.slice(this.config.keyDerivation.saltLength)

      // Derive key from password
      const key = await this.deriveKeyFromPassword(password, salt)

      // Convert IV
      const iv = this.base64ToArrayBuffer(encryptedData.iv)

      // Decrypt the data
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: encryptedData.algorithm,
          iv: iv
        },
        key,
        data
      )

      const result = new TextDecoder().decode(decryptedData)

      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'decryption',
        timestamp: new Date(),
        success: true,
        details: { keyId: 'password-derived', dataSize: result.length, algorithm: encryptedData.algorithm }
      })

      return result
    } catch (error) {
      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'decryption',
        timestamp: new Date(),
        success: false,
        details: { keyId: 'password-derived', error: error.message }
      })
      throw error
    }
  }

  async rotateKey(keyId: string): Promise<void> {
    try {
      const oldKey = this.keys.get(keyId)
      if (!oldKey) {
        throw new Error(`Key ${keyId} not found`)
      }

      // Generate new key
      const newKey = await this.generateKey(keyId, oldKey.expiresAt)
      this.keys.set(keyId, newKey)

      // Store new key
      if (keyId === 'master') {
        await this.storeMasterKey(newKey)
      }

      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'key_rotation',
        timestamp: new Date(),
        success: true,
        details: { keyId, algorithm: this.config.algorithm }
      })
    } catch (error) {
      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'key_rotation',
        timestamp: new Date(),
        success: false,
        details: { keyId, error: error.message }
      })
      throw error
    }
  }

  async generateDataKey(): Promise<string> {
    try {
      const key = await this.generateKey(`data_${Date.now()}`)
      const exportedKey = await window.crypto.subtle.exportKey('raw', key.key)
      return this.arrayBufferToBase64(exportedKey)
    } catch (error) {
      console.error('ReplySage: Failed to generate data key:', error)
      throw error
    }
  }

  async hashData(data: string): Promise<string> {
    try {
      const hash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
      return this.arrayBufferToBase64(hash)
    } catch (error) {
      console.error('ReplySage: Failed to hash data:', error)
      throw error
    }
  }

  async verifyData(data: string, hash: string): Promise<boolean> {
    try {
      const dataHash = await this.hashData(data)
      return dataHash === hash
    } catch (error) {
      console.error('ReplySage: Failed to verify data:', error)
      return false
    }
  }

  private async getStoredMasterKey(): Promise<EncryptionKey | null> {
    try {
      const stored = await chrome.storage.local.get(['masterKey'])
      if (!stored.masterKey) return null

      const keyData = JSON.parse(stored.masterKey)
      const key = await window.crypto.subtle.importKey(
        'raw',
        this.base64ToArrayBuffer(keyData.keyData),
        { name: this.config.algorithm },
        true,
        ['encrypt', 'decrypt']
      )

      return {
        key,
        algorithm: keyData.algorithm,
        keyId: keyData.keyId,
        createdAt: new Date(keyData.createdAt),
        expiresAt: keyData.expiresAt ? new Date(keyData.expiresAt) : undefined
      }
    } catch (error) {
      console.error('ReplySage: Failed to get stored master key:', error)
      return null
    }
  }

  private async storeMasterKey(key: EncryptionKey): Promise<void> {
    try {
      const exportedKey = await window.crypto.subtle.exportKey('raw', key.key)
      const keyData = {
        keyData: this.arrayBufferToBase64(exportedKey),
        algorithm: key.algorithm,
        keyId: key.keyId,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt?.toISOString()
      }

      await chrome.storage.local.set({ masterKey: JSON.stringify(keyData) })
    } catch (error) {
      console.error('ReplySage: Failed to store master key:', error)
      throw error
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  getAuditLog(): SecurityAudit[] {
    return [...this.auditLog]
  }

  clearAuditLog(): void {
    this.auditLog = []
  }

  getKeyInfo(keyId: string): EncryptionKey | undefined {
    return this.keys.get(keyId)
  }

  getAllKeys(): EncryptionKey[] {
    return Array.from(this.keys.values())
  }

  async deleteKey(keyId: string): Promise<void> {
    try {
      if (keyId === 'master') {
        throw new Error('Cannot delete master key')
      }

      this.keys.delete(keyId)
      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'data_access',
        timestamp: new Date(),
        success: true,
        details: { keyId, algorithm: 'key_deletion' }
      })
    } catch (error) {
      this.auditLog.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'data_access',
        timestamp: new Date(),
        success: false,
        details: { keyId, error: error.message }
      })
      throw error
    }
  }

  exportKeys(): { [keyId: string]: any } {
    const exported: { [keyId: string]: any } = {}
    this.keys.forEach((key, keyId) => {
      exported[keyId] = {
        algorithm: key.algorithm,
        keyId: key.keyId,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt?.toISOString()
      }
    })
    return exported
  }

  getConfig(): EncryptionConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<EncryptionConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}
