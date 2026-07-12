import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Theme, Lang, getStoredTheme, setStoredTheme, getStoredLang, setStoredLang, applyTheme, t as translate } from './i18n'

interface ThemeCtx {
  theme: Theme
  lang: Lang
  setTheme: (t: Theme) => void
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const Ctx = createContext<ThemeCtx>({
  theme: 'dark',
  lang: 'de',
  setTheme: () => {},
  setLang: () => {},
  t: (k) => k,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [lang, setLangState] = useState<Lang>(getStoredLang)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = (t: Theme) => { setThemeState(t); setStoredTheme(t) }
  const setLang = (l: Lang) => { setLangState(l); setStoredLang(l) }
  const t = (key: string) => translate(key, lang)

  return <Ctx.Provider value={{ theme, lang, setTheme, setLang, t }}>{children}</Ctx.Provider>
}

export function useTheme() { return useContext(Ctx) }
