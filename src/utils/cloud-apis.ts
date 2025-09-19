import { EmailMessage, AnalysisResult, ActionItem, SuggestedReply, GrammarIssue } from '@/types'
import { EncryptionHelper } from './encryption'

export interface CloudProvider {
  name: 'openai' | 'anthropic' | 'azure'
  apiKey: string
  baseUrl?: string
  model: string
  maxTokens: number
  temperature: number
}

export interface CloudAnalysisRequest {
  message: EmailMessage
  redactedMessage: EmailMessage
  analysisType: 'summary' | 'action_items' | 'suggested_replies' | 'grammar' | 'sentiment' | 'full'
  userPreferences: {
    tone: 'formal' | 'casual' | 'concise'
    maxSummaryLength: number
    preferredLanguage: string
  }
}

export interface CloudAnalysisResponse {
  success: boolean
  result?: AnalysisResult
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cost: number
  }
}

export class CloudAPIManager {
  private static instance: CloudAPIManager
  private providers: Map<string, CloudProvider> = new Map()
  private encryptionHelper: EncryptionHelper

  private constructor() {
    this.encryptionHelper = new EncryptionHelper()
  }

  static getInstance(): CloudAPIManager {
    if (!CloudAPIManager.instance) {
      CloudAPIManager.instance = new CloudAPIManager()
    }
    return CloudAPIManager.instance
  }

  async addProvider(provider: CloudProvider): Promise<void> {
    try {
      // Encrypt the API key before storing
      const encryptedKey = await this.encryptionHelper.encryptApiKey(provider.apiKey, 'device-key')
      provider.apiKey = encryptedKey
      
      this.providers.set(provider.name, provider)
      console.log(`ReplySage: Added cloud provider ${provider.name}`)
    } catch (error) {
      console.error('ReplySage: Failed to add cloud provider:', error)
      throw error
    }
  }

  async removeProvider(providerName: string): Promise<void> {
    this.providers.delete(providerName)
    console.log(`ReplySage: Removed cloud provider ${providerName}`)
  }

  async getProvider(providerName: string): Promise<CloudProvider | null> {
    const provider = this.providers.get(providerName)
    if (!provider) return null

    try {
      // Decrypt the API key
      const decryptedKey = await this.encryptionHelper.decryptApiKey(provider.apiKey, 'device-key')
      return { ...provider, apiKey: decryptedKey }
    } catch (error) {
      console.error('ReplySage: Failed to decrypt API key:', error)
      return null
    }
  }

  async analyzeWithCloud(request: CloudAnalysisRequest): Promise<CloudAnalysisResponse> {
    try {
      // Get the first available provider
      const providerName = Array.from(this.providers.keys())[0]
      if (!providerName) {
        throw new Error('No cloud providers configured')
      }

      const provider = await this.getProvider(providerName)
      if (!provider) {
        throw new Error('Failed to get cloud provider')
      }

      console.log(`ReplySage: Analyzing with ${provider.name} cloud API`)

      switch (provider.name) {
        case 'openai':
          return await this.analyzeWithOpenAI(provider, request)
        case 'anthropic':
          return await this.analyzeWithAnthropic(provider, request)
        case 'azure':
          return await this.analyzeWithAzure(provider, request)
        default:
          throw new Error(`Unsupported provider: ${provider.name}`)
      }
    } catch (error) {
      console.error('ReplySage: Cloud analysis failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async analyzeWithOpenAI(provider: CloudProvider, request: CloudAnalysisRequest): Promise<CloudAnalysisResponse> {
    try {
      const messages = this.buildOpenAIMessages(request)
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          max_tokens: provider.maxTokens,
          temperature: provider.temperature,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const analysis = this.parseOpenAIResponse(data, request.message)
      
      return {
        success: true,
        result: analysis,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
          cost: this.calculateOpenAICost(data.usage, provider.model)
        }
      }
    } catch (error) {
      console.error('ReplySage: OpenAI analysis failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async analyzeWithAnthropic(provider: CloudProvider, request: CloudAnalysisRequest): Promise<CloudAnalysisResponse> {
    try {
      const prompt = this.buildAnthropicPrompt(request)
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': provider.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: provider.maxTokens,
          temperature: provider.temperature,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const analysis = this.parseAnthropicResponse(data, request.message)
      
      return {
        success: true,
        result: analysis,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
          cost: this.calculateAnthropicCost(data.usage, provider.model)
        }
      }
    } catch (error) {
      console.error('ReplySage: Anthropic analysis failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async analyzeWithAzure(provider: CloudProvider, request: CloudAnalysisRequest): Promise<CloudAnalysisResponse> {
    try {
      const messages = this.buildOpenAIMessages(request)
      const baseUrl = provider.baseUrl || 'https://your-resource.openai.azure.com'
      
      const response = await fetch(`${baseUrl}/openai/deployments/${provider.model}/chat/completions?api-version=2023-12-01-preview`, {
        method: 'POST',
        headers: {
          'api-key': provider.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          max_tokens: provider.maxTokens,
          temperature: provider.temperature,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Azure OpenAI API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const analysis = this.parseOpenAIResponse(data, request.message)
      
      return {
        success: true,
        result: analysis,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
          cost: this.calculateAzureCost(data.usage, provider.model)
        }
      }
    } catch (error) {
      console.error('ReplySage: Azure analysis failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private buildOpenAIMessages(request: CloudAnalysisRequest): Array<{ role: string; content: string }> {
    const { redactedMessage, analysisType, userPreferences } = request
    
    const systemPrompt = `You are an AI email assistant. Analyze the following email and provide a JSON response with the requested analysis.

User Preferences:
- Tone: ${userPreferences.tone}
- Max Summary Length: ${userPreferences.maxSummaryLength} words
- Language: ${userPreferences.preferredLanguage}

Please provide a JSON response with the following structure:
{
  "summary": "Brief summary of the email",
  "actionItems": [
    {
      "text": "Action item description",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "high|medium|low",
      "category": "category name"
    }
  ],
  "suggestedReplies": [
    {
      "text": "Suggested reply text",
      "tone": "formal|casual|concise",
      "length": "short|medium|long",
      "confidence": 0.0-1.0
    }
  ],
  "grammarIssues": [
    {
      "text": "Incorrect text",
      "suggestion": "Corrected text",
      "severity": "error|warning|info",
      "position": {"start": 0, "end": 10}
    }
  ],
  "sentiment": "positive|negative|neutral",
  "priority": "high|medium|low",
  "categories": ["category1", "category2"]
}`

    const userPrompt = `Email Subject: ${redactedMessage.subject}
From: ${redactedMessage.from}
To: ${redactedMessage.to.join(', ')}
Body: ${redactedMessage.body}

Please analyze this email for: ${analysisType}`

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  }

  private buildAnthropicPrompt(request: CloudAnalysisRequest): string {
    const { redactedMessage, analysisType, userPreferences } = request
    
    return `You are an AI email assistant. Analyze the following email and provide a JSON response with the requested analysis.

User Preferences:
- Tone: ${userPreferences.tone}
- Max Summary Length: ${userPreferences.maxSummaryLength} words
- Language: ${userPreferences.preferredLanguage}

Email Subject: ${redactedMessage.subject}
From: ${redactedMessage.from}
To: ${redactedMessage.to.join(', ')}
Body: ${redactedMessage.body}

Please analyze this email for: ${analysisType} and provide a JSON response with the following structure:
{
  "summary": "Brief summary of the email",
  "actionItems": [
    {
      "text": "Action item description",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "high|medium|low",
      "category": "category name"
    }
  ],
  "suggestedReplies": [
    {
      "text": "Suggested reply text",
      "tone": "formal|casual|concise",
      "length": "short|medium|long",
      "confidence": 0.0-1.0
    }
  ],
  "grammarIssues": [
    {
      "text": "Incorrect text",
      "suggestion": "Corrected text",
      "severity": "error|warning|info",
      "position": {"start": 0, "end": 10}
    }
  ],
  "sentiment": "positive|negative|neutral",
  "priority": "high|medium|low",
  "categories": ["category1", "category2"]
}`
  }

  private parseOpenAIResponse(data: any, originalMessage: EmailMessage): AnalysisResult {
    try {
      const content = data.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      const analysis = JSON.parse(content)
      
      return {
        messageId: originalMessage.id,
        summary: analysis.summary || '',
        actionItems: (analysis.actionItems || []).map((item: any) => ({
          text: item.text,
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
          priority: item.priority || 'medium',
          category: item.category || 'general',
          isCompleted: false
        })),
        suggestedReplies: (analysis.suggestedReplies || []).map((reply: any) => ({
          text: reply.text,
          tone: reply.tone || 'casual',
          length: reply.length || 'short',
          confidence: reply.confidence || 0.8
        })),
        grammarIssues: (analysis.grammarIssues || []).map((issue: any) => ({
          text: issue.text,
          suggestion: issue.suggestion,
          severity: issue.severity || 'info',
          position: issue.position || { start: 0, end: 0 }
        })),
        sentiment: analysis.sentiment || 'neutral',
        priority: analysis.priority || 'medium',
        categories: analysis.categories || ['general'],
        extractedDates: [],
        createdAt: new Date(),
        modelUsed: 'cloud'
      }
    } catch (error) {
      console.error('ReplySage: Failed to parse OpenAI response:', error)
      throw new Error('Failed to parse AI response')
    }
  }

  private parseAnthropicResponse(data: any, originalMessage: EmailMessage): AnalysisResult {
    try {
      const content = data.content[0]?.text
      if (!content) {
        throw new Error('No content in Anthropic response')
      }

      const analysis = JSON.parse(content)
      
      return {
        messageId: originalMessage.id,
        summary: analysis.summary || '',
        actionItems: (analysis.actionItems || []).map((item: any) => ({
          text: item.text,
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
          priority: item.priority || 'medium',
          category: item.category || 'general',
          isCompleted: false
        })),
        suggestedReplies: (analysis.suggestedReplies || []).map((reply: any) => ({
          text: reply.text,
          tone: reply.tone || 'casual',
          length: reply.length || 'short',
          confidence: reply.confidence || 0.8
        })),
        grammarIssues: (analysis.grammarIssues || []).map((issue: any) => ({
          text: issue.text,
          suggestion: issue.suggestion,
          severity: issue.severity || 'info',
          position: issue.position || { start: 0, end: 0 }
        })),
        sentiment: analysis.sentiment || 'neutral',
        priority: analysis.priority || 'medium',
        categories: analysis.categories || ['general'],
        extractedDates: [],
        createdAt: new Date(),
        modelUsed: 'cloud'
      }
    } catch (error) {
      console.error('ReplySage: Failed to parse Anthropic response:', error)
      throw new Error('Failed to parse AI response')
    }
  }

  private calculateOpenAICost(usage: any, model: string): number {
    // OpenAI pricing (per 1K tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
    }
    
    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo']
    const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input
    const outputCost = (usage.completion_tokens / 1000) * modelPricing.output
    
    return inputCost + outputCost
  }

  private calculateAnthropicCost(usage: any, model: string): number {
    // Anthropic pricing (per 1K tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    }
    
    const modelPricing = pricing[model] || pricing['claude-3-haiku']
    const inputCost = (usage.input_tokens / 1000) * modelPricing.input
    const outputCost = (usage.output_tokens / 1000) * modelPricing.output
    
    return inputCost + outputCost
  }

  private calculateAzureCost(usage: any, model: string): number {
    // Azure OpenAI pricing varies by deployment
    // This is a simplified calculation
    return (usage.total_tokens / 1000) * 0.002
  }

  async testProvider(provider: CloudProvider): Promise<boolean> {
    try {
      const testRequest: CloudAnalysisRequest = {
        message: {
          id: 'test',
          subject: 'Test Email',
          from: 'test@example.com',
          to: ['user@example.com'],
          body: 'This is a test email for API validation.',
          attachments: [],
          timestamp: new Date(),
          isRead: false,
          isImportant: false
        },
        redactedMessage: {
          id: 'test',
          subject: 'Test Email',
          from: 'test@example.com',
          to: ['user@example.com'],
          body: 'This is a test email for API validation.',
          attachments: [],
          timestamp: new Date(),
          isRead: false,
          isImportant: false
        },
        analysisType: 'summary',
        userPreferences: {
          tone: 'casual',
          maxSummaryLength: 50,
          preferredLanguage: 'en'
        }
      }

      const response = await this.analyzeWithCloud(testRequest)
      return response.success
    } catch (error) {
      console.error('ReplySage: Provider test failed:', error)
      return false
    }
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  hasProviders(): boolean {
    return this.providers.size > 0
  }
}
