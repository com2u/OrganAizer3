import { User } from '../types'
import { useTheme } from '../ThemeContext'
import { Bot, Calendar, CheckSquare, Mic, Settings, LogOut } from 'lucide-react'

export type CategoryKey =
  | 'assistent'
  | 'termine'
  | 'aufgaben'
  | 'sprache'
  | 'wissen'
  | 'bilder'
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
        <span className="brand-mark">OA</span>
        <span className="brand-text">
          <strong>OrganAIzer</strong>
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
