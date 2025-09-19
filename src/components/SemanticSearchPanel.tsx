import React, { useState, useEffect } from 'react'
import { SimilarityResult, SearchQuery } from '@/types'

interface SemanticSearchPanelProps {
  onSearch: (query: SearchQuery) => Promise<SimilarityResult[]>
  onMessageSelect: (messageId: string) => void
  isSearching: boolean
}

export const SemanticSearchPanel: React.FC<SemanticSearchPanelProps> = ({
  onSearch,
  onMessageSelect,
  isSearching
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SimilarityResult[]>([])
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [filters, setFilters] = useState({
    category: '',
    sender: '',
    dateRange: {
      start: '',
      end: ''
    },
    threshold: 0.3,
    limit: 10
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchStats, setSearchStats] = useState<{
    totalFound: number
    processingTime: number
  } | null>(null)

  useEffect(() => {
    // Load search history from storage
    loadSearchHistory()
  }, [])

  const loadSearchHistory = async () => {
    try {
      const stored = await chrome.storage.local.get(['searchHistory'])
      if (stored.searchHistory) {
        setSearchHistory(stored.searchHistory)
      }
    } catch (error) {
      console.error('ReplySage: Failed to load search history:', error)
    }
  }

  const saveSearchHistory = async (query: string) => {
    try {
      const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10)
      setSearchHistory(newHistory)
      await chrome.storage.local.set({ searchHistory: newHistory })
    } catch (error) {
      console.error('ReplySage: Failed to save search history:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const query: SearchQuery = {
        text: searchQuery.trim(),
        limit: filters.limit,
        threshold: filters.threshold,
        category: filters.category || undefined,
        sender: filters.sender || undefined,
        dateRange: (filters.dateRange.start && filters.dateRange.end) ? {
          start: new Date(filters.dateRange.start),
          end: new Date(filters.dateRange.end)
        } : undefined
      }

      const results = await onSearch(query)
      setSearchResults(results)
      await saveSearchHistory(searchQuery)
    } catch (error) {
      console.error('ReplySage: Search failed:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleResultClick = (result: SimilarityResult) => {
    onMessageSelect(result.messageId)
  }

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setSearchStats(null)
  }

  const formatSimilarity = (similarity: number): string => {
    return `${Math.round(similarity * 100)}%`
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString()
  }

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.8) return 'text-green-600 bg-green-50'
    if (similarity >= 0.6) return 'text-yellow-600 bg-yellow-50'
    if (similarity >= 0.4) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'urgent': return '🚨'
      case 'important': return '⭐'
      case 'meeting': return '📅'
      case 'project': return '📁'
      case 'personal': return '👤'
      case 'work': return '💼'
      default: return '📝'
    }
  }

  return (
    <div className="semantic-search-panel">
      <div className="panel-header">
        <h3>Semantic Search</h3>
        <div className="panel-controls">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="filter-button"
            title="Toggle filters"
          >
            🔍
          </button>
          <button
            onClick={clearSearch}
            className="clear-button"
            title="Clear search"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="search-section">
        <div className="search-input-container">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search emails by meaning, not just keywords..."
            className="search-input"
            disabled={isSearching}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="search-button"
          >
            {isSearching ? '⏳' : '🔍'}
          </button>
        </div>

        {searchHistory.length > 0 && (
          <div className="search-history">
            <div className="history-label">Recent searches:</div>
            <div className="history-tags">
              {searchHistory.slice(0, 5).map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(query)}
                  className="history-tag"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="filters-section">
          <div className="filter-row">
            <div className="filter-group">
              <label>Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="filter-select"
              >
                <option value="">All Categories</option>
                <option value="urgent">🚨 Urgent</option>
                <option value="important">⭐ Important</option>
                <option value="meeting">📅 Meeting</option>
                <option value="project">📁 Project</option>
                <option value="personal">👤 Personal</option>
                <option value="work">💼 Work</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sender</label>
              <input
                type="text"
                value={filters.sender}
                onChange={(e) => setFilters(prev => ({ ...prev, sender: e.target.value }))}
                placeholder="Filter by sender..."
                className="filter-input"
              />
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>Date Range</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="date-input"
                />
                <span>to</span>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="date-input"
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Similarity Threshold</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.threshold}
                onChange={(e) => setFilters(prev => ({ ...prev, threshold: parseFloat(e.target.value) }))}
                className="threshold-slider"
              />
              <span className="threshold-value">{formatSimilarity(filters.threshold)}</span>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>Max Results</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                className="filter-select"
              >
                <option value={5}>5 results</option>
                <option value={10}>10 results</option>
                <option value={20}>20 results</option>
                <option value={50}>50 results</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {searchStats && (
        <div className="search-stats">
          <span>Found {searchStats.totalFound} results in {searchStats.processingTime}ms</span>
        </div>
      )}

      <div className="results-section">
        {searchResults.length === 0 ? (
          <div className="no-results">
            <p>No results found. Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="results-list">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="result-item"
                onClick={() => handleResultClick(result)}
              >
                <div className="result-header">
                  <div className="result-meta">
                    <span className="result-sender">{result.metadata.sender}</span>
                    <span className="result-date">{formatDate(result.metadata.timestamp)}</span>
                    {result.metadata.category && (
                      <span className="result-category">
                        {getCategoryIcon(result.metadata.category)} {result.metadata.category}
                      </span>
                    )}
                  </div>
                  <div className="result-similarity">
                    <span className={`similarity-badge ${getSimilarityColor(result.similarity)}`}>
                      {formatSimilarity(result.similarity)}
                    </span>
                  </div>
                </div>
                
                <div className="result-content">
                  <div className="result-subject">{result.metadata.subject}</div>
                  <div className="result-text">{result.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
