import { User } from '../types'
import { useTheme } from '../ThemeContext'
import { Bot, Calendar, CheckSquare, Mic, BookOpen, Phone, Settings, LogOut, Users, ClipboardList, Cable, Plug } from 'lucide-react'

export type CategoryKey =
  | 'assistent'
  | 'termine'
  | 'ressourcen'
  | 'planung'
  | 'aufgaben'
  | 'sprache'
  | 'wissen'
  | 'telefonie'
  | 'ki_verbindung'
  | 'verbindungen'
  | 'settings'

interface NavDef {
  key: CategoryKey
  labelKey: string
  hintKey: string
  icon: typeof Bot
}

const CATEGORIES: NavDef[] = [
  { key: 'assistent', labelKey: 'nav.assistent', hintKey: 'nav.assistent.hint', icon: Bot },
  { key: 'termine', labelKey: 'nav.termine', hintKey: 'nav.termine.hint', icon: Calendar },
  { key: 'aufgaben', labelKey: 'nav.aufgaben', hintKey: 'nav.aufgaben.hint', icon: CheckSquare },
  { key: 'sprache', labelKey: 'nav.sprache', hintKey: 'nav.sprache.hint', icon: Mic },
  { key: 'wissen', labelKey: 'nav.wissen', hintKey: 'nav.wissen.hint', icon: BookOpen },
  { key: 'ressourcen', labelKey: 'nav.ressourcen', hintKey: 'nav.ressourcen.hint', icon: Users },
  { key: 'planung', labelKey: 'nav.planung', hintKey: 'nav.planung.hint', icon: ClipboardList },
  { key: 'telefonie', labelKey: 'nav.telefonie', hintKey: 'nav.telefonie.hint', icon: Phone },
  { key: 'verbindungen', labelKey: 'nav.externe_verbindungen', hintKey: 'nav.externe_verbindungen.hint', icon: Plug },
  { key: 'ki_verbindung', labelKey: 'nav.ki_verbindung', hintKey: 'nav.ki_verbindung.hint', icon: Cable },
]

interface SidebarProps {
  active: CategoryKey
  onSelect: (key: CategoryKey) => void
  user: User
  onLogout: () => void
}

export default function Sidebar({ active, onSelect, user, onLogout }: SidebarProps) {
  const { t } = useTheme()
  const displayName = user.name || user.email || 'Benutzer'
  const initials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <img src="/organaizer.png" alt="OrganAIzer" className="brand-mark" />
        <span className="brand-text">
          <strong>OrganAIzer <small className="brand-version">v0.1.5</small></strong>
          <small>AI Workspace</small>
        </span>
      </div>

      <ul className="nav-list">
        {CATEGORIES.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.key}>
              <button
                type="button"
                className={`nav-item ${active === item.key ? 'active' : ''}`}
                onClick={() => onSelect(item.key)}
                title={`${t(item.labelKey)} – ${t(item.hintKey)}`}
              >
                <span className="nav-icon"><Icon size={18} /></span>
                <span className="nav-labels">
                  <span className="nav-label">{t(item.labelKey)}</span>
                  <span className="nav-hint">{t(item.hintKey)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="sidebar-footer">
        <span className="user-avatar">{initials || 'U'}</span>
        <span className="user-meta">
          <strong>{displayName}</strong>
          <small>{user.role || t('sidebar.loggedIn')}</small>
        </span>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onSelect('settings')}
          title={t('nav.settings')}
        >
          <Settings size={16} />
        </button>
        <button
          type="button"
          className="icon-btn danger"
          onClick={onLogout}
          title={t('sidebar.logout')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  )
}
