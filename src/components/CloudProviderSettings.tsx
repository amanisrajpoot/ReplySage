import React, { useState, useEffect } from 'react'
import { CloudProvider } from '@/utils/cloud-apis'

interface CloudProviderSettingsProps {
  isOpen: boolean
  onClose: () => void
  onSave: (provider: CloudProvider) => void
  existingProvider?: CloudProvider
}

export const CloudProviderSettings: React.FC<CloudProviderSettingsProps> = ({
  isOpen,
  onClose,
  onSave,
  existingProvider
}) => {
  const [provider, setProvider] = useState<Partial<CloudProvider>>({
    name: 'openai',
    model: 'gpt-3.5-turbo',
    maxTokens: 1000,
    temperature: 0.7
  })
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (existingProvider) {
      setProvider(existingProvider)
      setApiKey('') // Don't show existing API key
      setBaseUrl(existingProvider.baseUrl || '')
    }
  }, [existingProvider])

  const handleProviderChange = (name: 'openai' | 'anthropic' | 'azure') => {
    const defaultConfigs = {
      openai: {
        name: 'openai' as const,
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.7
      },
      anthropic: {
        name: 'anthropic' as const,
        model: 'claude-3-haiku',
        maxTokens: 1000,
        temperature: 0.7
      },
      azure: {
        name: 'azure' as const,
        model: 'gpt-35-turbo',
        maxTokens: 1000,
        temperature: 0.7,
        baseUrl: 'https://your-resource.openai.azure.com'
      }
    }

    setProvider(defaultConfigs[name])
    setBaseUrl(defaultConfigs[name].baseUrl || '')
  }

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('Please enter an API key')
      return
    }

    const fullProvider: CloudProvider = {
      name: provider.name!,
      apiKey: apiKey.trim(),
      model: provider.model!,
      maxTokens: provider.maxTokens!,
      temperature: provider.temperature!,
      baseUrl: baseUrl.trim() || undefined
    }

    onSave(fullProvider)
  }

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key first' })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const testProvider: CloudProvider = {
        name: provider.name!,
        apiKey: apiKey.trim(),
        model: provider.model!,
        maxTokens: 100,
        temperature: 0.1,
        baseUrl: baseUrl.trim() || undefined
      }

      const response = await chrome.runtime.sendMessage({
        type: 'TEST_CLOUD_PROVIDER',
        payload: testProvider
      })

      if (response.success) {
        setTestResult({ success: true, message: 'Connection successful!' })
      } else {
        setTestResult({ success: false, message: response.error || 'Test failed' })
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Test failed: ' + error.message })
    } finally {
      setIsTesting(false)
    }
  }

  const getModelOptions = () => {
    switch (provider.name) {
      case 'openai':
        return [
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ]
      case 'anthropic':
        return [
          { value: 'claude-3-opus', label: 'Claude 3 Opus' },
          { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
        ]
      case 'azure':
        return [
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' }
        ]
      default:
        return []
    }
  }

  if (!isOpen) return null

  return (
    <div className="cloud-provider-overlay">
      <div className="cloud-provider-modal">
        <div className="cloud-provider-header">
          <h2>{existingProvider ? 'Edit' : 'Add'} Cloud Provider</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="cloud-provider-content">
          <div className="form-group">
            <label htmlFor="provider-name">Provider</label>
            <select
              id="provider-name"
              value={provider.name || ''}
              onChange={(e) => handleProviderChange(e.target.value as any)}
              disabled={!!existingProvider}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="azure">Azure OpenAI</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="api-key">API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${provider.name?.toUpperCase()} API key`}
            />
            <small className="help-text">
              Your API key is encrypted and stored locally. We never see it.
            </small>
          </div>

          {provider.name === 'azure' && (
            <div className="form-group">
              <label htmlFor="base-url">Base URL</label>
              <input
                id="base-url"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://your-resource.openai.azure.com"
              />
              <small className="help-text">
                Your Azure OpenAI endpoint URL
              </small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="model">Model</label>
            <select
              id="model"
              value={provider.model || ''}
              onChange={(e) => setProvider({ ...provider, model: e.target.value })}
            >
              {getModelOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="max-tokens">Max Tokens</label>
              <input
                id="max-tokens"
                type="number"
                value={provider.maxTokens || 1000}
                onChange={(e) => setProvider({ ...provider, maxTokens: parseInt(e.target.value) })}
                min="100"
                max="4000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="temperature">Temperature</label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={provider.temperature || 0.7}
                onChange={(e) => setProvider({ ...provider, temperature: parseFloat(e.target.value) })}
              />
              <div className="range-value">{provider.temperature?.toFixed(1)}</div>
            </div>
          </div>

          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.message}
            </div>
          )}

          <div className="provider-info">
            <h4>Getting API Keys</h4>
            <ul>
              {provider.name === 'openai' && (
                <li>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></li>
              )}
              {provider.name === 'anthropic' && (
                <li>Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Console</a></li>
              )}
              {provider.name === 'azure' && (
                <li>Get your API key from <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer">Azure Portal</a></li>
              )}
            </ul>
          </div>
        </div>

        <div className="cloud-provider-footer">
          <button
            onClick={handleTest}
            disabled={isTesting || !apiKey.trim()}
            className="test-button"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <div className="footer-actions">
            <button onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button onClick={handleSave} className="save-button">
              {existingProvider ? 'Update' : 'Add'} Provider
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
