import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../ThemeContext'
import { getEntries, clearEntries, subscribe, LogEntry, LogLevel } from '../logging'
import { Trash2, RefreshCw, Download, Filter } from 'lucide-react'

interface BackendLogEntry {
  id: number
  timestamp: string
  method: string
  path: string
  status: number
  duration_ms: number
  user: string | null
  remote_addr: string
}

type PanelTab = 'frontend' | 'backend'

export default function LoggingPanel() {
  const { t } = useTheme()
  const [activeTab, setActiveTab] = useState<PanelTab>('frontend')
  const [frontendLogs, setFrontendLogs] = useState<LogEntry[]>(getEntries())
  const [backendLogs, setBackendLogs] = useState<BackendLogEntry[]>([])
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastBackendId = useRef(0)

  // Subscribe to frontend log updates
  useEffect(() => {
    const unsub = subscribe(() => {
      setFrontendLogs(getEntries())
    })
    return unsub
  }, [])

  // Poll backend logs
  const fetchBackendLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/logs?since_id=${lastBackendId.current}`)
      if (res.ok) {
        const data = await res.json()
        if (data.entries && data.entries.length > 0) {
          setBackendLogs(prev => {
            const combined = [...prev, ...data.entries]
            // Keep last 500
            return combined.slice(-500)
          })
          lastBackendId.current = data.entries[data.entries.length - 1].id
        }
      }
    } catch {
      // Silently fail - backend may not be reachable
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'backend') {
      fetchBackendLogs()
      pollingRef.current = setInterval(fetchBackendLogs, 3000)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [activeTab, fetchBackendLogs])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [frontendLogs, backendLogs, autoScroll])

  const handleClearFrontend = () => {
    clearEntries()
    setFrontendLogs([])
  }

  const handleClearBackend = async () => {
    try {
      await fetch('/api/logs/clear', { method: 'POST' })
      setBackendLogs([])
      lastBackendId.current = 0
    } catch { /* ignore */ }
  }

  const handleRefresh = () => {
    if (activeTab === 'frontend') {
      setFrontendLogs(getEntries())
    } else {
      lastBackendId.current = 0
      setBackendLogs([])
      fetchBackendLogs()
    }
  }

  const handleExport = () => {
    const data = activeTab === 'frontend' ? frontendLogs : backendLogs
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `organaizer-${activeTab}-logs-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredFrontendLogs = levelFilter === 'all'
    ? frontendLogs
    : frontendLogs.filter(e => e.level === levelFilter)

  const getLevelClass = (level: string): string => {
    switch (level) {
      case 'error': return 'log-error'
      case 'warn': return 'log-warn'
      case 'info': return 'log-info'
      default: return 'log-debug'
    }
  }

  const getStatusClass = (status: number): string => {
    if (status >= 500) return 'log-error'
    if (status >= 400) return 'log-warn'
    return 'log-info'
  }

  return (
    <div className="logging-panel">
      <div className="logging-toolbar">
        <div className="logging-tabs">
          <button
            className={`logging-tab ${activeTab === 'frontend' ? 'active' : ''}`}
            onClick={() => setActiveTab('frontend')}
          >
            {t('logs.frontend')}
          </button>
          <button
            className={`logging-tab ${activeTab === 'backend' ? 'active' : ''}`}
            onClick={() => setActiveTab('backend')}
          >
            {t('logs.backend')}
          </button>
        </div>

        <div className="logging-controls">
          {activeTab === 'frontend' && (
            <select
              className="logging-filter"
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value as LogLevel | 'all')}
            >
              <option value="all">{t('logs.all')}</option>
              <option value="error">{t('logs.errors')}</option>
              <option value="warn">{t('logs.warnings')}</option>
              <option value="info">{t('logs.info')}</option>
              <option value="debug">{t('logs.debug')}</option>
            </select>
          )}
          <button className="icon-btn" onClick={handleRefresh} title={t('logs.refresh')}>
            <RefreshCw size={14} />
          </button>
          <button className="icon-btn" onClick={handleExport} title={t('logs.export')}>
            <Download size={14} />
          </button>
          <button
            className="icon-btn danger"
            onClick={activeTab === 'frontend' ? handleClearFrontend : handleClearBackend}
            title={t('logs.clear')}
          >
            <Trash2 size={14} />
          </button>
          <label className="logging-autoscroll">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
            <span>{t('logs.autoscroll')}</span>
          </label>
        </div>
      </div>

      <div className="logging-body" ref={scrollRef}>
        {activeTab === 'frontend' && (
          filteredFrontendLogs.length === 0 ? (
            <div className="logging-empty">
              <Filter size={20} />
              <p>{t('logs.noEntries')}</p>
            </div>
          ) : (
            <table className="logging-table">
              <thead>
                <tr>
                  <th>{t('logs.time')}</th>
                  <th>{t('logs.level')}</th>
                  <th>{t('logs.source')}</th>
                  <th>{t('logs.message')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredFrontendLogs.map(entry => (
                  <tr key={entry.id} className={getLevelClass(entry.level)}>
                    <td className="log-time">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                    <td><span className={`log-badge ${getLevelClass(entry.level)}`}>{entry.level.toUpperCase()}</span></td>
                    <td className="log-source">{entry.source}</td>
                    <td className="log-message">{entry.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {activeTab === 'backend' && (
          backendLogs.length === 0 ? (
            <div className="logging-empty">
              <Filter size={20} />
              <p>{t('logs.noEntries')}</p>
            </div>
          ) : (
            <table className="logging-table">
              <thead>
                <tr>
                  <th>{t('logs.time')}</th>
                  <th>{t('logs.method')}</th>
                  <th>{t('logs.path')}</th>
                  <th>{t('logs.status')}</th>
                  <th>{t('logs.duration')}</th>
                  <th>{t('logs.user')}</th>
                </tr>
              </thead>
              <tbody>
                {backendLogs.map(entry => (
                  <tr key={entry.id} className={getStatusClass(entry.status)}>
                    <td className="log-time">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                    <td className="log-method">{entry.method}</td>
                    <td className="log-path">{entry.path}</td>
                    <td><span className={`log-badge ${getStatusClass(entry.status)}`}>{entry.status}</span></td>
                    <td className="log-duration">{entry.duration_ms.toFixed(0)}ms</td>
                    <td className="log-user">{entry.user || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}
