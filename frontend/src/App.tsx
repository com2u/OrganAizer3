import { useEffect, useState } from 'react'
import Sidebar, { CategoryKey } from './components/Sidebar'
import TermineView from './components/TermineView'
import AssistentView from './components/AssistentView'
import AufgabenView from './components/AufgabenView'
import SpracheView from './components/SpracheView'
import ConfigView from './components/ConfigView'
import LoginScreen from './components/LoginScreen'
import { fetchMe, getToken, logout as apiLogout } from './api'
import { User } from './types'
import { useTheme } from './ThemeContext'

function App() {
  const [category, setCategory] = useState<CategoryKey>('assistent')
  const [user, setUser] = useState<User | null | undefined>(undefined)
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
  }

  if (user === undefined) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />
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
        {category === 'aufgaben' && <AufgabenView />}
        {category === 'sprache' && <SpracheView />}
        {category === 'settings' && <ConfigView />}
      </main>
    </div>
  )
}

export default App
