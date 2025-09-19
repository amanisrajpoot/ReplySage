import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { EmailMessage, AnalysisResult } from '@/types'
import { HelpModal } from '@/components/HelpModal'

interface ReplySageUIProps {
  message?: EmailMessage
  analysis?: AnalysisResult
}

const ReplySageUI: React.FC<ReplySageUIProps> = ({ message, analysis }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (message) {
      setIsVisible(true)
    }
  }, [message])

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
