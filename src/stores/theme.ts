import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { STORAGE_KEYS } from '../lib/storage'

export type ThemeChoice = 'light' | 'dark' | 'system'
interface ThemeStore {
  theme: ThemeChoice
  setTheme: (theme: ThemeChoice) => void
  toggle: () => void
}
const plainThemeStorage = {
  getItem: () => {
    const theme = localStorage.getItem(STORAGE_KEYS.theme) as ThemeChoice | null
    return theme ? JSON.stringify({ state: { theme } }) : null
  },
  setItem: (_name: string, value: string) => {
    const parsed = JSON.parse(value) as { state?: { theme?: ThemeChoice } }
    if (parsed.state?.theme)
      localStorage.setItem(STORAGE_KEYS.theme, parsed.state.theme)
  },
  removeItem: () => localStorage.removeItem(STORAGE_KEYS.theme),
}
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      toggle: () =>
        set((state) => ({
          theme:
            state.theme === 'light'
              ? 'dark'
              : state.theme === 'dark'
                ? 'system'
                : 'light',
        })),
    }),
    {
      name: STORAGE_KEYS.theme,
      storage: createJSONStorage(() => plainThemeStorage),
    },
  ),
)
