import { SuggestedReply } from '@/types'

export interface ComposeIntegrationResult {
  success: boolean
  method: 'paste' | 'replace' | 'insert' | 'new_tab'
  error?: string
}

export interface ComposeOptions {
  method: 'paste' | 'replace' | 'insert' | 'new_tab'
  targetSelector?: string
  insertPosition?: 'start' | 'end' | 'cursor'
  preserveFormatting?: boolean
}

export class ComposeIntegration {
  private static instance: ComposeIntegration
  private isInitialized = false

  private constructor() {}

  static getInstance(): ComposeIntegration {
    if (!ComposeIntegration.instance) {
      ComposeIntegration.instance = new ComposeIntegration()
    }
    return ComposeIntegration.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    this.isInitialized = true
    console.log('ReplySage: Compose integration initialized')
  }

  async insertReply(reply: SuggestedReply, options: ComposeOptions = { method: 'paste' }): Promise<ComposeIntegrationResult> {
    try {
      await this.initialize()
      
      const method = options.method || 'paste'
      
      switch (method) {
        case 'paste':
          return await this.pasteReply(reply, options)
        case 'replace':
          return await this.replaceContent(reply, options)
        case 'insert':
          return await this.insertContent(reply, options)
        case 'new_tab':
          return await this.openNewCompose(reply, options)
        default:
          throw new Error(`Unknown compose method: ${method}`)
      }
    } catch (error) {
      console.error('ReplySage: Compose integration failed:', error)
      return {
        success: false,
        method: options.method,
        error: (error as Error).message
      }
    }
  }

  private async pasteReply(reply: SuggestedReply, _options: ComposeOptions): Promise<ComposeIntegrationResult> {
    try {
      // Try to find the compose area
      const composeArea = this.findComposeArea()
      if (!composeArea) {
        throw new Error('Compose area not found')
      }

      // Focus the compose area
      composeArea.focus()
      
      // Get current selection
      const selection = window.getSelection()
      const range = selection?.getRangeAt(0)
      
      if (range) {
        // Insert at cursor position
        range.deleteContents()
        range.insertNode(document.createTextNode(reply.text))
        range.collapse(false)
        selection?.removeAllRanges()
        selection?.addRange(range)
      } else {
        // Insert at end of content
        const textNode = document.createTextNode(reply.text)
        composeArea.appendChild(textNode)
        
        // Move cursor to end
        const newRange = document.createRange()
        newRange.selectNodeContents(composeArea)
        newRange.collapse(false)
        selection?.removeAllRanges()
        selection?.addRange(newRange)
      }

      // Trigger input event to notify the email client
      const inputEvent = new Event('input', { bubbles: true })
      composeArea.dispatchEvent(inputEvent)

      return {
        success: true,
        method: 'paste'
      }
    } catch (error) {
      throw new Error(`Paste failed: ${(error as Error).message}`)
    }
  }

  private async replaceContent(reply: SuggestedReply, _options: ComposeOptions): Promise<ComposeIntegrationResult> {
    try {
      const composeArea = this.findComposeArea()
      if (!composeArea) {
        throw new Error('Compose area not found')
      }

      // Replace all content
      composeArea.innerHTML = ''
      composeArea.textContent = reply.text
      
      // Focus and select all
      composeArea.focus()
      const range = document.createRange()
      range.selectNodeContents(composeArea)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)

      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true })
      composeArea.dispatchEvent(inputEvent)

      return {
        success: true,
        method: 'replace'
      }
    } catch (error) {
      throw new Error(`Replace failed: ${(error as Error).message}`)
    }
  }

  private async insertContent(reply: SuggestedReply, options: ComposeOptions): Promise<ComposeIntegrationResult> {
    try {
      const composeArea = this.findComposeArea()
      if (!composeArea) {
        throw new Error('Compose area not found')
      }

      const position = options.insertPosition || 'end'
      const text = reply.text

      if (position === 'start') {
        // Insert at beginning
        composeArea.textContent = text + (composeArea.textContent || '')
      } else if (position === 'end') {
        // Insert at end
        composeArea.textContent = (composeArea.textContent || '') + text
      } else if (position === 'cursor') {
        // Insert at cursor position
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        
        if (range) {
          range.deleteContents()
          range.insertNode(document.createTextNode(text))
          range.collapse(false)
          selection?.removeAllRanges()
          selection?.addRange(range)
        } else {
          composeArea.textContent = (composeArea.textContent || '') + text
        }
      }

      // Focus the compose area
      composeArea.focus()
      
      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true })
      composeArea.dispatchEvent(inputEvent)

      return {
        success: true,
        method: 'insert'
      }
    } catch (error) {
      throw new Error(`Insert failed: ${(error as Error).message}`)
    }
  }

  private async openNewCompose(reply: SuggestedReply, _options: ComposeOptions): Promise<ComposeIntegrationResult> {
    try {
      // Create a new compose window/tab
      const composeUrl = this.getComposeUrl()
      if (!composeUrl) {
        throw new Error('Compose URL not available')
      }

      // Open new tab with compose
      const newTab = await chrome.tabs.create({ url: composeUrl })
      
      // Wait for tab to load and then inject content
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(newTab.id!, {
            type: 'INSERT_REPLY',
            payload: {
              reply: reply.text,
              method: 'replace'
            }
          })
        } catch (error) {
          console.error('ReplySage: Failed to inject reply into new tab:', error)
        }
      }, 2000)

      return {
        success: true,
        method: 'new_tab'
      }
    } catch (error) {
      throw new Error(`New tab failed: ${(error as Error).message}`)
    }
  }

  private findComposeArea(): HTMLElement | null {
    // Gmail compose area selectors
    const gmailSelectors = [
      'div[aria-label="Message Body"]',
      'div[contenteditable="true"][aria-label="Message Body"]',
      'div[contenteditable="true"][data-lexical-editor="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-multiline="true"]'
    ]

    // Outlook compose area selectors
    const outlookSelectors = [
      'div[aria-label="Message body"]',
      'div[contenteditable="true"][aria-label="Message body"]',
      'div[contenteditable="true"][role="textbox"]'
    ]

    // Yahoo Mail compose area selectors
    const yahooSelectors = [
      'div[contenteditable="true"][aria-label="Message body"]',
      'div[contenteditable="true"][role="textbox"]'
    ]

    const allSelectors = [...gmailSelectors, ...outlookSelectors, ...yahooSelectors]

    for (const selector of allSelectors) {
      const element = document.querySelector(selector) as HTMLElement
      if (element && this.isVisible(element)) {
        return element
      }
    }

    // Fallback: look for any contenteditable div
    const contentEditableDivs = document.querySelectorAll('div[contenteditable="true"]')
    for (const div of contentEditableDivs) {
      const element = div as HTMLElement
      if (this.isVisible(element) && this.looksLikeComposeArea(element)) {
        return element
      }
    }

    return null
  }

  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element)
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetWidth > 0 && 
           element.offsetHeight > 0
  }

  private looksLikeComposeArea(element: HTMLElement): boolean {
    // Check if element looks like a compose area
    const text = element.textContent || ''
    const ariaLabel = element.getAttribute('aria-label') || ''
    const role = element.getAttribute('role') || ''
    
    return (
      ariaLabel.toLowerCase().includes('message') ||
      ariaLabel.toLowerCase().includes('body') ||
      role === 'textbox' ||
      text.length < 1000 // Compose areas are usually not too long
    )
  }

  private getComposeUrl(): string | null {
    const hostname = window.location.hostname
    
    if (hostname.includes('gmail.com')) {
      return 'https://mail.google.com/mail/u/0/#compose'
    } else if (hostname.includes('outlook.com')) {
      return 'https://outlook.live.com/mail/0/deeplink/compose'
    } else if (hostname.includes('yahoo.com')) {
      return 'https://mail.yahoo.com/d/compose'
    }
    
    return null
  }

  async detectEmailClient(): Promise<string> {
    const hostname = window.location.hostname
    
    if (hostname.includes('gmail.com')) {
      return 'gmail'
    } else if (hostname.includes('outlook.com')) {
      return 'outlook'
    } else if (hostname.includes('yahoo.com')) {
      return 'yahoo'
    } else if (hostname.includes('icloud.com')) {
      return 'icloud'
    }
    
    return 'unknown'
  }

  async getComposeOptions(): Promise<ComposeOptions[]> {
    const client = await this.detectEmailClient()
    
    const baseOptions: ComposeOptions[] = [
      { method: 'paste', insertPosition: 'cursor' },
      { method: 'insert', insertPosition: 'end' },
      { method: 'replace' }
    ]

    if (client === 'gmail' || client === 'outlook') {
      baseOptions.push({ method: 'new_tab' })
    }

    return baseOptions
  }

  async isComposeAreaAvailable(): Promise<boolean> {
    const composeArea = this.findComposeArea()
    return composeArea !== null
  }

  async getComposeAreaInfo(): Promise<{ available: boolean; client: string; selectors: string[] }> {
    const client = await this.detectEmailClient()
    const available = await this.isComposeAreaAvailable()
    
    let selectors: string[] = []
    if (client === 'gmail') {
      selectors = [
        'div[aria-label="Message Body"]',
        'div[contenteditable="true"][aria-label="Message Body"]'
      ]
    } else if (client === 'outlook') {
      selectors = [
        'div[aria-label="Message body"]',
        'div[contenteditable="true"][aria-label="Message body"]'
      ]
    }

    return {
      available,
      client,
      selectors
    }
  }
}
