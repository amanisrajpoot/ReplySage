import { EmailMessage } from '@/types'

export class GmailExtractor {
  private static readonly SELECTORS = {
    subject: '[data-thread-perm-id] h2, [data-thread-perm-id] .bog',
    from: '.yW span[email], .yW .yP',
    to: '.yW .y2',
    body: '.ii .a3s, .ii .a3s.aiL',
    attachments: '.aZo .aZo .aZo',
    timestamp: '.xW .xY .xS',
    threadId: '[data-thread-perm-id]',
    messageId: '[data-legacy-thread-id]'
  }

  static extractMessage(): EmailMessage | null {
    try {
      const subject = this.extractSubject()
      const from = this.extractFrom()
      const body = this.extractBody()
      
      if (!subject || !from || !body) {
        console.warn('ReplySage: Failed to extract required message fields')
        return null
      }

      return {
        id: this.generateMessageId(),
        subject,
        from,
        to: this.extractTo(),
        cc: this.extractCc(),
        bcc: this.extractBcc(),
        body,
        htmlBody: this.extractHtmlBody(),
        attachments: this.extractAttachments(),
        timestamp: this.extractTimestamp(),
        threadId: this.extractThreadId(),
        isRead: this.isMessageRead(),
        isImportant: this.isMessageImportant(),
        labels: this.extractLabels()
      }
    } catch (error) {
      console.error('ReplySage: Error extracting message:', error)
      return null
    }
  }

  private static extractSubject(): string | null {
    const subjectElement = document.querySelector(this.SELECTORS.subject)
    return subjectElement?.textContent?.trim() || null
  }

  private static extractFrom(): string | null {
    const fromElement = document.querySelector(this.SELECTORS.from)
    return fromElement?.textContent?.trim() || null
  }

  private static extractTo(): string[] {
    const toElements = document.querySelectorAll(this.SELECTORS.to)
    return Array.from(toElements).map(el => el.textContent?.trim()).filter(Boolean) as string[]
  }

  private static extractCc(): string[] {
    // Gmail doesn't always show CC in the UI, this is a fallback
    const ccElements = document.querySelectorAll('.yW .y2 + .y2')
    return Array.from(ccElements).map(el => el.textContent?.trim()).filter(Boolean) as string[]
  }

  private static extractBcc(): string[] {
    // BCC is typically not visible in Gmail UI
    return []
  }

  private static extractBody(): string | null {
    const bodyElement = document.querySelector(this.SELECTORS.body)
    if (!bodyElement) return null

    // Clean up the body text
    const clonedElement = bodyElement.cloneNode(true) as HTMLElement
    
    // Remove quoted text (replies)
    const quotedElements = clonedElement.querySelectorAll('.gmail_quote, .gmail_signature')
    quotedElements.forEach(el => el.remove())
    
    // Remove signature
    const signatureElements = clonedElement.querySelectorAll('[data-smartmail="gmail_signature"]')
    signatureElements.forEach(el => el.remove())
    
    return clonedElement.textContent?.trim() || null
  }

  private static extractHtmlBody(): string | null {
    const bodyElement = document.querySelector(this.SELECTORS.body)
    return bodyElement?.innerHTML || null
  }

  private static extractAttachments(): any[] {
    const attachmentElements = document.querySelectorAll(this.SELECTORS.attachments)
    return Array.from(attachmentElements).map(el => {
      const name = el.getAttribute('aria-label') || el.textContent?.trim() || 'Unknown'
      const size = this.extractAttachmentSize(el)
      const type = this.extractAttachmentType(name)
      
      return {
        name,
        size,
        type,
        url: el.getAttribute('href') || undefined
      }
    })
  }

  private static extractAttachmentSize(element: Element): number {
    // Try to extract size from aria-label or title
    const label = element.getAttribute('aria-label') || element.getAttribute('title') || ''
    const sizeMatch = label.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i)
    if (sizeMatch) {
      const value = parseFloat(sizeMatch[1])
      const unit = sizeMatch[2].toUpperCase()
      const multipliers = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }
      return value * (multipliers[unit as keyof typeof multipliers] || 1)
    }
    return 0
  }

  private static extractAttachmentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || ''
    const typeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed'
    }
    return typeMap[extension] || 'application/octet-stream'
  }

  private static extractTimestamp(): Date {
    const timestampElement = document.querySelector(this.SELECTORS.timestamp)
    const timestampText = timestampElement?.textContent?.trim()
    
    if (timestampText) {
      // Try to parse Gmail's timestamp format
      const now = new Date()
      const timeMatch = timestampText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      
      if (timeMatch) {
        let hours = parseInt(timeMatch[1])
        const minutes = parseInt(timeMatch[2])
        const ampm = timeMatch[3]?.toUpperCase()
        
        if (ampm === 'PM' && hours !== 12) hours += 12
        if (ampm === 'AM' && hours === 12) hours = 0
        
        const date = new Date(now)
        date.setHours(hours, minutes, 0, 0)
        return date
      }
      
      // Handle relative dates like "2 hours ago", "Yesterday"
      if (timestampText.includes('ago')) {
        const hoursAgo = parseInt(timestampText.match(/(\d+)\s*hour/i)?.[1] || '0')
        return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
      }
      
      if (timestampText.includes('Yesterday')) {
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }
    }
    
    return new Date()
  }

  private static extractThreadId(): string | null {
    const threadElement = document.querySelector(this.SELECTORS.threadId)
    return threadElement?.getAttribute('data-thread-perm-id') || null
  }

  private static generateMessageId(): string {
    // Generate a unique ID based on current URL and timestamp
    const url = window.location.href
    const timestamp = Date.now()
    return btoa(`${url}-${timestamp}`).replace(/[^a-zA-Z0-9]/g, '')
  }

  private static isMessageRead(): boolean {
    // Check if message is marked as read (no unread indicators)
    const unreadIndicators = document.querySelectorAll('.unread, .unread-indicator')
    return unreadIndicators.length === 0
  }

  private static isMessageImportant(): boolean {
    // Check if message is marked as important
    const importantIndicators = document.querySelectorAll('.important, .star, .starred')
    return importantIndicators.length > 0
  }

  private static extractLabels(): string[] {
    const labelElements = document.querySelectorAll('.yW .y2 .yP')
    return Array.from(labelElements).map(el => el.textContent?.trim()).filter(Boolean) as string[]
  }

  static isGmailPage(): boolean {
    return window.location.hostname === 'mail.google.com'
  }

  static isOutlookPage(): boolean {
    return window.location.hostname.includes('outlook.')
  }

  static getCurrentProvider(): 'gmail' | 'outlook' | 'unknown' {
    if (this.isGmailPage()) return 'gmail'
    if (this.isOutlookPage()) return 'outlook'
    return 'unknown'
  }
}
