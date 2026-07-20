import { useEffect, useState } from 'react'
import Sidebar, { CategoryKey } from './components/Sidebar'
import TermineView from './components/TermineView'
import AssistentView from './components/AssistentView'
import AufgabenView from './components/AufgabenView'
import SpracheView from './components/SpracheView'
import WissenView from './components/WissenView'
import TelefonieView from './components/TelefonieView'
import RessourcenView from './components/RessourcenView'
import PlanungView from './components/PlanungView'
import KIVerbindungView from './components/KIVerbindungView'
import VerbindungenView from './components/VerbindungenView'
import ConfigView from './components/ConfigView'
import LoginScreen from './components/LoginScreen'
import LandingPage from './components/LandingPage'
import { fetchMe, getToken, logout as apiLogout } from './api'
import { User } from './types'
import { useTheme } from './ThemeContext'

type PublicView = 'landing' | 'login'

function App() {
  const [category, setCategory] = useState<CategoryKey>('assistent')
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [publicView, setPublicView] = useState<PublicView>('landing')
  const { t } = useTheme()

  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  useEffect(() => {
    const handleExpired = () => setUser(null)
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [])

  const handleLogout = () => {
    apiLogout()
    setUser(null)
    setPublicView('landing')
  }

  if (user === undefined) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    if (publicView === 'login') {
      return <LoginScreen onLogin={setUser} onBack={() => setPublicView('landing')} />
    }
    return <LandingPage onGoToLogin={() => setPublicView('login')} />
  }

  void t // suppress unused

  return (
    <div className="app-shell">
      <Sidebar
        active={category}
        onSelect={setCategory}
        user={user}
        onLogout={handleLogout}
      />

      <main className="main-area">
        {category === 'assistent' && <AssistentView />}
        {category === 'termine' && <TermineView />}
        {category === 'ressourcen' && <RessourcenView />}
        {category === 'planung' && <PlanungView />}
        {category === 'aufgaben' && <AufgabenView />}
        {category === 'sprache' && <SpracheView />}
        {category === 'wissen' && <WissenView />}
        {category === 'telefonie' && <TelefonieView />}
        {category === 'ki_verbindung' && <KIVerbindungView />}
        {category === 'verbindungen' && <VerbindungenView />}
        {category === 'settings' && <ConfigView />}
      </main>
    </div>
  )
}

export default App
