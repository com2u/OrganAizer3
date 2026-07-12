import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import { Search, Clock, Tag, Loader2, FolderOpen, Calendar } from 'lucide-react'

interface SearchState {
  query: string
  tag: string
  path: string
  date: string
}

export default function WissenView() {
  const { t } = useTheme()
  const [search, setSearch] = useState<SearchState>({ query: '', tag: '', path: '', date: '' })
  const [searchResults, setSearchResults] = useState<Array<{ title: string; path: string; content: string; tags: string[]; date: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'recent' | 'tags'>('search')

  const handleSearch = async () => {
    if (!search.query.trim()) return
    setIsSearching(true)
    setSearchResults([])
    try {
      const params = new URLSearchParams()
      if (search.query) params.append('q', search.query)
      if (search.tag) params.append('tag', search.tag)
      if (search.path) params.append('path', search.path)
      if (search.date) params.append('date', search.date)
      const response = await fetch(`/api/wissen/search?${params}`)
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch {
      setSearchResults([{ title: 'Beispiel-Note 1', path: '/Zettelkasten/Beispiel.md', content: 'Dies ist ein Beispiel-Ergebnis...', tags: ['Beispiel', 'Demo'], date: '2024-01-15' }])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <section className="view wissen-view">
      <header className="view-header">
        <div className="view-title">
          <h2>{t('wissen.title')}</h2>
          <p className="view-sub">{t('wissen.sub')}</p>
        </div>
      </header>

      <div className="wissen-tabs">
        <button className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}><Search size={14} /> {t('wissen.search')}</button>
        <button className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`} onClick={() => setActiveTab('recent')}><Clock size={14} /> {t('wissen.recent')}</button>
        <button className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')}><Tag size={14} /> {t('wissen.tags')}</button>
      </div>

      {activeTab === 'search' && (
        <div className="wissen-search">
          <div className="form-row">
            <div className="form-group">
              <label>{t('wissen.searchTerm')}</label>
              <input type="text" value={search.query} onChange={e => setSearch(prev => ({ ...prev, query: e.target.value }))} placeholder={t('wissen.searchPlaceholder')} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('wissen.tag')}</label>
              <input type="text" value={search.tag} onChange={e => setSearch(prev => ({ ...prev, tag: e.target.value }))} placeholder="#projekt" />
            </div>
            <div className="form-group">
              <label>{t('wissen.path')}</label>
              <input type="text" value={search.path} onChange={e => setSearch(prev => ({ ...prev, path: e.target.value }))} placeholder="Zettelkasten/" />
            </div>
            <div className="form-group">
              <label>{t('wissen.date')}</label>
              <input type="date" value={search.date} onChange={e => setSearch(prev => ({ ...prev, date: e.target.value }))} />
            </div>
          </div>
          <button className="primary-btn" onClick={handleSearch} disabled={isSearching || !search.query.trim()}>
            {isSearching ? <><Loader2 size={14} /> {t('wissen.searching')}</> : <><Search size={14} /> {t('wissen.searchBtn')}</>}
          </button>
          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>{t('wissen.results').replace('{n}', String(searchResults.length))}</h4>
              {searchResults.map((result, i) => (
                <div key={i} className="search-result-card">
                  <h5>{result.title}</h5>
                  <p className="result-content">{result.content}</p>
                  <div className="result-meta">
                    <span className="result-path"><FolderOpen size={12} /> {result.path}</span>
                    <span className="result-date"><Calendar size={12} /> {result.date}</span>
                    <div className="result-tags">{result.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'recent' && (
        <div className="recent-notes" style={{ padding: '24px 28px' }}>
          <p className="empty-state">{t('wissen.noRecent')}</p>
          <p className="hint">{t('wissen.recentHint')}</p>
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="tags-view" style={{ padding: '24px 28px' }}>
          <p className="empty-state">{t('wissen.noTags')}</p>
          <p className="hint">{t('wissen.tagsHint')}</p>
        </div>
      )}
    </section>
  )
}
