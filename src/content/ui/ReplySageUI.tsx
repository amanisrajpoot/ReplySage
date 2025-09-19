import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { EmailMessage, AnalysisResult, ActionItem, ExtractedDate, SuggestedReply, SearchQuery, SimilarityResult } from '@/types'
import { HelpModal } from '@/components/HelpModal'
import { ActionItemsPanel } from '@/components/ActionItemsPanel'
import { SuggestedRepliesPanel } from '@/components/SuggestedRepliesPanel'
import { SemanticSearchPanel } from '@/components/SemanticSearchPanel'

interface ReplySageUIProps {
  message?: EmailMessage
  analysis?: AnalysisResult
}

const ReplySageUI: React.FC<ReplySageUIProps> = ({ message, analysis }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [extractedDates, setExtractedDates] = useState<ExtractedDate[]>([])
  const [suggestedReplies, setSuggestedReplies] = useState<SuggestedReply[]>([])
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (message) {
      setIsVisible(true)
    }
  }, [message])

  useEffect(() => {
    if (analysis) {
      console.log('ReplySage: Analysis received:', analysis)
      setActionItems(analysis.actionItems || [])
      setExtractedDates(analysis.extractedDates || [])
      setSuggestedReplies(analysis.suggestedReplies || [])
      
      // Generate embedding for semantic search
      if (message) {
        const text = `${message.subject} ${message.body}`.trim()
        if (text) {
          handleGenerateEmbedding(message, text, 'analyzed', 'medium')
        }
      }
    }
  }, [analysis, message])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      // Send message to background script for analysis
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_MESSAGE',
        payload: message
      })
      
      if (response && response.success) {
        // Analysis completed, UI will be updated via props
        console.log('ReplySage: Analysis completed')
      }
    } catch (error) {
      console.error('ReplySage: Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  const handleActionComplete = (actionId: string) => {
    setActionItems(prev => 
      prev.map(action => 
        action.text === actionId 
          ? { ...action, isCompleted: !action.isCompleted }
          : action
      )
    )
  }

  const handleActionEdit = (actionId: string, updatedAction: ActionItem) => {
    setActionItems(prev => 
      prev.map(action => 
        action.text === actionId ? updatedAction : action
      )
    )
  }

  const handleActionDelete = (actionId: string) => {
    setActionItems(prev => prev.filter(action => action.text !== actionId))
  }

  const handleAddToCalendar = async (action: ActionItem) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_CALENDAR_EVENT',
        payload: {
          action,
          title: action.text,
          description: `Action item: ${action.text}\nCategory: ${action.category}\nPriority: ${action.priority}`
        }
      })
      
      if (response.success) {
        console.log('ReplySage: Calendar event created successfully')
      } else {
        console.error('ReplySage: Failed to create calendar event:', response.error)
      }
    } catch (error) {
      console.error('ReplySage: Calendar event creation failed:', error)
    }
  }

  const handleAddDateToCalendar = async (date: ExtractedDate) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_CALENDAR_EVENT',
        payload: {
          date,
          title: `Important Date: ${date.text}`,
          description: `Date: ${date.text}\nType: ${date.type}`
        }
      })
      
      if (response.success) {
        console.log('ReplySage: Calendar event created successfully')
      } else {
        console.error('ReplySage: Failed to create calendar event:', response.error)
      }
    } catch (error) {
      console.error('ReplySage: Calendar event creation failed:', error)
    }
  }

  const handleGenerateReplies = async (replyType: string, tone: string, length: string) => {
    if (!message) return
    
    setIsGeneratingReplies(true)
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_REPLIES',
        payload: {
          message,
          replyType,
          tone,
          length
        }
      })
      
      if (response.success && response.result) {
        setSuggestedReplies(response.result.replies || [])
        console.log('ReplySage: Replies generated successfully')
      } else {
        console.error('ReplySage: Failed to generate replies:', response.error)
      }
    } catch (error) {
      console.error('ReplySage: Reply generation failed:', error)
    } finally {
      setIsGeneratingReplies(false)
    }
  }

  const handleReplySelect = (reply: SuggestedReply) => {
    // Handle reply selection (could be used for tracking, etc.)
    console.log('ReplySage: Reply selected:', reply)
  }

  const handleSemanticSearch = async (query: SearchQuery): Promise<SimilarityResult[]> => {
    setIsSearching(true)
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_SIMILAR',
        payload: query
      })
      
      if (response.success && response.result) {
        console.log('ReplySage: Semantic search completed')
        return response.result.results || []
      } else {
        console.error('ReplySage: Semantic search failed:', response.error)
        return []
      }
    } catch (error) {
      console.error('ReplySage: Semantic search error:', error)
      return []
    } finally {
      setIsSearching(false)
    }
  }

  const handleMessageSelect = (messageId: string) => {
    // Handle message selection (could scroll to message, open in new tab, etc.)
    console.log('ReplySage: Message selected:', messageId)
    // For now, just log the selection
    // In a real implementation, this could navigate to the message
  }

  const handleGenerateEmbedding = async (message: EmailMessage, text: string, category?: string, priority?: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_EMBEDDING',
        payload: {
          message,
          text,
          category,
          priority
        }
      })
      
      if (response.success) {
        console.log('ReplySage: Embedding generated successfully')
      } else {
        console.error('ReplySage: Failed to generate embedding:', response.error)
      }
    } catch (error) {
      console.error('ReplySage: Embedding generation failed:', error)
    }
  }

  if (!isVisible) return null

  return (
    <div className="replysage-sidebar">
      <div className="replysage-header">
        <h3>ReplySage</h3>
        <div className="header-actions">
          <button onClick={() => setShowHelp(true)} className="help-button" title="Help">
            ?
          </button>
          <button onClick={handleClose} className="replysage-close">×</button>
        </div>
      </div>
      
      <div className="replysage-content">
        {message && (
          <div className="replysage-message-info">
            <h4>{message.subject}</h4>
            <p><strong>From:</strong> {message.from}</p>
            <p><strong>To:</strong> {message.to.join(', ')}</p>
            {message.attachments.length > 0 && (
              <p><strong>Attachments:</strong> {message.attachments.length}</p>
            )}
          </div>
        )}

        <div className="replysage-actions">
          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className="replysage-analyze-btn"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Email'}
          </button>
        </div>

        {analysis && (
          <div className="replysage-results">
            <div className="replysage-summary">
              <h4>Summary</h4>
              <p>{analysis.summary}</p>
            </div>

            {analysis.actionItems.length > 0 && (
              <div className="replysage-action-items">
                <h4>Action Items</h4>
                <ul>
                  {analysis.actionItems.map((item, index) => (
                    <li key={index} className={`priority-${item.priority}`}>
                      {item.text}
                      {item.dueDate && (
                        <span className="due-date">
                          Due: {item.dueDate.toLocaleDateString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.suggestedReplies.length > 0 && (
              <div className="replysage-suggested-replies">
                <h4>Suggested Replies</h4>
                {analysis.suggestedReplies.map((reply, index) => (
                  <div key={index} className="reply-option">
                    <div className="reply-header">
                      <span className="tone">{reply.tone}</span>
                      <span className="length">{reply.length}</span>
                    </div>
                    <p>{reply.text}</p>
                    <button className="use-reply-btn">Use This Reply</button>
                  </div>
                ))}
              </div>
            )}

            {analysis.grammarIssues.length > 0 && (
              <div className="replysage-grammar">
                <h4>Grammar Suggestions</h4>
                <ul>
                  {analysis.grammarIssues.map((issue, index) => (
                    <li key={index} className={`severity-${issue.severity}`}>
                      <strong>{issue.text}</strong> → {issue.suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Items Panel */}
        {(actionItems.length > 0 || extractedDates.length > 0) && (
          <ActionItemsPanel
            actionItems={actionItems}
            extractedDates={extractedDates}
            onActionComplete={handleActionComplete}
            onActionEdit={handleActionEdit}
            onActionDelete={handleActionDelete}
            onAddToCalendar={handleAddToCalendar}
            onAddDateToCalendar={handleAddDateToCalendar}
          />
        )}

        {/* Suggested Replies Panel */}
        {message && (
          <SuggestedRepliesPanel
            originalMessage={message}
            suggestedReplies={suggestedReplies}
            onReplySelect={handleReplySelect}
            onGenerateReplies={handleGenerateReplies}
            isGenerating={isGeneratingReplies}
          />
        )}

        {/* Semantic Search Panel */}
        <SemanticSearchPanel
          onSearch={handleSemanticSearch}
          onMessageSelect={handleMessageSelect}
          isSearching={isSearching}
        />
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}

export class ReplySageUI {
  private container: HTMLElement | null = null
  private root: any = null
  private currentMessage: EmailMessage | null = null
  private currentAnalysis: AnalysisResult | null = null

  constructor() {
    this.createContainer()
  }

  private createContainer() {
    // Create sidebar container
    this.container = document.createElement('div')
    this.container.id = 'replysage-sidebar'
    this.container.className = 'replysage-sidebar'
    
    // Add to Gmail's main content area
    const gmailContent = document.querySelector('[role="main"]') || document.body
    gmailContent.appendChild(this.container)
    
    // Initialize React root
    this.root = createRoot(this.container)
  }

  public render() {
    if (!this.container || !this.root) return

    this.root.render(
      <ReplySageUI 
        message={this.currentMessage} 
        analysis={this.currentAnalysis} 
      />
    )
  }

  public updateMessage(message: EmailMessage) {
    this.currentMessage = message
    this.render()
  }

  public updateAnalysis(analysis: AnalysisResult) {
    this.currentAnalysis = analysis
    this.render()
  }

  public destroy() {
    if (this.root) {
      this.root.unmount()
    }
    if (this.container) {
      this.container.remove()
    }
  }
}
