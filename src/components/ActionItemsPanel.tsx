import React, { useState } from 'react'
import { ActionItem, ExtractedDate } from '@/types'

interface ActionItemsPanelProps {
  actionItems: ActionItem[]
  extractedDates: ExtractedDate[]
  onActionComplete: (actionId: string) => void
  onActionEdit: (actionId: string, updatedAction: ActionItem) => void
  onActionDelete: (actionId: string) => void
  onAddToCalendar: (action: ActionItem) => void
  onAddDateToCalendar: (date: ExtractedDate) => void
}

export const ActionItemsPanel: React.FC<ActionItemsPanelProps> = ({
  actionItems,
  extractedDates,
  onActionComplete,
  onActionEdit,
  onActionDelete,
  onAddToCalendar,
  onAddDateToCalendar
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'high' | 'medium' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'category' | 'created'>('dueDate')
  const [editingAction, setEditingAction] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const filteredActions = actionItems.filter(action => {
    switch (filter) {
      case 'pending':
        return !action.isCompleted
      case 'completed':
        return action.isCompleted
      case 'high':
        return action.priority === 'high'
      case 'medium':
        return action.priority === 'medium'
      case 'low':
        return action.priority === 'low'
      default:
        return true
    }
  })

  const sortedActions = [...filteredActions].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.getTime() - b.dueDate.getTime()
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      case 'category':
        return a.category.localeCompare(b.category)
      case 'created':
        return 0 // Actions don't have created date in current type
      default:
        return 0
    }
  })

  const handleEditStart = (action: ActionItem) => {
    setEditingAction(action.text)
    setEditText(action.text)
  }

  const handleEditSave = (action: ActionItem) => {
    if (editText.trim()) {
      onActionEdit(action.text, { ...action, text: editText.trim() })
    }
    setEditingAction(null)
    setEditText('')
  }

  const handleEditCancel = () => {
    setEditingAction(null)
    setEditText('')
  }

  const formatDate = (date: Date): string => {
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`
    
    return date.toLocaleDateString()
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'urgent': return '🚨'
      case 'required': return '✅'
      case 'scheduling': return '📅'
      case 'preparation': return '📋'
      case 'review': return '👀'
      case 'communication': return '💬'
      case 'follow-up': return '🔄'
      case 'project': return '📁'
      case 'modification': return '✏️'
      case 'request': return '🙏'
      case 'reminder': return '⏰'
      default: return '📝'
    }
  }

  return (
    <div className="action-items-panel">
      <div className="panel-header">
        <h3>Action Items</h3>
        <div className="panel-controls">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
            <option value="category">Category</option>
            <option value="created">Created</option>
          </select>
        </div>
      </div>

      <div className="action-items-list">
        {sortedActions.length === 0 ? (
          <div className="no-actions">
            <p>No action items found</p>
          </div>
        ) : (
          sortedActions.map((action, index) => (
            <div key={index} className={`action-item ${action.isCompleted ? 'completed' : ''}`}>
              <div className="action-content">
                <div className="action-header">
                  <div className="action-priority">
                    <span className={`priority-badge ${getPriorityColor(action.priority)}`}>
                      {action.priority.toUpperCase()}
                    </span>
                    <span className="category-icon">
                      {getCategoryIcon(action.category)}
                    </span>
                  </div>
                  
                  <div className="action-actions">
                    <button
                      onClick={() => onActionComplete(action.text)}
                      className="complete-button"
                      title="Mark as complete"
                    >
                      {action.isCompleted ? '✓' : '○'}
                    </button>
                    
                    <button
                      onClick={() => handleEditStart(action)}
                      className="edit-button"
                      title="Edit action"
                    >
                      ✏️
                    </button>
                    
                    <button
                      onClick={() => onActionDelete(action.text)}
                      className="delete-button"
                      title="Delete action"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="action-text">
                  {editingAction === action.text ? (
                    <div className="edit-form">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="edit-input"
                        autoFocus
                      />
                      <div className="edit-actions">
                        <button
                          onClick={() => handleEditSave(action)}
                          className="save-button"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className={action.isCompleted ? 'completed-text' : ''}>
                      {action.text}
                    </span>
                  )}
                </div>
                
                {action.dueDate && (
                  <div className="action-due-date">
                    <span className="due-label">Due:</span>
                    <span className="due-date">{formatDate(action.dueDate)}</span>
                    <button
                      onClick={() => onAddToCalendar(action)}
                      className="calendar-button"
                      title="Add to calendar"
                    >
                      📅
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {extractedDates.length > 0 && (
        <div className="extracted-dates-section">
          <h4>Important Dates</h4>
          <div className="dates-list">
            {extractedDates.map((date, index) => (
              <div key={index} className="date-item">
                <div className="date-info">
                  <span className="date-text">{date.text}</span>
                  <span className="date-value">{formatDate(date.date)}</span>
                  <span className="date-type">{date.type}</span>
                </div>
                <button
                  onClick={() => onAddDateToCalendar(date)}
                  className="calendar-button"
                  title="Add to calendar"
                >
                  📅
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel-footer">
        <div className="action-stats">
          <span className="stat">
            Total: {actionItems.length}
          </span>
          <span className="stat">
            Pending: {actionItems.filter(a => !a.isCompleted).length}
          </span>
          <span className="stat">
            Completed: {actionItems.filter(a => a.isCompleted).length}
          </span>
        </div>
      </div>
    </div>
  )
}
