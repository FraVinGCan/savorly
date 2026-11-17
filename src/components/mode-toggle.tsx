import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { useTheme } from './theme-context'

const nextLabel = { light: 'dark', dark: 'system', system: 'light' } as const

export function ModeToggle() {
  const { theme, resolvedTheme, toggle } = useTheme()
  const next = nextLabel[theme]
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      title={`Theme: ${theme} (${resolvedTheme}) — switch to ${next}`}>
      <Icon size={18} aria-hidden="true" />
    </Button>
  )
}
