import { useState, useCallback, useRef } from 'react'
import { useTheme } from '../ThemeContext'
import { ExternalLink, Terminal, AlertTriangle, RefreshCw } from 'lucide-react'
import { logIframe } from '../logging'

const ASSISTANT_URL =
  import.meta.env.VITE_ASSISTANT_URL ?? 'https://openwebui.ai-server.org/'

type IframeState = 'loading' | 'ready' | 'error'

export default function AssistentView() {
  const { t } = useTheme()
  const [iframeState, setIframeState] = useState<IframeState>('loading')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadStartRef = useRef<number>(Date.now())

  const handleLoad = useCallback(() => {
    const duration = Date.now() - loadStartRef.current
    setIframeState('ready')
    logIframe('info', `OpenWebUI iframe loaded successfully (${duration}ms)`, {
      url: ASSISTANT_URL,
      duration_ms: duration,
    })
  }, [])

  const handleError = useCallback(() => {
    setIframeState('error')
    logIframe('error', 'OpenWebUI iframe failed to load', {
      url: ASSISTANT_URL,
    })
  }, [])

  const handleRetry = () => {
    setIframeState('loading')
    loadStartRef.current = Date.now()
    logIframe('info', 'Retrying OpenWebUI iframe load', { url: ASSISTANT_URL })
    if (iframeRef.current) {
      iframeRef.current.src = ASSISTANT_URL
    }
  }

  return (
    <section className="view assistant-view">
      <header className="assistant-shell-header">
        <div className="assistant-heading">
          <div className="assistant-logo"><Terminal size={18} /></div>
          <div>
            <div className="assistant-kicker">{t('assistant.workspace')}</div>
            <h2>{t('assistant.title')}</h2>
            <p>{t('assistant.sub')}</p>
          </div>
        </div>
        <div className="assistant-shell-actions">
          <span className="assistant-status">
            <span className={`dot ${iframeState === 'error' ? 'dot-error' : iframeState === 'loading' ? 'dot-loading' : ''}`} />
            {iframeState === 'ready' && t('assistant.connected')}
            {iframeState === 'loading' && t('loading')}
            {iframeState === 'error' && t('assistant.error')}
          </span>
          <a className="assistant-open-btn" href={ASSISTANT_URL} target="_blank" rel="noreferrer">
            {t('assistant.open')} <ExternalLink size={12} />
          </a>
        </div>
      </header>

      <div className="assistant-workspace">
        <div className="assistant-contextbar">
          <div className="assistant-context-title">
            <span className="context-icon"><Terminal size={12} /></span>
            <span>{t('assistant.chat')}</span>
          </div>
          <span className="assistant-context-hint">{t('assistant.chatHint')}</span>
        </div>
        <div className="assistant-body">
          {iframeState === 'loading' && (
            <div className="iframe-loading-overlay">
              <div className="spinner" />
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{t('assistant.loading')}</p>
            </div>
          )}
          {iframeState === 'error' && (
            <div className="iframe-error-overlay">
              <AlertTriangle size={32} />
              <p>{t('assistant.loadError')}</p>
              <p className="error-hint">{t('assistant.loadErrorHint')}</p>
              <button className="btn-secondary" onClick={handleRetry}>
                <RefreshCw size={14} /> {t('assistant.retry')}
              </button>
            </div>
          )}
          <iframe
            ref={iframeRef}
            title={t('assistant.title')}
            src={ASSISTANT_URL}
            className="assistant-frame"
            allow="clipboard-read; clipboard-write; microphone; camera; autoplay"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      </div>
    </section>
  )
}
