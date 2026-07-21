import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const readTheme = (): Theme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light'

const ThemeProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [theme, setThemeState] = useState<Theme>(readTheme)

  const value = useMemo<ThemeContextValue>(() => {
    const setTheme = (nextTheme: Theme): void => {
      document.documentElement.classList.toggle('dark', nextTheme === 'dark')
      document.documentElement.style.colorScheme = nextTheme
      localStorage.setItem('pasted-theme', nextTheme)
      setThemeState(nextTheme)
    }

    return { theme, setTheme }
  }, [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)

  if (!context) throw new Error('useTheme must be used inside ThemeProvider.')

  return context
}

export default ThemeProvider
