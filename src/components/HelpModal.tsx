import React, { useState } from 'react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'getting-started' | 'features' | 'troubleshooting' | 'privacy'>('getting-started')

  if (!isOpen) return null

  const tabs = [
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'features', label: 'Features' },
    { id: 'troubleshooting', label: 'Troubleshooting' },
    { id: 'privacy', label: 'Privacy' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'getting-started':
        return (
          <div className="help-content">
            <h3>Welcome to ReplySage!</h3>
            <p>ReplySage is your AI-powered email assistant that helps you analyze, understand, and respond to emails more effectively.</p>
            
            <h4>Quick Start</h4>
            <ol>
              <li><strong>Open an email</strong> in Gmail to see the ReplySage sidebar</li>
              <li><strong>Click "Analyze Email"</strong> to process the message with AI</li>
              <li><strong>Review the results</strong> including summary, action items, and suggested replies</li>
              <li><strong>Use suggested replies</strong> by clicking "Use This Reply" to insert into Gmail</li>
            </ol>

            <h4>First-Time Setup</h4>
            <ol>
              <li>Go to <strong>Settings</strong> to configure your preferences</li>
              <li>Enable <strong>Local Processing</strong> for privacy (recommended)</li>
              <li>Download <strong>AI Models</strong> for offline functionality</li>
              <li>Optionally enable <strong>Cloud Fallback</strong> with your API key</li>
            </ol>

            <h4>Tips for Best Results</h4>
            <ul>
              <li>Make sure emails are fully loaded before analyzing</li>
              <li>Use clear, well-formatted emails for better analysis</li>
              <li>Enable caching to avoid reprocessing the same emails</li>
              <li>Keep your models updated for the best performance</li>
            </ul>
          </div>
        )

      case 'features':
        return (
          <div className="help-content">
            <h3>ReplySage Features</h3>
            
            <h4>Email Analysis</h4>
            <ul>
              <li><strong>Smart Summaries:</strong> Get concise summaries of long emails</li>
              <li><strong>Action Item Extraction:</strong> Automatically identify tasks and deadlines</li>
              <li><strong>Sentiment Analysis:</strong> Understand the tone and mood of emails</li>
              <li><strong>Priority Detection:</strong> Identify urgent and important messages</li>
            </ul>

            <h4>Suggested Replies</h4>
            <ul>
              <li><strong>Multiple Tones:</strong> Formal, casual, and concise reply options</li>
              <li><strong>Context-Aware:</strong> Replies tailored to the email content</li>
              <li><strong>One-Click Insert:</strong> Easily insert replies into Gmail compose</li>
              <li><strong>Customizable Length:</strong> Short, medium, or long reply options</li>
            </ul>

            <h4>Grammar & Writing</h4>
            <ul>
              <li><strong>Grammar Checking:</strong> Identify and suggest corrections</li>
              <li><strong>Style Improvements:</strong> Enhance your writing quality</li>
              <li><strong>Language Support:</strong> Works with multiple languages</li>
              <li><strong>Real-time Feedback:</strong> Get suggestions as you type</li>
            </ul>

            <h4>Privacy & Security</h4>
            <ul>
              <li><strong>Local Processing:</strong> All analysis happens on your device</li>
              <li><strong>Encrypted Storage:</strong> Your data is securely stored</li>
              <li><strong>No Data Collection:</strong> We don't collect your personal information</li>
              <li><strong>User Control:</strong> You decide what data is processed</li>
            </ul>
          </div>
        )

      case 'troubleshooting':
        return (
          <div className="help-content">
            <h3>Troubleshooting</h3>
            
            <h4>Common Issues</h4>
            
            <div className="troubleshooting-item">
              <h5>Extension not working on Gmail</h5>
              <ul>
                <li>Make sure you're using a supported browser (Chrome, Firefox, Edge)</li>
                <li>Check that the extension is enabled in your browser settings</li>
                <li>Try refreshing the Gmail page</li>
                <li>Ensure you're using the standard Gmail interface (not mobile view)</li>
              </ul>
            </div>

            <div className="troubleshooting-item">
              <h5>AI analysis not working</h5>
              <ul>
                <li>Check that local processing is enabled in settings</li>
                <li>Download the required AI models from the Model Manager</li>
                <li>Ensure you have sufficient storage space (at least 500MB)</li>
                <li>Try restarting your browser</li>
              </ul>
            </div>

            <div className="troubleshooting-item">
              <h5>Slow performance</h5>
              <ul>
                <li>Close other browser tabs to free up memory</li>
                <li>Clear the extension cache in settings</li>
                <li>Update to the latest version of the extension</li>
                <li>Check your internet connection for model downloads</li>
              </ul>
            </div>

            <div className="troubleshooting-item">
              <h5>Models not downloading</h5>
              <ul>
                <li>Check your internet connection</li>
                <li>Ensure you have enough storage space</li>
                <li>Try downloading models one at a time</li>
                <li>Check if your firewall is blocking the downloads</li>
              </ul>
            </div>

            <h4>Getting Help</h4>
            <p>If you're still experiencing issues:</p>
            <ul>
              <li>Check the <strong>Console</strong> for error messages (F12 → Console)</li>
              <li>Try the <strong>Reset Settings</strong> option in the settings page</li>
              <li>Contact support with specific error details</li>
              <li>Check for extension updates</li>
            </ul>
          </div>
        )

      case 'privacy':
        return (
          <div className="help-content">
            <h3>Privacy & Data Protection</h3>
            
            <h4>How We Protect Your Privacy</h4>
            <ul>
              <li><strong>Local-First Design:</strong> All processing happens on your device</li>
              <li><strong>No Data Collection:</strong> We don't collect or store your email content</li>
              <li><strong>Encrypted Storage:</strong> Any stored data is encrypted locally</li>
              <li><strong>User Control:</strong> You decide what data is processed and where</li>
            </ul>

            <h4>Data Processing</h4>
            <ul>
              <li><strong>Email Content:</strong> Processed locally, never sent to our servers</li>
              <li><strong>Analysis Results:</strong> Stored locally in your browser</li>
              <li><strong>Settings:</strong> Stored locally and encrypted</li>
              <li><strong>API Keys:</strong> Encrypted and stored locally (if you use cloud features)</li>
            </ul>

            <h4>Cloud Features (Optional)</h4>
            <ul>
              <li><strong>Your API Keys:</strong> When using cloud features, we use your own API keys</li>
              <li><strong>PII Redaction:</strong> Personal information is automatically redacted</li>
              <li><strong>Explicit Consent:</strong> You must opt-in to cloud processing</li>
              <li><strong>No Server Storage:</strong> We don't store your data on our servers</li>
            </ul>

            <h4>Your Rights</h4>
            <ul>
              <li><strong>Data Access:</strong> View all your stored data anytime</li>
              <li><strong>Data Export:</strong> Download your data in JSON format</li>
              <li><strong>Data Deletion:</strong> Clear all data with one click</li>
              <li><strong>Opt-Out:</strong> Disable any data processing features</li>
            </ul>

            <h4>Compliance</h4>
            <ul>
              <li><strong>GDPR Compliant:</strong> Follows European data protection regulations</li>
              <li><strong>CCPA Compliant:</strong> Follows California privacy laws</li>
              <li><strong>Browser Store Policies:</strong> Complies with Chrome and Firefox requirements</li>
              <li><strong>Regular Audits:</strong> We regularly review our privacy practices</li>
            </ul>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="help-modal-overlay">
      <div className="help-modal">
        <div className="help-modal-header">
          <h2>ReplySage Help</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="help-modal-content">
          <div className="help-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`help-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="help-tab-content">
            {renderContent()}
          </div>
        </div>

        <div className="help-modal-footer">
          <button onClick={onClose} className="close-button-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
