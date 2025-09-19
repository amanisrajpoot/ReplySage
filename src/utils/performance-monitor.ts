export interface PerformanceMetric {
  id: string
  name: string
  type: 'timing' | 'memory' | 'cpu' | 'network' | 'custom'
  value: number
  unit: string
  timestamp: Date
  context?: {
    modelName?: string
    operation?: string
    messageId?: string
    threadId?: string
  }
}

export interface PerformanceStats {
  totalOperations: number
  averageLatency: number
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  cpuUsage: {
    average: number
    peak: number
  }
  networkUsage: {
    requests: number
    bytesTransferred: number
  }
  modelPerformance: {
    [modelName: string]: {
      averageLatency: number
      successRate: number
      memoryUsage: number
    }
  }
}

export interface PerformanceThresholds {
  maxLatency: number
  maxMemoryUsage: number
  maxCpuUsage: number
  minSuccessRate: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private isInitialized = false
  private thresholds: PerformanceThresholds = {
    maxLatency: 5000, // 5 seconds
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    maxCpuUsage: 80, // 80%
    minSuccessRate: 0.9 // 90%
  }
  private observers: ((metric: PerformanceMetric) => void)[] = []

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Set up performance observers
      this.setupPerformanceObservers()
      
      // Set up memory monitoring
      this.setupMemoryMonitoring()
      
      // Set up CPU monitoring
      this.setupCpuMonitoring()
      
      this.isInitialized = true
      console.log('ReplySage: Performance monitor initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize performance monitor:', error)
      throw error
    }
  }

  private setupPerformanceObservers(): void {
    try {
      // Observe performance entries
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach(entry => {
            this.recordMetric({
              id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: entry.name,
              type: 'timing',
              value: entry.duration,
              unit: 'ms',
              timestamp: new Date(entry.startTime)
            })
          })
        })
        
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] })
      }
    } catch (error) {
      console.error('ReplySage: Failed to setup performance observers:', error)
    }
  }

  private setupMemoryMonitoring(): void {
    try {
      // Monitor memory usage if available
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory
          this.recordMetric({
            id: `memory_${Date.now()}`,
            name: 'memory_usage',
            type: 'memory',
            value: memory.usedJSHeapSize,
            unit: 'bytes',
            timestamp: new Date(),
            context: {
              total: memory.totalJSHeapSize,
              limit: memory.jsHeapSizeLimit
            }
          })
        }, 10000) // Check every 10 seconds
      }
    } catch (error) {
      console.error('ReplySage: Failed to setup memory monitoring:', error)
    }
  }

  private setupCpuMonitoring(): void {
    try {
      // Monitor CPU usage if available
      if ('cpu' in performance) {
        setInterval(() => {
          const cpu = (performance as any).cpu
          this.recordMetric({
            id: `cpu_${Date.now()}`,
            name: 'cpu_usage',
            type: 'cpu',
            value: cpu.usage,
            unit: 'percentage',
            timestamp: new Date()
          })
        }, 5000) // Check every 5 seconds
      }
    } catch (error) {
      console.error('ReplySage: Failed to setup CPU monitoring:', error)
    }
  }

  recordMetric(metric: PerformanceMetric): void {
    try {
      // Add to metrics array
      this.metrics.push(metric)
      
      // Keep only last 1000 metrics to prevent memory issues
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000)
      }
      
      // Notify observers
      this.observers.forEach(observer => {
        try {
          observer(metric)
        } catch (error) {
          console.error('ReplySage: Observer error:', error)
        }
      })
      
      // Check thresholds
      this.checkThresholds(metric)
    } catch (error) {
      console.error('ReplySage: Failed to record metric:', error)
    }
  }

  private checkThresholds(metric: PerformanceMetric): void {
    try {
      switch (metric.type) {
        case 'timing':
          if (metric.value > this.thresholds.maxLatency) {
            console.warn(`ReplySage: High latency detected: ${metric.value}ms for ${metric.name}`)
          }
          break
        case 'memory':
          if (metric.value > this.thresholds.maxMemoryUsage) {
            console.warn(`ReplySage: High memory usage detected: ${metric.value} bytes`)
          }
          break
        case 'cpu':
          if (metric.value > this.thresholds.maxCpuUsage) {
            console.warn(`ReplySage: High CPU usage detected: ${metric.value}%`)
          }
          break
      }
    } catch (error) {
      console.error('ReplySage: Failed to check thresholds:', error)
    }
  }

  startTiming(name: string, context?: any): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.recordMetric({
        id: `timing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        type: 'timing',
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        context
      })
    }
  }

  recordMemoryUsage(name: string, context?: any): void {
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        this.recordMetric({
          id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          type: 'memory',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: new Date(),
          context: {
            ...context,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          }
        })
      }
    } catch (error) {
      console.error('ReplySage: Failed to record memory usage:', error)
    }
  }

  recordNetworkRequest(url: string, duration: number, size: number, success: boolean): void {
    this.recordMetric({
      id: `network_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'network_request',
      type: 'network',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      context: {
        url,
        size,
        success
      }
    })
  }

  recordModelPerformance(modelName: string, operation: string, duration: number, success: boolean, memoryUsage?: number): void {
    this.recordMetric({
      id: `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'model_performance',
      type: 'custom',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      context: {
        modelName,
        operation,
        success,
        memoryUsage
      }
    })
  }

  getStats(timeRange?: { start: Date; end: Date }): PerformanceStats {
    try {
      let filteredMetrics = this.metrics
      
      if (timeRange) {
        filteredMetrics = this.metrics.filter(metric => 
          metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
        )
      }
      
      const timingMetrics = filteredMetrics.filter(m => m.type === 'timing')
      const memoryMetrics = filteredMetrics.filter(m => m.type === 'memory')
      const cpuMetrics = filteredMetrics.filter(m => m.type === 'cpu')
      const networkMetrics = filteredMetrics.filter(m => m.type === 'network')
      const modelMetrics = filteredMetrics.filter(m => m.context?.modelName)
      
      // Calculate basic stats
      const totalOperations = timingMetrics.length
      const averageLatency = timingMetrics.length > 0 
        ? timingMetrics.reduce((sum, m) => sum + m.value, 0) / timingMetrics.length 
        : 0
      
      // Calculate memory usage
      const latestMemory = memoryMetrics[memoryMetrics.length - 1]
      const memoryUsage = latestMemory ? {
        used: latestMemory.value,
        total: latestMemory.context?.total || 0,
        percentage: latestMemory.context?.total 
          ? (latestMemory.value / latestMemory.context.total) * 100 
          : 0
      } : { used: 0, total: 0, percentage: 0 }
      
      // Calculate CPU usage
      const cpuUsage = cpuMetrics.length > 0 ? {
        average: cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length,
        peak: Math.max(...cpuMetrics.map(m => m.value))
      } : { average: 0, peak: 0 }
      
      // Calculate network usage
      const networkUsage = {
        requests: networkMetrics.length,
        bytesTransferred: networkMetrics.reduce((sum, m) => sum + (m.context?.size || 0), 0)
      }
      
      // Calculate model performance
      const modelPerformance: { [key: string]: any } = {}
      const modelGroups = modelMetrics.reduce((groups, metric) => {
        const modelName = metric.context?.modelName || 'unknown'
        if (!groups[modelName]) {
          groups[modelName] = []
        }
        groups[modelName].push(metric)
        return groups
      }, {} as { [key: string]: PerformanceMetric[] })
      
      Object.entries(modelGroups).forEach(([modelName, metrics]) => {
        const successfulMetrics = metrics.filter(m => m.context?.success)
        modelPerformance[modelName] = {
          averageLatency: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length,
          successRate: successfulMetrics.length / metrics.length,
          memoryUsage: metrics.reduce((sum, m) => sum + (m.context?.memoryUsage || 0), 0) / metrics.length
        }
      })
      
      return {
        totalOperations,
        averageLatency,
        memoryUsage,
        cpuUsage,
        networkUsage,
        modelPerformance
      }
    } catch (error) {
      console.error('ReplySage: Failed to calculate stats:', error)
      return {
        totalOperations: 0,
        averageLatency: 0,
        memoryUsage: { used: 0, total: 0, percentage: 0 },
        cpuUsage: { average: 0, peak: 0 },
        networkUsage: { requests: 0, bytesTransferred: 0 },
        modelPerformance: {}
      }
    }
  }

  getMetricsByType(type: string, limit: number = 100): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.type === type)
      .slice(-limit)
  }

  getMetricsByModel(modelName: string, limit: number = 100): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.context?.modelName === modelName)
      .slice(-limit)
  }

  clearMetrics(): void {
    this.metrics = []
  }

  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  addObserver(observer: (metric: PerformanceMetric) => void): void {
    this.observers.push(observer)
  }

  removeObserver(observer: (metric: PerformanceMetric) => void): void {
    const index = this.observers.indexOf(observer)
    if (index > -1) {
      this.observers.splice(index, 1)
    }
  }

  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  importMetrics(metrics: PerformanceMetric[]): void {
    this.metrics = [...this.metrics, ...metrics]
  }
}
