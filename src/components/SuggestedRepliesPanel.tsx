import React, { useState, useEffect } from 'react'
import { SuggestedReply, EmailMessage } from '@/types'

interface SuggestedRepliesPanelProps {
  originalMessage: EmailMessage
  suggestedReplies: SuggestedReply[]
  onReplySelect: (reply: SuggestedReply) => void
  onGenerateReplies: (type: string, tone: string, length: string) => void
  isGenerating: boolean
}

export const SuggestedRepliesPanel: React.FC<SuggestedRepliesPanelProps> = ({
  originalMessage,
  suggestedReplies,
  onReplySelect,
  onGenerateReplies,
  isGenerating
}) => {
  const [replyType, setReplyType] = useState<'acknowledgment' | 'question' | 'decline' | 'accept' | 'follow_up' | 'custom'>('acknowledgment')
  const [tone, setTone] = useState<'formal' | 'casual' | 'friendly' | 'professional' | 'concise'>('professional')
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [customPrompt, setCustomPrompt] = useState('')
  const [selectedReply, setSelectedReply] = useState<string | null>(null)
  const [composeMethod, setComposeMethod] = useState<'paste' | 'replace' | 'insert' | 'new_tab'>('paste')
  const [composeOptions, setComposeOptions] = useState<any[]>([])

  useEffect(() => {
    // Load compose options
    loadComposeOptions()
  }, [])

  const loadComposeOptions = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_COMPOSE_OPTIONS'
      })
      
      if (response.success) {
        setComposeOptions(response.options)
      }
    } catch (error) {
      console.error('ReplySage: Failed to load compose options:', error)
    }
  }

  const handleGenerateReplies = () => {
    onGenerateReplies(replyType, tone, length)
  }

  const handleReplySelect = (reply: SuggestedReply) => {
    setSelectedReply(reply.text)
    onReplySelect(reply)
  }

  const handleInsertReply = async (reply: SuggestedReply) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'INSERT_REPLY',
        payload: {
          reply: reply.text,
          method: composeMethod
        }
      })
      
      if (response.success) {
        console.log('ReplySage: Reply inserted successfully')
      } else {
        console.error('ReplySage: Failed to insert reply:', response.error)
      }
    } catch (error) {
      console.error('ReplySage: Reply insertion failed:', error)
    }
  }

  const getToneIcon = (tone: string): string => {
    switch (tone) {
      case 'formal': return '🎩'
      case 'casual': return '😊'
      case 'friendly': return '👋'
      case 'professional': return '💼'
      case 'concise': return '⚡'
      default: return '📝'
    }
  }

  const getLengthIcon = (length: string): string => {
    switch (length) {
      case 'short': return '📏'
      case 'medium': return '📐'
      case 'long': return '📊'
      default: return '📝'
    }
  }

  const getReplyTypeIcon = (type: string): string => {
    switch (type) {
      case 'acknowledgment': return '✅'
      case 'question': return '❓'
      case 'decline': return '❌'
      case 'accept': return '👍'
      case 'follow_up': return '🔄'
      case 'custom': return '✏️'
      default: return '📝'
    }
  }

  const getComposeMethodIcon = (method: string): string => {
    switch (method) {
      case 'paste': return '📋'
      case 'replace': return '🔄'
      case 'insert': return '➕'
      case 'new_tab': return '🆕'
      default: return '📝'
    }
  }

  return (
    <div className="suggested-replies-panel">
      <div className="panel-header">
        <h3>Suggested Replies</h3>
        <div className="panel-controls">
          <button
            onClick={handleGenerateReplies}
            disabled={isGenerating}
            className="generate-button"
          >
            {isGenerating ? '⏳ Generating...' : '🔄 Generate'}
          </button>
        </div>
      </div>

      <div className="reply-controls">
        <div className="control-group">
          <label>Reply Type</label>
          <select
            value={replyType}
            onChange={(e) => setReplyType(e.target.value as any)}
            className="control-select"
          >
            <option value="acknowledgment">✅ Acknowledgment</option>
            <option value="question">❓ Question</option>
            <option value="decline">❌ Decline</option>
            <option value="accept">👍 Accept</option>
            <option value="follow_up">🔄 Follow-up</option>
            <option value="custom">✏️ Custom</option>
          </select>
        </div>

        <div className="control-group">
          <label>Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as any)}
            className="control-select"
          >
            <option value="formal">🎩 Formal</option>
            <option value="casual">😊 Casual</option>
            <option value="friendly">👋 Friendly</option>
            <option value="professional">💼 Professional</option>
            <option value="concise">⚡ Concise</option>
          </select>
        </div>

        <div className="control-group">
          <label>Length</label>
          <select
            value={length}
            onChange={(e) => setLength(e.target.value as any)}
            className="control-select"
          >
            <option value="short">📏 Short</option>
            <option value="medium">📐 Medium</option>
            <option value="long">📊 Long</option>
          </select>
        </div>
      </div>

      {replyType === 'custom' && (
        <div className="custom-prompt-section">
          <label>Custom Prompt</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Enter your custom prompt for reply generation..."
            className="custom-prompt-input"
            rows={3}
          />
        </div>
      )}

      <div className="compose-settings">
        <div className="control-group">
          <label>Insert Method</label>
          <select
            value={composeMethod}
            onChange={(e) => setComposeMethod(e.target.value as any)}
            className="control-select"
          >
            {composeOptions.map(option => (
              <option key={option.method} value={option.method}>
                {getComposeMethodIcon(option.method)} {option.method.charAt(0).toUpperCase() + option.method.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="replies-list">
        {suggestedReplies.length === 0 ? (
          <div className="no-replies">
            <p>No replies generated yet. Click "Generate" to create suggested replies.</p>
          </div>
        ) : (
          suggestedReplies.map((reply, index) => (
            <div key={index} className={`reply-item ${selectedReply === reply.text ? 'selected' : ''}`}>
              <div className="reply-header">
                <div className="reply-meta">
                  <span className="reply-tone">
                    {getToneIcon(reply.tone)} {reply.tone}
                  </span>
                  <span className="reply-length">
                    {getLengthIcon(reply.length)} {reply.length}
                  </span>
                  <span className="reply-confidence">
                    {Math.round(reply.confidence * 100)}% confidence
                  </span>
                </div>
                
                <div className="reply-actions">
                  <button
                    onClick={() => handleReplySelect(reply)}
                    className="select-button"
                    title="Select this reply"
                  >
                    {selectedReply === reply.text ? '✓' : '○'}
                  </button>
                  
                  <button
                    onClick={() => handleInsertReply(reply)}
                    className="insert-button"
                    title="Insert into compose"
                  >
                    📝
                  </button>
                  
                  <button
                    onClick={() => navigator.clipboard.writeText(reply.text)}
                    className="copy-button"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div className="reply-content">
                <p>{reply.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {isGenerating && (
        <div className="generating-overlay">
          <div className="generating-spinner">⏳</div>
          <p>Generating replies...</p>
        </div>
      )}
    </div>
  )
}
