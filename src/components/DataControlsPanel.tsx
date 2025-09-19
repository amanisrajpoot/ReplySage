import React, { useState } from 'react'

interface DataControlsPanelProps {
  onExportData: (type: 'full' | 'partial') => Promise<void>
  onDeleteData: (type: 'all' | 'analysis' | 'performance' | 'audit' | 'settings' | 'models' | 'embeddings') => Promise<void>
  onClearCache: () => Promise<void>
  onViewAuditLog: () => void
  onViewDataSummary: () => void
}

export const DataControlsPanel: React.FC<DataControlsPanelProps> = ({
  onExportData,
  onDeleteData,
  onClearCache,
  onViewAuditLog,
  onViewDataSummary
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [selectedDeleteType, setSelectedDeleteType] = useState<'all' | 'analysis' | 'performance' | 'audit' | 'settings' | 'models' | 'embeddings'>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleExportData = async (type: 'full' | 'partial') => {
    setIsExporting(true)
    try {
      await onExportData(type)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteData = async () => {
    setIsDeleting(true)
    try {
      await onDeleteData(selectedDeleteType)
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClearCache = async () => {
    setIsClearing(true)
    try {
      await onClearCache()
    } finally {
      setIsClearing(false)
    }
  }

  const getDeleteTypeDescription = (type: string): string => {
    const descriptions: { [key: string]: string } = {
      all: 'All data including settings, analysis history, performance metrics, and cached models',
      analysis: 'Analysis history and cached analysis results',
      performance: 'Performance metrics and monitoring data',
      audit: 'Audit logs and security logs',
      settings: 'User settings and preferences',
      models: 'Cached AI models and model assets',
      embeddings: 'Semantic search embeddings and similarity data'
    }
    return descriptions[type] || 'Unknown data type'
  }

  const getDeleteTypeIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      all: '🗑️',
      analysis: '📊',
      performance: '⚡',
      audit: '📋',
      settings: '⚙️',
      models: '🤖',
      embeddings: '🔍'
    }
    return icons[type] || '❓'
  }

  return (
    <div className="data-controls-panel">
      <div className="panel-header">
        <h3>Data Controls</h3>
        <p className="panel-description">
          Manage your data with full control over what's stored and how it's used.
        </p>
      </div>

      <div className="controls-grid">
        {/* Export Data Section */}
        <div className="control-section">
          <div className="section-header">
            <h4>📤 Export Data</h4>
            <p>Download your data for backup or migration</p>
          </div>
          <div className="section-actions">
            <button
              className="action-button primary"
              onClick={() => handleExportData('partial')}
              disabled={isExporting}
            >
              {isExporting ? '⏳' : '📋'} Export Settings & Analysis
            </button>
            <button
              className="action-button secondary"
              onClick={() => handleExportData('full')}
              disabled={isExporting}
            >
              {isExporting ? '⏳' : '📦'} Export All Data
            </button>
          </div>
          <div className="section-info">
            <p><strong>Partial Export:</strong> Settings, analysis history, and user preferences</p>
            <p><strong>Full Export:</strong> All data including performance metrics, audit logs, and cached models</p>
          </div>
        </div>

        {/* Delete Data Section */}
        <div className="control-section">
          <div className="section-header">
            <h4>🗑️ Delete Data</h4>
            <p>Remove specific types of data or everything</p>
          </div>
          <div className="section-actions">
            <select
              value={selectedDeleteType}
              onChange={(e) => setSelectedDeleteType(e.target.value as any)}
              className="delete-type-select"
            >
              <option value="all">All Data</option>
              <option value="analysis">Analysis Data</option>
              <option value="performance">Performance Metrics</option>
              <option value="audit">Audit Logs</option>
              <option value="settings">Settings</option>
              <option value="models">Cached Models</option>
              <option value="embeddings">Embeddings</option>
            </select>
            <button
              className="action-button danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              {isDeleting ? '⏳' : '🗑️'} Delete Selected Data
            </button>
          </div>
          <div className="section-info">
            <p><strong>Selected:</strong> {getDeleteTypeIcon(selectedDeleteType)} {getDeleteTypeDescription(selectedDeleteType)}</p>
          </div>
        </div>

        {/* Clear Cache Section */}
        <div className="control-section">
          <div className="section-header">
            <h4>🧹 Clear Cache</h4>
            <p>Remove temporary cached data to free up space</p>
          </div>
          <div className="section-actions">
            <button
              className="action-button secondary"
              onClick={handleClearCache}
              disabled={isClearing}
            >
              {isClearing ? '⏳' : '🧹'} Clear Cache
            </button>
          </div>
          <div className="section-info">
            <p>This will remove temporary cached data but preserve your settings and analysis history.</p>
          </div>
        </div>

        {/* View Data Section */}
        <div className="control-section">
          <div className="section-header">
            <h4>👁️ View Data</h4>
            <p>Inspect your stored data and activity logs</p>
          </div>
          <div className="section-actions">
            <button
              className="action-button secondary"
              onClick={onViewDataSummary}
            >
              📊 Data Summary
            </button>
            <button
              className="action-button secondary"
              onClick={onViewAuditLog}
            >
              📋 Audit Log
            </button>
          </div>
          <div className="section-info">
            <p>View detailed information about your stored data and access logs.</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-modal">
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Confirm Data Deletion</h3>
                <button className="close-button" onClick={() => setShowDeleteConfirm(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="warning-icon">⚠️</div>
                <h4>Are you sure you want to delete this data?</h4>
                <p className="delete-description">
                  {getDeleteTypeIcon(selectedDeleteType)} {getDeleteTypeDescription(selectedDeleteType)}
                </p>
                <p className="warning-text">
                  <strong>This action cannot be undone.</strong> Once deleted, this data will be permanently removed from your device.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="cancel-button"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-button"
                  onClick={handleDeleteData}
                  disabled={isDeleting}
                >
                  {isDeleting ? '⏳ Deleting...' : '🗑️ Delete Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
