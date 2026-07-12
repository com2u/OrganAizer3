import { useTheme } from '../ThemeContext'
import { ExternalLink, Terminal } from 'lucide-react'

const ASSISTANT_URL =
  import.meta.env.VITE_ASSISTANT_URL ?? 'https://openwebui.ai-server.org/'

export default function AssistentView() {
  const { t } = useTheme()

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
          <span className="assistant-status"><span className="dot" /> {t('assistant.connected')}</span>
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
          <iframe
            title={t('assistant.title')}
            src={ASSISTANT_URL}
            className="assistant-frame"
            allow="clipboard-read; clipboard-write; microphone; camera; autoplay"
          />
        </div>
      </div>
    </section>
  )
}
