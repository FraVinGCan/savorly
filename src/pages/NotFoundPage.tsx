import { Link } from 'react-router'
import {
  BookOpen,
  CalendarDays,
  Compass,
  GitCompare,
  Leaf,
  ShoppingBasket,
  Sparkles,
} from 'lucide-react'
import { useCompareStore } from '../stores/compare'
import { PageLayout } from '../components/app-shared'
import { Badge, ButtonLink } from '../components/primitives'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const DESTINATIONS = [
  {
    label: 'Browse every recipe',
    to: '/recipes',
    icon: Compass,
    hint: 'Search, filter and sort the whole catalogue.',
  },
  {
    label: 'Open For you',
    to: '/foryou',
    icon: Sparkles,
    hint: 'The ranked picks that fit your taste.',
  },
  {
    label: 'Check your pantry',
    to: '/pantry',
    icon: ShoppingBasket,
    hint: 'See what you can cook right now.',
  },
  {
    label: 'Plan the week',
    to: '/planner',
    icon: CalendarDays,
    hint: 'Seven days, one merged shopping list.',
  },
  {
    label: 'Open your cookbook',
    to: '/cookbook',
    icon: BookOpen,
    hint: 'Favourites, notes, ratings and cook history.',
  },
] as const

export default function NotFoundPage() {
  useDocumentTitle('Not found')
  const compareCount = useCompareStore((state) => state.ids.length)
  return (
    <PageLayout className="flex min-h-[60vh] flex-col justify-center gap-8">
      <div className="max-w-2xl">
        <Badge tone="sage" glyph="🍽">
          404 · page not found
        </Badge>
        <h1 className="mt-4 font-heading text-4xl tracking-tight sm:text-5xl">
          This page took a wrong turn.
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
          The link may be old, or the recipe may have been removed. Pick a
          destination and we will get you back to something delicious.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DESTINATIONS.map((destination) => {
          const Icon = destination.icon
          return (
            <Link
              key={destination.to}
              to={destination.to}
              className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/60 transition-transform hover:-translate-y-0.5 hover:shadow-md">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold group-hover:text-primary">
                  {destination.label}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {destination.hint}
                </span>
              </span>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink to="/">
          <Leaf size={16} aria-hidden="true" />
          Back home
        </ButtonLink>
        {compareCount > 0 && (
          <ButtonLink variant="outline" to="/compare">
            <GitCompare size={16} aria-hidden="true" />
            Your compare tray ({compareCount}/4)
          </ButtonLink>
        )}
        {compareCount === 0 && (
          <span className="text-xs text-muted-foreground">
            Your compare tray is empty.
          </span>
        )}
      </div>
    </PageLayout>
  )
}
