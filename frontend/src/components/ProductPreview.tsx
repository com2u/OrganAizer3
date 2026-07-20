import { useTheme } from '../ThemeContext'
import { Bot, Calendar, CheckSquare, Cable, Mic, BookOpen, Users, ClipboardList } from 'lucide-react'

export default function ProductPreview() {
  const { t } = useTheme()

  const navItems = [
    { icon: Bot, label: t('nav.assistent'), active: true },
    { icon: Calendar, label: t('nav.termine'), active: false },
    { icon: Users, label: t('nav.ressourcen'), active: false },
    { icon: ClipboardList, label: t('nav.planung'), active: false },
    { icon: CheckSquare, label: t('nav.aufgaben'), active: false },
    { icon: Mic, label: t('nav.sprache'), active: false },
    { icon: BookOpen, label: t('nav.wissen'), active: false },
    { icon: Cable, label: t('nav.ki_verbindung'), active: false },
  ]

  return (
    <div className="preview-shell" role="img" aria-label={t('landing.preview.label')}>
      {/* Sidebar mock */}
      <div className="preview-sidebar">
        <div className="preview-brand">
          <img src="/organaizer.png" alt="" className="brand-mark" aria-hidden="true" />
          <span className="preview-brand-text">OrganAIzer</span>
        </div>
        <ul className="preview-nav" aria-hidden="true">
          {navItems.map((item, i) => {
            const Icon = item.icon
            return (
              <li key={i} className={`preview-nav-item ${item.active ? 'active' : ''}`}>
                <Icon size={14} />
                <span>{item.label}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Main area mock */}
      <div className="preview-main">
        <div className="preview-header">
          <div className="preview-header-dot" />
          <div className="preview-header-bar" />
          <div className="preview-header-bar short" />
        </div>
        <div className="preview-content">
          {/* Chat-like assistant mock */}
          <div className="preview-chat-bubble assistant">
            <div className="preview-line w80" />
            <div className="preview-line w60" />
          </div>
          <div className="preview-chat-bubble user">
            <div className="preview-line w40" />
          </div>
          <div className="preview-chat-bubble assistant">
            <div className="preview-line w90" />
            <div className="preview-line w70" />
            <div className="preview-line w50" />
          </div>
        </div>
        <div className="preview-input-bar">
          <div className="preview-input-mock" />
        </div>
      </div>

      {/* Overlay label */}
      <div className="preview-label">{t('landing.preview.label')}</div>
    </div>
  )
}
