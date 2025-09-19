import React, { useState } from 'react'
import { EmailThread, ThreadSummary, ThreadChunk } from '@/types'

interface ThreadSummaryPanelProps {
  thread: EmailThread | null
  summary: ThreadSummary | null
  chunks: ThreadChunk[]
  onGenerateSummary: (thread: EmailThread) => Promise<ThreadSummary>
  onGenerateChunks: (thread: EmailThread) => Promise<ThreadChunk[]>
  isGenerating: boolean
}

export const ThreadSummaryPanel: React.FC<ThreadSummaryPanelProps> = ({
  thread,
  summary,
  chunks,
  onGenerateSummary,
  onGenerateChunks,
  isGenerating
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'chunks' | 'timeline'>('summary')
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set())

  const handleGenerateSummary = async () => {
    if (thread) {
      await onGenerateSummary(thread)
    }
  }

  const handleGenerateChunks = async () => {
    if (thread) {
      await onGenerateChunks(thread)
    }
  }

  const toggleChunkExpansion = (chunkId: string) => {
    const newExpanded = new Set(expandedChunks)
    if (newExpanded.has(chunkId)) {
      newExpanded.delete(chunkId)
    } else {
      newExpanded.add(chunkId)
    }
    setExpandedChunks(newExpanded)
  }

  const formatDuration = (duration: number): string => {
    const days = Math.floor(duration / (1000 * 60 * 60 * 24))
    const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const getSentimentIcon = (sentiment: string): string => {
    switch (sentiment) {
      case 'positive': return '😊'
      case 'negative': return '😞'
      case 'neutral': return '😐'
      default: return '😐'
    }
  }

  const getUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'urgent': return '🚨'
      case 'meeting': return '📅'
      case 'project': return '📁'
      case 'support': return '🆘'
      case 'decision': return '✅'
      case 'general': return '📝'
      default: return '📝'
    }
  }

  if (!thread) {
    return (
      <div className="thread-summary-panel">
        <div className="no-thread">
          <p>No thread selected. Open an email thread to see its summary.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="thread-summary-panel">
      <div className="panel-header">
        <h3>Thread Summary</h3>
        <div className="panel-controls">
          <button
            onClick={handleGenerateSummary}
            disabled={isGenerating}
            className="generate-button"
          >
            {isGenerating ? '⏳' : '🔄'} Summary
          </button>
          <button
            onClick={handleGenerateChunks}
            disabled={isGenerating}
            className="generate-button"
          >
            {isGenerating ? '⏳' : '📄'} Chunks
          </button>
        </div>
      </div>

      <div className="thread-info">
        <div className="thread-header">
          <h4 className="thread-subject">{thread.subject}</h4>
          <div className="thread-meta">
            <span className="message-count">{thread.messageCount} messages</span>
            <span className="participant-count">{thread.participants.length} participants</span>
            <span className="thread-duration">
              {formatDuration(thread.endDate.getTime() - thread.startDate.getTime())}
            </span>
          </div>
        </div>

        <div className="thread-categories">
          {thread.categories.map((category, index) => (
            <span key={index} className="category-tag">
              {getCategoryIcon(category)} {category}
            </span>
          ))}
        </div>

        <div className="thread-participants">
          <span className="participants-label">Participants:</span>
          <div className="participants-list">
            {thread.participants.map((participant, index) => (
              <span key={index} className="participant-tag">
                {participant}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📋 Summary
        </button>
        <button
          className={`tab-button ${activeTab === 'chunks' ? 'active' : ''}`}
          onClick={() => setActiveTab('chunks')}
        >
          📄 Chunks
        </button>
        <button
          className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          ⏰ Timeline
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'summary' && (
          <div className="summary-tab">
            {summary ? (
              <div className="summary-content">
                <div className="summary-header">
                  <div className="summary-meta">
                    <span className={`urgency-badge ${getUrgencyColor(summary.urgency)}`}>
                      {summary.urgency.toUpperCase()}
                    </span>
                    <span className="sentiment-badge">
                      {getSentimentIcon(summary.sentiment)} {summary.sentiment}
                    </span>
                    <span className="confidence-badge">
                      {Math.round(summary.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>

                <div className="summary-text">
                  <p>{summary.summary}</p>
                </div>

                {summary.keyPoints.length > 0 && (
                  <div className="key-points">
                    <h5>Key Points</h5>
                    <ul>
                      {summary.keyPoints.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.actionItems.length > 0 && (
                  <div className="action-items">
                    <h5>Action Items</h5>
                    <ul>
                      {summary.actionItems.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.decisions.length > 0 && (
                  <div className="decisions">
                    <h5>Decisions</h5>
                    <ul>
                      {summary.decisions.map((decision, index) => (
                        <li key={index}>{decision}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="timeline-info">
                  <h5>Timeline</h5>
                  <div className="timeline-details">
                    <span>Started: {summary.timeline.start.toLocaleDateString()}</span>
                    <span>Ended: {summary.timeline.end.toLocaleDateString()}</span>
                    <span>Duration: {formatDuration(summary.timeline.duration)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-summary">
                <p>No summary available. Click "Generate Summary" to create one.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chunks' && (
          <div className="chunks-tab">
            {chunks.length > 0 ? (
              <div className="chunks-list">
                {chunks.map((chunk, index) => (
                  <div key={chunk.id} className="chunk-item">
                    <div className="chunk-header">
                      <div className="chunk-meta">
                        <span className="chunk-number">Chunk {index + 1}</span>
                        <span className="chunk-range">
                          Messages {chunk.startIndex + 1}-{chunk.endIndex + 1}
                        </span>
                        <span className="chunk-sentiment">
                          {getSentimentIcon(chunk.sentiment)} {chunk.sentiment}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleChunkExpansion(chunk.id)}
                        className="expand-button"
                      >
                        {expandedChunks.has(chunk.id) ? '▼' : '▶'}
                      </button>
                    </div>

                    <div className="chunk-summary">
                      <p>{chunk.summary}</p>
                    </div>

                    {chunk.keyPoints.length > 0 && (
                      <div className="chunk-key-points">
                        <strong>Key Points:</strong>
                        <ul>
                          {chunk.keyPoints.map((point, pointIndex) => (
                            <li key={pointIndex}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {expandedChunks.has(chunk.id) && (
                      <div className="chunk-messages">
                        <h6>Messages in this chunk:</h6>
                        {chunk.messages.map((message, msgIndex) => (
                          <div key={msgIndex} className="chunk-message">
                            <div className="message-header">
                              <span className="message-sender">{message.from}</span>
                              <span className="message-time">
                                {message.timestamp.toLocaleDateString()}
                              </span>
                            </div>
                            <div className="message-content">
                              <div className="message-subject">{message.subject}</div>
                              <div className="message-body">
                                {message.body.substring(0, 200)}...
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-chunks">
                <p>No chunks available. Click "Generate Chunks" to create them.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="timeline-tab">
            <div className="timeline-container">
              {thread.messages.map((message, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-marker">
                    <div className="timeline-dot"></div>
                    <div className="timeline-line"></div>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-sender">{message.from}</span>
                      <span className="timeline-time">
                        {message.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <div className="timeline-subject">{message.subject}</div>
                    <div className="timeline-body">
                      {message.body.substring(0, 300)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
