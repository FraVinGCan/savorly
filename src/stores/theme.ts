import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '../lib/storage'

export type ThemeChoice = 'light' | 'dark' | 'system'

export const THEME_CHOICES: ThemeChoice[] = ['light', 'dark', 'system']

export const nextTheme: Record<ThemeChoice, ThemeChoice> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

export const isThemeChoice = (value: unknown): value is ThemeChoice =>
  value === 'light' || value === 'dark' || value === 'system'

interface ThemeStore {
  theme: ThemeChoice
  setTheme: (theme: ThemeChoice) => void
  toggle: () => void
}

interface ThemeData {
  theme: ThemeChoice
}

/** The stored value is unquoted so the inline bootstrap script can read it. */
const plainThemeStorage = {
  getItem: () => {
    let theme: string | null
    try {
      theme = localStorage.getItem(STORAGE_KEYS.theme)
    } catch {
      theme = null
    }
    return JSON.stringify({
      state: { theme: isThemeChoice(theme) ? theme : 'system' },
    })
  },
  setItem: (_name: string, value: string) => {
    try {
      const parsed = JSON.parse(value) as { state?: ThemeData }
      if (isThemeChoice(parsed.state?.theme))
        localStorage.setItem(STORAGE_KEYS.theme, parsed.state.theme)
    } catch {
      // A malformed write leaves the previous valid theme in place.
    }
  },
  removeItem: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.theme)
    } catch {
      // Storage unavailable; nothing to remove.
    }
  },
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) =>
        set({ theme: isThemeChoice(theme) ? theme : 'system' }),
      toggle: () =>
        set((state) => ({ theme: nextTheme[state.theme] })),
    }),
    {
      name: STORAGE_KEYS.theme,
      storage: createJSONStorage(() => plainThemeStorage),
      partialize: (state): ThemeData => ({ theme: state.theme }),
      merge: (persisted, current) => {
        const theme = (persisted as ThemeData | undefined)?.theme
        return { ...current, theme: isThemeChoice(theme) ? theme : 'system' }
      },
    },
  ),
)

export const resolvedTheme = (
  theme: ThemeChoice,
  prefersDark: boolean,
): 'light' | 'dark' =>
  theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
