import { Monitor, Moon, Sun } from 'lucide-react'
import { nextTheme } from '../stores/theme'
import { Button } from './ui/button'
import { useTheme } from './theme-context'

export function ModeToggle() {
  const { theme, resolvedTheme, toggle } = useTheme()
  const next = nextTheme[theme]
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
