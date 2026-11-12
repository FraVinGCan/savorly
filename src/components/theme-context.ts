import { createContext, useContext } from 'react'
import type { ThemeChoice } from '../stores/theme'

export interface ThemeContextValue {
  theme: ThemeChoice
  setTheme: (theme: ThemeChoice) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
