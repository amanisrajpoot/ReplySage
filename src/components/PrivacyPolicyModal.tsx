import React, { useState } from 'react'

interface PrivacyPolicyModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => void
  onDecline: () => void
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'data' | 'security' | 'rights' | 'contact'>('overview')

  if (!isOpen) return null

  const sections = [
    { id: 'overview', title: 'Overview', icon: '📋' },
    { id: 'data', title: 'Data Collection', icon: '📊' },
    { id: 'security', title: 'Security', icon: '🔒' },
    { id: 'rights', title: 'Your Rights', icon: '⚖️' },
    { id: 'contact', title: 'Contact', icon: '📞' }
  ]

  return (
    <div className="privacy-policy-modal">
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Privacy Policy & Data Protection</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            <div className="privacy-navigation">
              {sections.map(section => (
                <button
                  key={section.id}
                  className={`nav-button ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id as any)}
                >
                  <span className="nav-icon">{section.icon}</span>
                  <span className="nav-title">{section.title}</span>
                </button>
              ))}
            </div>

            <div className="privacy-content">
              {activeSection === 'overview' && (
                <div className="privacy-section">
                  <h3>Privacy Overview</h3>
                  <div className="privacy-highlights">
                    <div className="highlight-item">
                      <span className="highlight-icon">🏠</span>
                      <div className="highlight-content">
                        <h4>Local-First Processing</h4>
                        <p>All AI processing happens locally on your device. No data is sent to our servers unless you explicitly opt-in to cloud features.</p>
                      </div>
                    </div>
                    <div className="highlight-item">
                      <span className="highlight-icon">🔐</span>
                      <div className="highlight-content">
                        <h4>End-to-End Encryption</h4>
                        <p>All sensitive data is encrypted using WebCrypto API with industry-standard AES-256 encryption.</p>
                      </div>
                    </div>
                    <div className="highlight-item">
                      <span className="highlight-icon">👤</span>
                      <div className="highlight-content">
                        <h4>No Personal Data Collection</h4>
                        <p>We don't collect, store, or transmit any personal information. All data remains on your device.</p>
                      </div>
                    </div>
                    <div className="highlight-item">
                      <span className="highlight-icon">🎛️</span>
                      <div className="highlight-content">
                        <h4>Full Control</h4>
                        <p>You have complete control over your data with options to export, delete, or modify at any time.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'data' && (
                <div className="privacy-section">
                  <h3>Data Collection & Usage</h3>
                  <div className="data-types">
                    <div className="data-type">
                      <h4>📧 Email Content</h4>
                      <p><strong>What we process:</strong> Email subject, body text, sender information</p>
                      <p><strong>How we use it:</strong> Generate summaries, extract action items, suggest replies</p>
                      <p><strong>Storage:</strong> Processed locally, not stored unless you enable caching</p>
                    </div>
                    <div className="data-type">
                      <h4>🤖 AI Models</h4>
                      <p><strong>What we use:</strong> Small, local AI models for text processing</p>
                      <p><strong>How we use it:</strong> Grammar checking, summarization, sentiment analysis</p>
                      <p><strong>Storage:</strong> Models stored locally on your device</p>
                    </div>
                    <div className="data-type">
                      <h4>⚙️ Settings & Preferences</h4>
                      <p><strong>What we store:</strong> Your extension settings and preferences</p>
                      <p><strong>How we use it:</strong> Customize the extension experience</p>
                      <p><strong>Storage:</strong> Stored locally in browser storage</p>
                    </div>
                    <div className="data-type">
                      <h4>📊 Performance Metrics</h4>
                      <p><strong>What we collect:</strong> Anonymous performance data (optional)</p>
                      <p><strong>How we use it:</strong> Improve extension performance and reliability</p>
                      <p><strong>Storage:</strong> Stored locally, can be disabled</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'security' && (
                <div className="privacy-section">
                  <h3>Security & Protection</h3>
                  <div className="security-measures">
                    <div className="security-item">
                      <h4>🔒 Encryption</h4>
                      <ul>
                        <li>AES-256 encryption for all sensitive data</li>
                        <li>WebCrypto API for secure key generation</li>
                        <li>Encrypted storage for API keys and settings</li>
                        <li>End-to-end encryption for cloud communications</li>
                      </ul>
                    </div>
                    <div className="security-item">
                      <h4>🛡️ Data Protection</h4>
                      <ul>
                        <li>PII redaction before any cloud processing</li>
                        <li>Automatic data retention policies</li>
                        <li>Secure deletion of expired data</li>
                        <li>No data transmission without explicit consent</li>
                      </ul>
                    </div>
                    <div className="security-item">
                      <h4>🔍 Privacy Controls</h4>
                      <ul>
                        <li>Granular privacy settings</li>
                        <li>Opt-in consent for all data processing</li>
                        <li>Easy data export and deletion</li>
                        <li>Transparent audit logging</li>
                      </ul>
                    </div>
                    <div className="security-item">
                      <h4>🌐 Network Security</h4>
                      <ul>
                        <li>HTTPS-only communications</li>
                        <li>No tracking or analytics cookies</li>
                        <li>Minimal network permissions</li>
                        <li>Secure API key storage</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'rights' && (
                <div className="privacy-section">
                  <h3>Your Rights & Controls</h3>
                  <div className="rights-list">
                    <div className="right-item">
                      <h4>📤 Right to Export</h4>
                      <p>Export all your data in a machine-readable format at any time.</p>
                      <button className="action-button">Export My Data</button>
                    </div>
                    <div className="right-item">
                      <h4>🗑️ Right to Delete</h4>
                      <p>Delete all or specific types of data with one click.</p>
                      <button className="action-button">Delete My Data</button>
                    </div>
                    <div className="right-item">
                      <h4>⚙️ Right to Control</h4>
                      <p>Control what data is collected and how it's processed.</p>
                      <button className="action-button">Privacy Settings</button>
                    </div>
                    <div className="right-item">
                      <h4>📋 Right to Information</h4>
                      <p>View detailed information about your data and how it's used.</p>
                      <button className="action-button">View Data Summary</button>
                    </div>
                    <div className="right-item">
                      <h4>🔍 Right to Audit</h4>
                      <p>View audit logs of all data access and processing activities.</p>
                      <button className="action-button">View Audit Log</button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'contact' && (
                <div className="privacy-section">
                  <h3>Contact & Support</h3>
                  <div className="contact-info">
                    <div className="contact-item">
                      <h4>📧 Email Support</h4>
                      <p>privacy@replysage.com</p>
                      <p>For privacy-related questions and data requests</p>
                    </div>
                    <div className="contact-item">
                      <h4>🐛 Bug Reports</h4>
                      <p>support@replysage.com</p>
                      <p>For technical issues and bug reports</p>
                    </div>
                    <div className="contact-item">
                      <h4>💬 Community</h4>
                      <p>GitHub Issues</p>
                      <p>Open source community support and discussions</p>
                    </div>
                    <div className="contact-item">
                      <h4>📄 Legal</h4>
                      <p>legal@replysage.com</p>
                      <p>For legal inquiries and compliance matters</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <div className="consent-options">
              <button className="decline-button" onClick={onDecline}>
                Decline
              </button>
              <button className="accept-button" onClick={onAccept}>
                Accept & Continue
              </button>
            </div>
            <p className="privacy-note">
              By using ReplySage, you agree to our privacy policy. You can change your privacy settings at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
