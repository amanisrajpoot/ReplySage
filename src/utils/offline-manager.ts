export interface OfflineStatus {
  isOnline: boolean
  lastOnline: Date | null
  lastOffline: Date | null
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
  isSlowConnection: boolean
}

export class OfflineManager {
  private static instance: OfflineManager
  private status: OfflineStatus
  private listeners: Array<(status: OfflineStatus) => void> = []
  private isInitialized = false

  private constructor() {
    this.status = {
      isOnline: navigator.onLine,
      lastOnline: null,
      lastOffline: null,
      connectionType: 'unknown',
      isSlowConnection: false
    }
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager()
    }
    return OfflineManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Set up online/offline event listeners
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))

      // Detect connection type if available
      await this.detectConnectionType()

      // Check for slow connection
      await this.detectSlowConnection()

      this.isInitialized = true
      console.log('ReplySage: Offline manager initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize offline manager:', error)
    }
  }

  private handleOnline(): void {
    this.status.isOnline = true
    this.status.lastOnline = new Date()
    this.notifyListeners()
    console.log('ReplySage: Back online')
  }

  private handleOffline(): void {
    this.status.isOnline = false
    this.status.lastOffline = new Date()
    this.notifyListeners()
    console.log('ReplySage: Gone offline')
  }

  private async detectConnectionType(): Promise<void> {
    try {
      // Check if Connection API is available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          switch (connection.effectiveType) {
            case 'slow-2g':
            case '2g':
              this.status.connectionType = 'cellular'
              this.status.isSlowConnection = true
              break
            case '3g':
              this.status.connectionType = 'cellular'
              this.status.isSlowConnection = false
              break
            case '4g':
              this.status.connectionType = 'wifi'
              this.status.isSlowConnection = false
              break
            default:
              this.status.connectionType = 'unknown'
              this.status.isSlowConnection = false
          }
        }
      }
    } catch (error) {
      console.error('ReplySage: Failed to detect connection type:', error)
    }
  }

  private async detectSlowConnection(): Promise<void> {
    try {
      // Simple speed test by measuring time to fetch a small resource
      const startTime = performance.now()
      
      // Try to fetch a small resource to test connection speed
      // const _response = await fetch('data:text/plain,test', { cache: 'no-cache' })
      const endTime = performance.now()
      
      const duration = endTime - startTime
      this.status.isSlowConnection = duration > 1000 // Consider slow if > 1 second
    } catch (error) {
      // If fetch fails, assume slow connection
      this.status.isSlowConnection = true
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.status)
      } catch (error) {
        console.error('ReplySage: Error in offline status listener:', error)
      }
    })
  }

  addListener(listener: (status: OfflineStatus) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  getStatus(): OfflineStatus {
    return { ...this.status }
  }

  isOnline(): boolean {
    return this.status.isOnline
  }

  isSlowConnection(): boolean {
    return this.status.isSlowConnection
  }

  getConnectionType(): string {
    return this.status.connectionType
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('data:text/plain,test', { 
        cache: 'no-cache',
        method: 'HEAD'
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.status.isOnline) {
        resolve(true)
        return
      }

      const unsubscribe = this.addListener((status) => {
        if (status.isOnline) {
          unsubscribe()
          resolve(true)
        }
      })

      // Timeout after specified time
      setTimeout(() => {
        unsubscribe()
        resolve(false)
      }, timeout)
    })
  }

  getOfflineDuration(): number | null {
    if (this.status.isOnline || !this.status.lastOffline) {
      return null
    }
    return Date.now() - this.status.lastOffline.getTime()
  }

  getOnlineDuration(): number | null {
    if (!this.status.isOnline || !this.status.lastOnline) {
      return null
    }
    return Date.now() - this.status.lastOnline.getTime()
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  getConnectionStatusMessage(): string {
    if (this.status.isOnline) {
      if (this.status.isSlowConnection) {
        return 'Connected (slow connection)'
      } else {
        return 'Connected'
      }
    } else {
      const duration = this.getOfflineDuration()
      if (duration) {
        return `Offline for ${this.formatDuration(duration)}`
      } else {
        return 'Offline'
      }
    }
  }

  shouldUseOfflineMode(): boolean {
    return !this.status.isOnline || this.status.isSlowConnection
  }

  shouldCacheResults(): boolean {
    return this.shouldUseOfflineMode() || this.status.connectionType === 'cellular'
  }

  shouldDownloadModels(): boolean {
    return this.status.isOnline && !this.status.isSlowConnection
  }

  cleanup(): void {
    window.removeEventListener('online', this.handleOnline.bind(this))
    window.removeEventListener('offline', this.handleOffline.bind(this))
    this.listeners = []
    this.isInitialized = false
  }
}
