import { EmailMessage } from '@/types'

export interface RedactionRule {
  pattern: RegExp
  replacement: string
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'name' | 'custom'
  description: string
}

export interface RedactionResult {
  redactedText: string
  redactedItems: Array<{
    type: string
    original: string
    replacement: string
    position: { start: number; end: number }
  }>
}

export class PIIRedactionManager {
  private static instance: PIIRedactionManager
  private rules: RedactionRule[] = []
  private isInitialized = false

  private constructor() {
    this.initializeRules()
  }

  static getInstance(): PIIRedactionManager {
    if (!PIIRedactionManager.instance) {
      PIIRedactionManager.instance = new PIIRedactionManager()
    }
    return PIIRedactionManager.instance
  }

  private initializeRules(): void {
    this.rules = [
      // Email addresses
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL]',
        type: 'email',
        description: 'Email addresses'
      },
      
      // Phone numbers (various formats)
      {
        pattern: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
        replacement: '[PHONE]',
        type: 'phone',
        description: 'Phone numbers'
      },
      
      // SSN (XXX-XX-XXXX format)
      {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[SSN]',
        type: 'ssn',
        description: 'Social Security Numbers'
      },
      
      // Credit card numbers (various formats)
      {
        pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        replacement: '[CREDIT_CARD]',
        type: 'credit_card',
        description: 'Credit card numbers'
      },
      
      // IP addresses
      {
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        replacement: '[IP_ADDRESS]',
        type: 'custom',
        description: 'IP addresses'
      },
      
      // URLs
      {
        pattern: /https?:\/\/[^\s]+/g,
        replacement: '[URL]',
        type: 'custom',
        description: 'URLs'
      },
      
      // Common name patterns (first name + last name)
      {
        pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
        replacement: '[NAME]',
        type: 'name',
        description: 'Full names'
      },
      
      // Address patterns (street numbers + street names)
      {
        pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Place|Pl)\b/gi,
        replacement: '[ADDRESS]',
        type: 'address',
        description: 'Street addresses'
      },
      
      // ZIP codes
      {
        pattern: /\b\d{5}(?:-\d{4})?\b/g,
        replacement: '[ZIP_CODE]',
        type: 'custom',
        description: 'ZIP codes'
      },
      
      // Dates (MM/DD/YYYY format)
      {
        pattern: /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-]\d{4}\b/g,
        replacement: '[DATE]',
        type: 'custom',
        description: 'Dates'
      },
      
      // Bank account numbers (simplified pattern)
      {
        pattern: /\b\d{8,17}\b/g,
        replacement: '[ACCOUNT_NUMBER]',
        type: 'custom',
        description: 'Account numbers'
      }
    ]
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    // Load custom rules from storage if any
    try {
      const customRules = await this.loadCustomRules()
      this.rules.push(...customRules)
    } catch (error) {
      console.error('ReplySage: Failed to load custom redaction rules:', error)
    }
    
    this.isInitialized = true
    console.log('ReplySage: PII redaction manager initialized')
  }

  redactEmail(message: EmailMessage): { redactedMessage: EmailMessage; redactionResult: RedactionResult } {
    const redactedMessage = { ...message }
    const redactedItems: RedactionResult['redactedItems'] = []
    
    // Redact subject
    const subjectResult = this.redactText(message.subject)
    redactedMessage.subject = subjectResult.redactedText
    redactedItems.push(...subjectResult.redactedItems.map(item => ({
      ...item,
      field: 'subject'
    })))
    
    // Redact body
    const bodyResult = this.redactText(message.body)
    redactedMessage.body = bodyResult.redactedText
    redactedItems.push(...bodyResult.redactedItems.map(item => ({
      ...item,
      field: 'body'
    })))
    
    // Redact from field (but keep domain for context)
    const fromResult = this.redactEmailAddress(message.from)
    redactedMessage.from = fromResult.redactedText
    redactedItems.push(...fromResult.redactedItems.map(item => ({
      ...item,
      field: 'from'
    })))
    
    // Redact to fields
    redactedMessage.to = message.to.map(email => {
      const result = this.redactEmailAddress(email)
      redactedItems.push(...result.redactedItems.map(item => ({
        ...item,
        field: 'to'
      })))
      return result.redactedText
    })
    
    // Redact CC fields if present
    if (redactedMessage.cc) {
      redactedMessage.cc = redactedMessage.cc.map(email => {
        const result = this.redactEmailAddress(email)
        redactedItems.push(...result.redactedItems.map(item => ({
          ...item,
          field: 'cc'
        })))
        return result.redactedText
      })
    }
    
    // Redact BCC fields if present
    if (redactedMessage.bcc) {
      redactedMessage.bcc = redactedMessage.bcc.map(email => {
        const result = this.redactEmailAddress(email)
        redactedItems.push(...result.redactedItems.map(item => ({
          ...item,
          field: 'bcc'
        })))
        return result.redactedText
      })
    }

    return {
      redactedMessage,
      redactionResult: {
        redactedText: redactedMessage.body,
        redactedItems
      }
    }
  }

  private redactText(text: string): RedactionResult {
    let redactedText = text
    const redactedItems: RedactionResult['redactedItems'] = []
    
    this.rules.forEach(rule => {
      const matches = text.matchAll(rule.pattern)
      let offset = 0
      
      for (const match of matches) {
        const original = match[0]
        const start = match.index! + offset
        const end = start + original.length
        
        // Skip if already redacted
        if (redactedText.substring(start, end).startsWith('[')) {
          continue
        }
        
        redactedText = redactedText.substring(0, start) + rule.replacement + redactedText.substring(end)
        
        // Adjust offset for future matches
        offset += rule.replacement.length - original.length
        
        redactedItems.push({
          type: rule.type,
          original,
          replacement: rule.replacement,
          position: { start, end }
        })
      }
    })
    
    return {
      redactedText,
      redactedItems
    }
  }

  private redactEmailAddress(email: string): RedactionResult {
    // For email addresses, we might want to keep the domain for context
    // but redact the username part
    const atIndex = email.indexOf('@')
    if (atIndex > 0) {
      const username = email.substring(0, atIndex)
      const domain = email.substring(atIndex)
      
      // Only redact if the username looks like a real name or contains PII
      if (this.containsPII(username)) {
        return {
          redactedText: '[USERNAME]' + domain,
          redactedItems: [{
            type: 'email',
            original: username,
            replacement: '[USERNAME]',
            position: { start: 0, end: username.length }
          }]
        }
      }
    }
    
    return {
      redactedText: email,
      redactedItems: []
    }
  }

  private containsPII(text: string): boolean {
    // Check if text contains patterns that suggest PII
    const piiPatterns = [
      /\d{3,}/, // Contains 3+ consecutive digits
      /[A-Z][a-z]+/, // Contains capitalized words (potential names)
      /[._-]/, // Contains separators common in usernames
    ]
    
    return piiPatterns.some(pattern => pattern.test(text))
  }

  addCustomRule(rule: Omit<RedactionRule, 'type'> & { type?: string }): void {
    const customRule: RedactionRule = {
      ...rule,
      type: rule.type as any || 'custom'
    }
    
    this.rules.push(customRule)
    this.saveCustomRules()
  }

  removeCustomRule(index: number): void {
    if (index >= 0 && index < this.rules.length) {
      this.rules.splice(index, 1)
      this.saveCustomRules()
    }
  }

  getRules(): RedactionRule[] {
    return [...this.rules]
  }

  private async loadCustomRules(): Promise<RedactionRule[]> {
    try {
      const result = await chrome.storage.local.get(['pii_redaction_rules'])
      return result.pii_redaction_rules || []
    } catch (error) {
      console.error('ReplySage: Failed to load custom rules:', error)
      return []
    }
  }

  private async saveCustomRules(): Promise<void> {
    try {
      const customRules = this.rules.filter(rule => rule.type === 'custom')
      await chrome.storage.local.set({ pii_redaction_rules: customRules })
    } catch (error) {
      console.error('ReplySage: Failed to save custom rules:', error)
    }
  }

  async testRedaction(text: string): Promise<RedactionResult> {
    await this.initialize()
    return this.redactText(text)
  }

  getRedactionSummary(redactionResult: RedactionResult): string {
    const typeCounts = redactionResult.redactedItems.reduce((counts, item) => {
      counts[item.type] = (counts[item.type] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    const summary = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ')
    
    return summary || 'No PII detected'
  }
}
