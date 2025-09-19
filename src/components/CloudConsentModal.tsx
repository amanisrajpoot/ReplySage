import React, { useState, useEffect } from 'react'
import { EmailMessage } from '@/types'

interface CloudConsentModalProps {
  isOpen: boolean
  onAccept: () => void
  onReject: () => void
  message: EmailMessage
  redactedMessage: EmailMessage
  redactionSummary: string
  provider: string
  estimatedCost?: number
}

export const CloudConsentModal: React.FC<CloudConsentModalProps> = ({
  isOpen,
  onAccept,
  onReject,
  message,
  redactedMessage,
  redactionSummary,
  provider,
  estimatedCost
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [rememberChoice, setRememberChoice] = useState(false)

  if (!isOpen) return null

  const handleAccept = () => {
    if (rememberChoice) {
      // Save user preference to not show consent again
      chrome.storage.local.set({ cloud_consent_given: true })
    }
    onAccept()
  }

  const handleReject = () => {
    if (rememberChoice) {
      // Save user preference to not show consent again
      chrome.storage.local.set({ cloud_consent_given: false })
    }
    onReject()
  }

  return (
    <div className="cloud-consent-overlay">
      <div className="cloud-consent-modal">
        <div className="cloud-consent-header">
          <h2>Cloud Processing Consent</h2>
          <div className="provider-badge">
            {provider.toUpperCase()}
          </div>
        </div>

        <div className="cloud-consent-content">
          <div className="consent-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>Privacy Notice:</strong> This email will be sent to {provider} for AI processing using your API key.
            </div>
          </div>

          <div className="email-preview">
            <h3>Email Preview (PII Redacted)</h3>
            <div className="preview-content">
              <div className="preview-field">
                <strong>Subject:</strong> {redactedMessage.subject}
              </div>
              <div className="preview-field">
                <strong>From:</strong> {redactedMessage.from}
              </div>
              <div className="preview-field">
                <strong>To:</strong> {redactedMessage.to.join(', ')}
              </div>
              <div className="preview-field">
                <strong>Body:</strong>
                <div className="preview-body">
                  {redactedMessage.body.substring(0, 200)}
                  {redactedMessage.body.length > 200 && '...'}
                </div>
              </div>
            </div>
          </div>

          <div className="redaction-summary">
            <h4>PII Redaction Applied</h4>
            <p>{redactionSummary}</p>
          </div>

          {estimatedCost && (
            <div className="cost-estimate">
              <h4>Estimated Cost</h4>
              <p>Approximately ${estimatedCost.toFixed(4)} for this analysis</p>
            </div>
          )}

          <div className="consent-details">
            <button
              className="details-toggle"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>

            {showDetails && (
              <div className="details-content">
                <h4>What happens when you consent:</h4>
                <ul>
                  <li>Your email content (with PII redacted) will be sent to {provider}</li>
                  <li>The AI will analyze your email and generate insights</li>
                  <li>Results will be returned to your browser and stored locally</li>
                  <li>No data will be stored on our servers</li>
                  <li>Your API key is used directly - we never see it</li>
                </ul>

                <h4>Your data protection:</h4>
                <ul>
                  <li>Personal information is automatically redacted</li>
                  <li>Only the content you see above is sent to the cloud</li>
                  <li>Your API key remains encrypted on your device</li>
                  <li>You can revoke access anytime in settings</li>
                </ul>

                <h4>Cost information:</h4>
                <ul>
                  <li>You pay directly to {provider} for API usage</li>
                  <li>We don't charge any fees for cloud processing</li>
                  <li>Typical cost: $0.001 - $0.01 per email</li>
                  <li>You can set spending limits in your {provider} account</li>
                </ul>
              </div>
            )}
          </div>

          <div className="consent-options">
            <label className="remember-choice">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
              />
              <span>Remember my choice for future emails</span>
            </label>
          </div>
        </div>

        <div className="cloud-consent-footer">
          <button
            onClick={handleReject}
            className="reject-button"
          >
            Use Local Processing
          </button>
          <button
            onClick={handleAccept}
            className="accept-button"
          >
            Send to {provider}
          </button>
        </div>
      </div>
    </div>
  )
}
