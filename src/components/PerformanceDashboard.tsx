import React, { useState } from 'react'
import { PerformanceStats, ModelPerformanceMetrics } from '@/types'

interface PerformanceDashboardProps {
  stats: PerformanceStats
  modelMetrics: ModelPerformanceMetrics[]
  onClearMetrics: () => void
  onExportMetrics: () => void
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  stats,
  modelMetrics: _modelMetrics,
  onClearMetrics,
  onExportMetrics
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'memory' | 'network'>('overview')
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatLatency = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`
  }

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'text-green-600'
    if (value <= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceIcon = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return '✅'
    if (value <= thresholds.warning) return '⚠️'
    return '❌'
  }

  return (
    <div className="performance-dashboard">
      <div className="dashboard-header">
        <h3>Performance Dashboard</h3>
        <div className="dashboard-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="time-range-select"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button onClick={onClearMetrics} className="clear-button">
            🗑️ Clear
          </button>
          <button onClick={onExportMetrics} className="export-button">
            📊 Export
          </button>
        </div>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          🤖 Models
        </button>
        <button
          className={`tab-button ${activeTab === 'memory' ? 'active' : ''}`}
          onClick={() => setActiveTab('memory')}
        >
          💾 Memory
        </button>
        <button
          className={`tab-button ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          🌐 Network
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <h4>Operations</h4>
                  <span className="metric-icon">⚡</span>
                </div>
                <div className="metric-value">{stats.totalOperations}</div>
                <div className="metric-label">Total Operations</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <h4>Latency</h4>
                  <span className={`metric-icon ${getPerformanceColor(stats.averageLatency, { good: 1000, warning: 3000 })}`}>
                    {getPerformanceIcon(stats.averageLatency, { good: 1000, warning: 3000 })}
                  </span>
                </div>
                <div className="metric-value">{formatLatency(stats.averageLatency)}</div>
                <div className="metric-label">Average Latency</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <h4>Memory Usage</h4>
                  <span className={`metric-icon ${getPerformanceColor(stats.memoryUsage.percentage, { good: 50, warning: 80 })}`}>
                    {getPerformanceIcon(stats.memoryUsage.percentage, { good: 50, warning: 80 })}
                  </span>
                </div>
                <div className="metric-value">{formatBytes(stats.memoryUsage.used)}</div>
                <div className="metric-label">
                  {formatPercentage(stats.memoryUsage.percentage / 100)} of {formatBytes(stats.memoryUsage.total)}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <h4>CPU Usage</h4>
                  <span className={`metric-icon ${getPerformanceColor(stats.cpuUsage.average, { good: 30, warning: 70 })}`}>
                    {getPerformanceIcon(stats.cpuUsage.average, { good: 30, warning: 70 })}
                  </span>
                </div>
                <div className="metric-value">{formatPercentage(stats.cpuUsage.average / 100)}</div>
                <div className="metric-label">Average CPU Usage</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <h4>Network</h4>
                  <span className="metric-icon">🌐</span>
                </div>
                <div className="metric-value">{stats.networkUsage.requests}</div>
                <div className="metric-label">
                  {formatBytes(stats.networkUsage.bytesTransferred)} transferred
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <h4>Models</h4>
                  <span className="metric-icon">🤖</span>
                </div>
                <div className="metric-value">{Object.keys(stats.modelPerformance).length}</div>
                <div className="metric-label">Active Models</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'models' && (
          <div className="models-tab">
            <div className="models-list">
              {Object.entries(stats.modelPerformance).map(([modelName, performance]) => (
                <div key={modelName} className="model-card">
                  <div className="model-header">
                    <h4>{modelName}</h4>
                    <span className="model-status">Active</span>
                  </div>
                  <div className="model-metrics">
                    <div className="model-metric">
                      <span className="metric-label">Latency:</span>
                      <span className="metric-value">{formatLatency(performance.averageLatency)}</span>
                    </div>
                    <div className="model-metric">
                      <span className="metric-label">Success Rate:</span>
                      <span className="metric-value">{formatPercentage(performance.successRate)}</span>
                    </div>
                    <div className="model-metric">
                      <span className="metric-label">Memory:</span>
                      <span className="metric-value">{formatBytes(performance.memoryUsage)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="memory-tab">
            <div className="memory-chart">
              <div className="chart-header">
                <h4>Memory Usage</h4>
                <span className="chart-value">
                  {formatBytes(stats.memoryUsage.used)} / {formatBytes(stats.memoryUsage.total)}
                </span>
              </div>
              <div className="memory-bar">
                <div 
                  className="memory-fill"
                  style={{ width: `${stats.memoryUsage.percentage}%` }}
                ></div>
              </div>
              <div className="memory-labels">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'network' && (
          <div className="network-tab">
            <div className="network-stats">
              <div className="network-stat">
                <h4>Requests</h4>
                <div className="stat-value">{stats.networkUsage.requests}</div>
              </div>
              <div className="network-stat">
                <h4>Data Transferred</h4>
                <div className="stat-value">{formatBytes(stats.networkUsage.bytesTransferred)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
