export interface WorkerTask {
  id: string
  type: string
  payload: any
  resolve: (value: any) => void
  reject: (error: Error) => void
  timestamp: Date
  timeout?: number
}

export interface WorkerStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageLatency: number
  activeWorkers: number
  queueLength: number
}

export class WorkerManager {
  private static instance: WorkerManager
  private workers: Worker[] = []
  private taskQueue: WorkerTask[] = []
  private activeTasks: Map<string, WorkerTask> = new Map()
  private isInitialized = false
  private maxWorkers = 2
  private taskTimeout = 30000 // 30 seconds
  private stats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageLatency: 0,
    activeWorkers: 0,
    queueLength: 0
  }

  private constructor() {}

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager()
    }
    return WorkerManager.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Create initial workers
      await this.createWorkers()
      
      // Start task processing
      this.startTaskProcessing()
      
      this.isInitialized = true
      console.log('ReplySage: Worker manager initialized')
    } catch (error) {
      console.error('ReplySage: Failed to initialize worker manager:', error)
      throw error
    }
  }

  private async createWorkers(): Promise<void> {
    try {
      for (let i = 0; i < this.maxWorkers; i++) {
        const worker = new Worker(new URL('../workers/ai-worker.ts', import.meta.url), {
          type: 'module'
        })
        
        worker.onmessage = (event) => {
          this.handleWorkerMessage(worker, event.data)
        }
        
        worker.onerror = (error) => {
          console.error('ReplySage: Worker error:', error)
          this.handleWorkerError(worker, new Error(error.message || 'Worker error'))
        }
        
        this.workers.push(worker)
      }
      
      this.stats.activeWorkers = this.workers.length
    } catch (error) {
      console.error('ReplySage: Failed to create workers:', error)
      throw error
    }
  }

  private handleWorkerMessage(_worker: Worker, data: any): void {
    try {
      const { id, type, payload, error } = data
      
      if (type === 'success') {
        this.completeTask(id, payload)
      } else if (type === 'error') {
        this.failTask(id, new Error(error))
      }
    } catch (error) {
      console.error('ReplySage: Failed to handle worker message:', error)
    }
  }

  private handleWorkerError(worker: Worker, error: Error): void {
    try {
      // Find and fail all active tasks for this worker
      const activeTasks = Array.from(this.activeTasks.values())
      activeTasks.forEach(task => {
        if (this.workers.indexOf(worker) !== -1) {
          this.failTask(task.id, error as Error)
        }
      })
      
      // Replace the failed worker
      this.replaceWorker(worker)
    } catch (error) {
      console.error('ReplySage: Failed to handle worker error:', error)
    }
  }

  private replaceWorker(failedWorker: Worker): void {
    try {
      const workerIndex = this.workers.indexOf(failedWorker)
      if (workerIndex !== -1) {
        // Terminate the failed worker
        failedWorker.terminate()
        
        // Create a new worker
        this.createWorkers().then(() => {
          this.workers.splice(workerIndex, 1)
          this.stats.activeWorkers = this.workers.length
        })
      }
    } catch (error) {
      console.error('ReplySage: Failed to replace worker:', error)
    }
  }

  private completeTask(taskId: string, result: any): void {
    try {
      const task = this.activeTasks.get(taskId)
      if (task) {
        task.resolve(result)
        this.activeTasks.delete(taskId)
        this.stats.completedTasks++
        this.updateAverageLatency(Date.now() - task.timestamp.getTime())
      }
    } catch (error) {
      console.error('ReplySage: Failed to complete task:', error)
    }
  }

  private failTask(taskId: string, error: Error): void {
    try {
      const task = this.activeTasks.get(taskId)
      if (task) {
        task.reject(error)
        this.activeTasks.delete(taskId)
        this.stats.failedTasks++
      }
    } catch (error) {
      console.error('ReplySage: Failed to fail task:', error)
    }
  }

  private updateAverageLatency(latency: number): void {
    const totalLatency = this.stats.averageLatency * (this.stats.completedTasks - 1) + latency
    this.stats.averageLatency = totalLatency / this.stats.completedTasks
  }

  private startTaskProcessing(): void {
    setInterval(() => {
      this.processQueue()
    }, 100) // Check every 100ms
  }

  private processQueue(): void {
    try {
      // Process tasks if we have available workers
      while (this.taskQueue.length > 0 && this.activeTasks.size < this.workers.length) {
        const task = this.taskQueue.shift()!
        this.executeTask(task)
      }
      
      // Update queue length
      this.stats.queueLength = this.taskQueue.length
    } catch (error) {
      console.error('ReplySage: Failed to process queue:', error)
    }
  }

  private executeTask(task: WorkerTask): void {
    try {
      // Find an available worker
      const worker = this.workers[this.activeTasks.size % this.workers.length]
      
      if (worker) {
        // Add to active tasks
        this.activeTasks.set(task.id, task)
        
        // Send task to worker
        worker.postMessage({
          id: task.id,
          type: task.type,
          payload: task.payload
        })
        
        // Set timeout
        if (task.timeout) {
          setTimeout(() => {
            if (this.activeTasks.has(task.id)) {
              this.failTask(task.id, new Error('Task timeout'))
            }
          }, task.timeout)
        }
      } else {
        // No available workers, put back in queue
        this.taskQueue.unshift(task)
      }
    } catch (error) {
      console.error('ReplySage: Failed to execute task:', error)
      this.failTask(task.id, error as Error)
    }
  }

  async submitTask(type: string, payload: any, timeout?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload,
        resolve,
        reject,
        timestamp: new Date(),
        timeout: timeout || this.taskTimeout
      }
      
      this.taskQueue.push(task)
      this.stats.totalTasks++
      this.stats.queueLength = this.taskQueue.length
    })
  }

  async analyzeMessage(message: any, analysisType: string): Promise<any> {
    return this.submitTask('analyze', { message, analysisType })
  }

  async summarizeText(text: string, maxLength?: number): Promise<any> {
    return this.submitTask('summarize', { text, maxLength })
  }

  async generateEmbedding(text: string): Promise<any> {
    return this.submitTask('embed', { text })
  }

  async generateReply(originalMessage: any, replyType: string, tone: string, length: string): Promise<any> {
    return this.submitTask('generate_reply', { originalMessage, replyType, tone, length })
  }

  async extractActions(text: string): Promise<any> {
    return this.submitTask('extract_actions', { text })
  }

  getStats(): WorkerStats {
    return { ...this.stats }
  }

  getQueueLength(): number {
    return this.taskQueue.length
  }

  getActiveTasksCount(): number {
    return this.activeTasks.size
  }

  clearQueue(): void {
    // Reject all queued tasks
    this.taskQueue.forEach(task => {
      task.reject(new Error('Queue cleared'))
    })
    this.taskQueue = []
    this.stats.queueLength = 0
  }

  terminateAllWorkers(): void {
    try {
      this.workers.forEach(worker => {
        worker.terminate()
      })
      this.workers = []
      this.activeTasks.clear()
      this.taskQueue = []
      this.stats.activeWorkers = 0
      this.stats.queueLength = 0
    } catch (error) {
      console.error('ReplySage: Failed to terminate workers:', error)
    }
  }

  async restart(): Promise<void> {
    try {
      this.terminateAllWorkers()
      await this.initialize()
    } catch (error) {
      console.error('ReplySage: Failed to restart workers:', error)
      throw error
    }
  }
}
