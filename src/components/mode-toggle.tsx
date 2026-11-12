import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { useTheme } from './theme-context'

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const nextTheme =
    theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="theme-toggle"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch theme from ${theme} to ${nextTheme}`}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  )
}
