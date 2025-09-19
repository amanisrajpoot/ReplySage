import { UserSettings } from '@/types'

export class EncryptionHelper {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12
  private static readonly SALT_LENGTH = 16

  /**
   * Generate a cryptographic key from a password using PBKDF2
   */
  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Generate a random salt
   */
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
  }

  /**
   * Generate a random IV
   */
  static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
  }

  /**
   * Encrypt data using AES-GCM
   */
  static async encrypt(data: string, password: string): Promise<string> {
    try {
      const salt = this.generateSalt()
      const iv = this.generateIV()
      const key = await this.deriveKey(password, salt)
      
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv as BufferSource
        },
        key,
        new TextEncoder().encode(data)
      )

      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength)
      combined.set(salt, 0)
      combined.set(iv, salt.length)
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length)

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('ReplySage: Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt data using AES-GCM
   */
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      // Convert from base64
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
      
      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, this.SALT_LENGTH)
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH)
      const encrypted = combined.slice(this.SALT_LENGTH + this.IV_LENGTH)
      
      const key = await this.deriveKey(password, salt)
      
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv as BufferSource
        },
        key,
        encrypted
      )

      return new TextDecoder().decode(decryptedData)
    } catch (error) {
      console.error('ReplySage: Decryption failed:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Encrypt user settings
   */
  static async encryptSettings(settings: UserSettings, password: string): Promise<string> {
    const settingsJson = JSON.stringify(settings)
    return this.encrypt(settingsJson, password)
  }

  /**
   * Decrypt user settings
   */
  static async decryptSettings(encryptedSettings: string, password: string): Promise<UserSettings> {
    const settingsJson = await this.decrypt(encryptedSettings, password)
    return JSON.parse(settingsJson)
  }

  /**
   * Encrypt API key
   */
  static async encryptApiKey(apiKey: string, password: string): Promise<string> {
    return this.encrypt(apiKey, password)
  }

  /**
   * Decrypt API key
   */
  static async decryptApiKey(encryptedApiKey: string, password: string): Promise<string> {
    return this.decrypt(encryptedApiKey, password)
  }

  /**
   * Generate a secure password for encryption
   */
  static generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return password
  }

  /**
   * Hash a password for verification
   */
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password)
    return passwordHash === hash
  }

  /**
   * Check if encryption is supported
   */
  static isEncryptionSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.subtle.encrypt === 'function'
  }

  /**
   * Generate a device-specific encryption key
   */
  static async generateDeviceKey(): Promise<string> {
    try {
      // Use a combination of user agent and screen properties
      const deviceInfo = `${navigator.userAgent}-${screen.width}x${screen.height}-${navigator.language}`
      return await this.hashPassword(deviceInfo)
    } catch (error) {
      console.error('ReplySage: Failed to generate device key:', error)
      // Fallback to a random key
      return this.generateSecurePassword()
    }
  }

  /**
   * Encrypt data with device key
   */
  static async encryptWithDeviceKey(data: string): Promise<string> {
    const deviceKey = await this.generateDeviceKey()
    return this.encrypt(data, deviceKey)
  }

  /**
   * Decrypt data with device key
   */
  static async decryptWithDeviceKey(encryptedData: string): Promise<string> {
    const deviceKey = await this.generateDeviceKey()
    return this.decrypt(encryptedData, deviceKey)
  }
}

export class SecureStorage {
  private static readonly STORAGE_PREFIX = 'replysage_encrypted_'

  /**
   * Store encrypted data in chrome.storage.local
   */
  static async setEncrypted(key: string, data: any, password?: string): Promise<void> {
    try {
      const dataString = JSON.stringify(data)
      const encryptedData = password 
        ? await EncryptionHelper.encrypt(dataString, password)
        : await EncryptionHelper.encryptWithDeviceKey(dataString)
      
      await chrome.storage.local.set({
        [this.STORAGE_PREFIX + key]: encryptedData
      })
    } catch (error) {
      console.error('ReplySage: Failed to store encrypted data:', error)
      throw error
    }
  }

  /**
   * Retrieve and decrypt data from chrome.storage.local
   */
  static async getEncrypted(key: string, password?: string): Promise<any> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_PREFIX + key])
      const encryptedData = result[this.STORAGE_PREFIX + key]
      
      if (!encryptedData) {
        return null
      }

      const decryptedData = password
        ? await EncryptionHelper.decrypt(encryptedData, password)
        : await EncryptionHelper.decryptWithDeviceKey(encryptedData)
      
      return JSON.parse(decryptedData)
    } catch (error) {
      console.error('ReplySage: Failed to retrieve encrypted data:', error)
      return null
    }
  }

  /**
   * Remove encrypted data from storage
   */
  static async removeEncrypted(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove([this.STORAGE_PREFIX + key])
    } catch (error) {
      console.error('ReplySage: Failed to remove encrypted data:', error)
      throw error
    }
  }

  /**
   * Clear all encrypted data
   */
  static async clearAllEncrypted(): Promise<void> {
    try {
      const allData = await chrome.storage.local.get()
      const encryptedKeys = Object.keys(allData).filter(key => 
        key.startsWith(this.STORAGE_PREFIX)
      )
      
      if (encryptedKeys.length > 0) {
        await chrome.storage.local.remove(encryptedKeys)
      }
    } catch (error) {
      console.error('ReplySage: Failed to clear encrypted data:', error)
      throw error
    }
  }

  /**
   * List all encrypted keys
   */
  static async listEncryptedKeys(): Promise<string[]> {
    try {
      const allData = await chrome.storage.local.get()
      return Object.keys(allData)
        .filter(key => key.startsWith(this.STORAGE_PREFIX))
        .map(key => key.replace(this.STORAGE_PREFIX, ''))
    } catch (error) {
      console.error('ReplySage: Failed to list encrypted keys:', error)
      return []
    }
  }
}
