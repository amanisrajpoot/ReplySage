import React, { useState, useEffect } from 'react'
import { TestReport, TestSuite } from '@/types'

interface BetaTestingPanelProps {
  onRunTests: () => Promise<TestReport[]>
  onGenerateReport: (reports: TestReport[]) => string
  onExportLogs: () => void
}

export const BetaTestingPanel: React.FC<BetaTestingPanelProps> = ({
  onRunTests,
  onGenerateReport,
  onExportLogs
}) => {
  const [testReports, setTestReports] = useState<TestReport[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedSuite, setSelectedSuite] = useState<string>('all')
  const [showDetails, setShowDetails] = useState(false)

  const handleRunTests = async () => {
    setIsRunning(true)
    try {
      const reports = await onRunTests()
      setTestReports(reports)
    } catch (error) {
      console.error('Failed to run tests:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const handleGenerateReport = () => {
    if (testReports.length === 0) return
    
    const report = onGenerateReport(testReports)
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `replysage-test-report-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getTotalStats = () => {
    const totalTests = testReports.reduce((sum, r) => sum + r.totalTests, 0)
    const passedTests = testReports.reduce((sum, r) => sum + r.passedTests, 0)
    const failedTests = testReports.reduce((sum, r) => sum + r.failedTests, 0)
    const skippedTests = testReports.reduce((sum, r) => sum + r.skippedTests, 0)
    const totalDuration = testReports.reduce((sum, r) => sum + r.duration, 0)
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      totalDuration,
      successRate
    }
  }

  const stats = getTotalStats()

  return (
    <div className="beta-testing-panel">
      <div className="panel-header">
        <h3>Beta Testing & QA</h3>
        <p className="panel-description">
          Run comprehensive tests to ensure quality and reliability before release.
        </p>
      </div>

      <div className="testing-controls">
        <div className="control-group">
          <label htmlFor="test-suite-select">Test Suite:</label>
          <select
            id="test-suite-select"
            value={selectedSuite}
            onChange={(e) => setSelectedSuite(e.target.value)}
            className="test-suite-select"
          >
            <option value="all">All Test Suites</option>
            <option value="unit">Unit Tests</option>
            <option value="integration">Integration Tests</option>
            <option value="e2e">End-to-End Tests</option>
            <option value="performance">Performance Tests</option>
            <option value="security">Security Tests</option>
            <option value="accessibility">Accessibility Tests</option>
          </select>
        </div>

        <div className="control-buttons">
          <button
            className="run-tests-button"
            onClick={handleRunTests}
            disabled={isRunning}
          >
            {isRunning ? '⏳ Running Tests...' : '🧪 Run Tests'}
          </button>
          
          <button
            className="generate-report-button"
            onClick={handleGenerateReport}
            disabled={testReports.length === 0}
          >
            📊 Generate Report
          </button>
          
          <button
            className="export-logs-button"
            onClick={onExportLogs}
          >
            📋 Export Logs
          </button>
        </div>
      </div>

      {testReports.length > 0 && (
        <div className="test-results">
          <div className="results-summary">
            <div className="summary-card">
              <div className="summary-icon">📊</div>
              <div className="summary-content">
                <div className="summary-value">{stats.totalTests}</div>
                <div className="summary-label">Total Tests</div>
              </div>
            </div>

            <div className="summary-card success">
              <div className="summary-icon">✅</div>
              <div className="summary-content">
                <div className="summary-value">{stats.passedTests}</div>
                <div className="summary-label">Passed</div>
              </div>
            </div>

            <div className="summary-card error">
              <div className="summary-icon">❌</div>
              <div className="summary-content">
                <div className="summary-value">{stats.failedTests}</div>
                <div className="summary-label">Failed</div>
              </div>
            </div>

            <div className="summary-card warning">
              <div className="summary-icon">⏭️</div>
              <div className="summary-content">
                <div className="summary-value">{stats.skippedTests}</div>
                <div className="summary-label">Skipped</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">⏱️</div>
              <div className="summary-content">
                <div className="summary-value">{(stats.totalDuration / 1000).toFixed(1)}s</div>
                <div className="summary-label">Duration</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">📈</div>
              <div className="summary-content">
                <div className="summary-value">{stats.successRate.toFixed(1)}%</div>
                <div className="summary-label">Success Rate</div>
              </div>
            </div>
          </div>

          <div className="results-details">
            <div className="details-header">
              <h4>Test Results by Suite</h4>
              <button
                className="toggle-details-button"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {showDetails && (
              <div className="suite-results">
                {testReports.map((report, index) => (
                  <div key={index} className="suite-result">
                    <div className="suite-header">
                      <h5>{report.id}</h5>
                      <div className="suite-stats">
                        <span className={`stat passed`}>{report.passedTests} passed</span>
                        <span className={`stat failed`}>{report.failedTests} failed</span>
                        <span className="stat duration">{(report.duration / 1000).toFixed(1)}s</span>
                      </div>
                    </div>

                    {report.failedTests > 0 && (
                      <div className="failed-tests">
                        <h6>Failed Tests:</h6>
                        {report.results
                          .filter(r => !r.passed)
                          .map((result, resultIndex) => (
                            <div key={resultIndex} className="failed-test">
                              <div className="test-error">{result.error}</div>
                              {result.details && (
                                <div className="test-details">
                                  <pre>{JSON.stringify(result.details, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="testing-info">
        <h4>Testing Guidelines</h4>
        <div className="info-grid">
          <div className="info-item">
            <h5>Unit Tests</h5>
            <p>Test individual components and functions in isolation</p>
          </div>
          <div className="info-item">
            <h5>Integration Tests</h5>
            <p>Test how different components work together</p>
          </div>
          <div className="info-item">
            <h5>E2E Tests</h5>
            <p>Test complete user workflows from start to finish</p>
          </div>
          <div className="info-item">
            <h5>Performance Tests</h5>
            <p>Test speed, memory usage, and resource consumption</p>
          </div>
          <div className="info-item">
            <h5>Security Tests</h5>
            <p>Test encryption, privacy, and security features</p>
          </div>
          <div className="info-item">
            <h5>Accessibility Tests</h5>
            <p>Test keyboard navigation and screen reader compatibility</p>
          </div>
        </div>
      </div>
    </div>
  )
}
