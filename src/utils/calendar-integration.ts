import { ActionItem, ExtractedDate } from '@/types'

export interface CalendarEvent {
  title: string
  description: string
  startDate: Date
  endDate: Date
  location?: string
  attendees?: string[]
  isAllDay: boolean
  reminderMinutes?: number[]
}

export interface CalendarIntegrationResult {
  success: boolean
  eventId?: string
  calendarUrl?: string
  error?: string
}

export class CalendarIntegration {
  private static instance: CalendarIntegration
  private isInitialized = false

  private constructor() {}

  static getInstance(): CalendarIntegration {
    if (!CalendarIntegration.instance) {
      CalendarIntegration.instance = new CalendarIntegration()
    }
    return CalendarIntegration.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    this.isInitialized = true
    console.log('ReplySage: Calendar integration initialized')
  }

  async createEventFromAction(action: ActionItem, context?: string): Promise<CalendarIntegrationResult> {
    try {
      await this.initialize()
      
      if (!action.dueDate) {
        return {
          success: false,
          error: 'No due date specified for this action'
        }
      }

      const event = this.createCalendarEvent(action, context)
      
      // Try different calendar providers
      const providers = ['google', 'outlook', 'apple', 'ics']
      
      for (const provider of providers) {
        try {
          const result = await this.createEventWithProvider(provider, event)
          if (result.success) {
            return result
          }
        } catch (error) {
          console.log(`ReplySage: ${provider} calendar failed:`, error)
          continue
        }
      }
      
      return {
        success: false,
        error: 'No calendar provider available'
      }
    } catch (error) {
      console.error('ReplySage: Calendar event creation failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async createEventFromDate(date: ExtractedDate, title: string, description?: string): Promise<CalendarIntegrationResult> {
    try {
      await this.initialize()
      
      const event: CalendarEvent = {
        title,
        description: description || `Event: ${date.text}`,
        startDate: date.date,
        endDate: new Date(date.date.getTime() + 60 * 60 * 1000), // 1 hour duration
        isAllDay: false,
        reminderMinutes: [15, 60] // 15 minutes and 1 hour before
      }
      
      // Try different calendar providers
      const providers = ['google', 'outlook', 'apple', 'ics']
      
      for (const provider of providers) {
        try {
          const result = await this.createEventWithProvider(provider, event)
          if (result.success) {
            return result
          }
        } catch (error) {
          console.log(`ReplySage: ${provider} calendar failed:`, error)
          continue
        }
      }
      
      return {
        success: false,
        error: 'No calendar provider available'
      }
    } catch (error) {
      console.error('ReplySage: Calendar event creation failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private createCalendarEvent(action: ActionItem, context?: string): CalendarEvent {
    const startDate = action.dueDate!
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000) // 30 minutes duration
    
    return {
      title: action.text,
      description: context ? `${context}\n\nCategory: ${action.category}\nPriority: ${action.priority}` : `Category: ${action.category}\nPriority: ${action.priority}`,
      startDate,
      endDate,
      isAllDay: false,
      reminderMinutes: this.getReminderMinutes(action.priority)
    }
  }

  private getReminderMinutes(priority: 'high' | 'medium' | 'low'): number[] {
    switch (priority) {
      case 'high':
        return [5, 15, 60] // 5 min, 15 min, 1 hour
      case 'medium':
        return [15, 60] // 15 min, 1 hour
      case 'low':
        return [60] // 1 hour
      default:
        return [15, 60]
    }
  }

  private async createEventWithProvider(provider: string, event: CalendarEvent): Promise<CalendarIntegrationResult> {
    switch (provider) {
      case 'google':
        return await this.createGoogleCalendarEvent(event)
      case 'outlook':
        return await this.createOutlookCalendarEvent(event)
      case 'apple':
        return await this.createAppleCalendarEvent(event)
      case 'ics':
        return await this.createICSEvent(event)
      default:
        throw new Error(`Unknown calendar provider: ${provider}`)
    }
  }

  private async createGoogleCalendarEvent(event: CalendarEvent): Promise<CalendarIntegrationResult> {
    try {
      // Create Google Calendar URL
      const startTime = event.startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const endTime = event.endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${startTime}/${endTime}`,
        details: event.description,
        location: event.location || '',
        trp: 'false'
      })
      
      const calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`
      
      // Try to open in new tab
      try {
        await chrome.tabs.create({ url: calendarUrl })
        return {
          success: true,
          calendarUrl
        }
      } catch (error) {
        // Fallback to returning URL
        return {
          success: true,
          calendarUrl
        }
      }
    } catch (error) {
      throw new Error(`Google Calendar integration failed: ${error.message}`)
    }
  }

  private async createOutlookCalendarEvent(event: CalendarEvent): Promise<CalendarIntegrationResult> {
    try {
      // Create Outlook Calendar URL
      const startTime = event.startDate.toISOString()
      const endTime = event.endDate.toISOString()
      
      const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: event.title,
        startdt: startTime,
        enddt: endTime,
        body: event.description,
        location: event.location || ''
      })
      
      const calendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
      
      // Try to open in new tab
      try {
        await chrome.tabs.create({ url: calendarUrl })
        return {
          success: true,
          calendarUrl
        }
      } catch (error) {
        // Fallback to returning URL
        return {
          success: true,
          calendarUrl
        }
      }
    } catch (error) {
      throw new Error(`Outlook Calendar integration failed: ${error.message}`)
    }
  }

  private async createAppleCalendarEvent(event: CalendarEvent): Promise<CalendarIntegrationResult> {
    try {
      // Create Apple Calendar URL (web version)
      const startTime = event.startDate.toISOString()
      const endTime = event.endDate.toISOString()
      
      const params = new URLSearchParams({
        title: event.title,
        start: startTime,
        end: endTime,
        description: event.description,
        location: event.location || ''
      })
      
      const calendarUrl = `https://calendar.apple.com/event?${params.toString()}`
      
      // Try to open in new tab
      try {
        await chrome.tabs.create({ url: calendarUrl })
        return {
          success: true,
          calendarUrl
        }
      } catch (error) {
        // Fallback to returning URL
        return {
          success: true,
          calendarUrl
        }
      }
    } catch (error) {
      throw new Error(`Apple Calendar integration failed: ${error.message}`)
    }
  }

  private async createICSEvent(event: CalendarEvent): Promise<CalendarIntegrationResult> {
    try {
      // Generate ICS file content
      const icsContent = this.generateICSContent(event)
      
      // Create blob and download
      const blob = new Blob([icsContent], { type: 'text/calendar' })
      const url = URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      URL.revokeObjectURL(url)
      
      return {
        success: true,
        eventId: 'ics-download'
      }
    } catch (error) {
      throw new Error(`ICS generation failed: ${error.message}`)
    }
  }

  private generateICSContent(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
    
    const escapeText = (text: string): string => {
      return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n')
    }
    
    const uid = `replysage-${Date.now()}@replysage.com`
    const now = new Date()
    
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ReplySage//ReplySage Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatDate(now)}`,
      `DTSTART:${formatDate(event.startDate)}`,
      `DTEND:${formatDate(event.endDate)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      event.location ? `LOCATION:${escapeText(event.location)}` : '',
      event.reminderMinutes ? this.generateReminderAlarms(event.reminderMinutes) : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line).join('\r\n')
  }

  private generateReminderAlarms(reminderMinutes: number[]): string {
    return reminderMinutes.map(minutes => [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${minutes}M`,
      'DESCRIPTION:Reminder',
      'END:VALARM'
    ].join('\r\n')).join('\r\n')
  }

  async getCalendarProviders(): Promise<string[]> {
    // Check which calendar providers are available
    const providers: string[] = []
    
    // Google Calendar (always available via URL)
    providers.push('google')
    
    // Outlook Calendar (always available via URL)
    providers.push('outlook')
    
    // Apple Calendar (always available via URL)
    providers.push('apple')
    
    // ICS download (always available)
    providers.push('ics')
    
    return providers
  }

  async getPreferredCalendarProvider(): Promise<string> {
    try {
      const stored = await chrome.storage.local.get(['preferred_calendar_provider'])
      return stored.preferred_calendar_provider || 'google'
    } catch (error) {
      console.error('ReplySage: Failed to get preferred calendar provider:', error)
      return 'google'
    }
  }

  async setPreferredCalendarProvider(provider: string): Promise<void> {
    try {
      await chrome.storage.local.set({ preferred_calendar_provider: provider })
    } catch (error) {
      console.error('ReplySage: Failed to set preferred calendar provider:', error)
    }
  }

  async createBulkEvents(actions: ActionItem[], context?: string): Promise<CalendarIntegrationResult[]> {
    const results: CalendarIntegrationResult[] = []
    
    for (const action of actions) {
      if (action.dueDate) {
        const result = await this.createEventFromAction(action, context)
        results.push(result)
      }
    }
    
    return results
  }

  async createMeetingEvent(
    title: string,
    startDate: Date,
    endDate: Date,
    attendees: string[],
    location?: string,
    description?: string
  ): Promise<CalendarIntegrationResult> {
    const event: CalendarEvent = {
      title,
      description: description || 'Meeting scheduled by ReplySage',
      startDate,
      endDate,
      location,
      attendees,
      isAllDay: false,
      reminderMinutes: [15, 60]
    }
    
    return await this.createEventWithProvider(await this.getPreferredCalendarProvider(), event)
  }
}
