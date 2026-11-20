import { Link } from 'react-router'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import {
  ChefHat,
  CircleUserRound,
  Heart,
  Monitor,
  Moon,
  Plus,
  Sun,
} from 'lucide-react'
import { nextTheme } from '../stores/theme'
import { Button } from './ui/button'
import { useTheme } from './theme-context'

const itemClass =
  'flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-muted focus-visible:bg-muted'

const menuLinks = [
  { label: 'Profile page', to: '/profile', icon: CircleUserRound },
  { label: 'Favourites', to: '/cookbook?tab=saved', icon: Heart },
  { label: 'Create recipe', to: '/creations/new', icon: Plus },
  { label: 'My recipes', to: '/cookbook?tab=mine', icon: ChefHat },
] as const

function ThemeMenuItem() {
  const { theme, resolvedTheme, toggle } = useTheme()
  const next = nextTheme[theme]
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <MenuPrimitive.Item
      onClick={toggle}
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      title={`Theme: ${theme} (${resolvedTheme}) — switch to ${next}`}
      className={itemClass}>
      <Icon size={16} aria-hidden="true" />
      <span className="flex-1">Theme toggle</span>
      <span className="text-xs capitalize text-muted-foreground">{theme}</span>
    </MenuPrimitive.Item>
  )
}

export function ProfileMenu() {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        render={
          <Button variant="outline" size="icon" aria-label="Open profile menu">
            <CircleUserRound size={18} aria-hidden="true" />
          </Button>
        }
      />
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="end" sideOffset={8} className="z-50">
          <MenuPrimitive.Popup
            aria-label="Profile actions"
            className="min-w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg">
            {menuLinks.map(({ label, to, icon: Icon }) => (
              <MenuPrimitive.Item
                key={label}
                render={<Link to={to} />}
                className={itemClass}>
                <Icon size={16} aria-hidden="true" />
                {label}
              </MenuPrimitive.Item>
            ))}
            <div
              role="separator"
              className="my-1 h-px bg-border"
              aria-orientation="horizontal"
            />
            <ThemeMenuItem />
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  )
}
