import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  NavLink,
  ScrollRestoration,
  useLocation,
  useMatches,
  useNavigate,
  useNavigation,
} from 'react-router'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import {
  ArrowRight,
  Bookmark,
  Clock3,
  GitCompare,
  Heart,
  Leaf,
  Menu,
  Search,
  Star,
  X,
} from 'lucide-react'
import { useCompareStore } from '../stores/compare'
import { useCookbookStore } from '../stores/cookbook'
import { useToastStore, toast } from '../stores/toast'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { ModeToggle } from './mode-toggle'
import { ToastViewport } from './ui/toast'
import { Badge, ButtonLink, ScorePill } from './primitives'
import type { CatalogRecipe } from '../types/recipe'
import type { RecipeEvaluation } from '../domain/scoring'

const primaryNav = [
  ['Recipes', '/recipes'],
  ['For you', '/foryou'],
  ['Pantry', '/pantry'],
  ['Planner', '/planner'],
  ['Cookbook', '/cookbook'],
] as const

const allNav = [
  ...primaryNav,
  ['Compare', '/compare'],
  ['Insights', '/insights'],
  ['Profile', '/profile'],
  ['About', '/about'],
  ['Add a recipe', '/creations/new'],
] as const

type CrumbHandle = {
  breadcrumb?: string | ((params: Record<string, string | undefined>) => string)
  hideInBreadcrumbs?: boolean
}

function GlobalSearch({
  value,
  mobile = false,
  registerShortcut = true,
}: {
  value: string
  mobile?: boolean
  registerShortcut?: boolean
}) {
  const [search, setSearch] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)
  const location = useLocation()
  const navigate = useNavigate()
  const inputRef = useMemo(
    () => ({ current: null as HTMLInputElement | null }),
    [],
  )
  // A new URL query (back button, shared link) wins over stale local typing.
  // Adjusting during render keeps focus, unlike a keyed remount or an effect.
  if (value !== syncedValue) {
    setSyncedValue(value)
    setSearch(value)
  }
  useEffect(() => {
    if (search.trim() === value) return
    const timer = window.setTimeout(() => {
      const query = search.trim()
      const params = new URLSearchParams(
        location.pathname === '/recipes' ? location.search : '',
      )
      if (query) params.set('q', query)
      else params.delete('q')
      params.delete('page')
      navigate(`/recipes${params.size ? `?${params}` : ''}`, { replace: true })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search, value, location.pathname, location.search, navigate])
  useEffect(() => {
    if (!registerShortcut) return
    const keydown = (event: KeyboardEvent) => {
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        inputRef.current?.focus()
      }
      if (event.key === 'Escape' && document.activeElement === inputRef.current)
        inputRef.current?.blur()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [inputRef, registerShortcut])
  return (
    <label
      className={`${
        mobile
          ? 'mb-3 flex w-full'
          : 'ml-auto hidden h-10 w-full max-w-xs sm:flex'
      } items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/40`}>
      <Search size={16} aria-hidden="true" />
      <span className="sr-only">Search recipes</span>
      <input
        ref={inputRef}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search recipes…"
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      {registerShortcut && (
        <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">
          /
        </kbd>
      )}
    </label>
  )
}

function Breadcrumbs() {
  const matches = useMatches()
  const crumbs = matches.flatMap((match) => {
    const handle = match.handle as CrumbHandle | undefined
    if (!handle?.breadcrumb || handle.hideInBreadcrumbs) return []
    const label =
      typeof handle.breadcrumb === 'function'
        ? handle.breadcrumb(match.params)
        : handle.breadcrumb
    return [{ href: match.pathname, label }]
  })
  if (crumbs.length < 2) return null
  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-5 pt-5 text-xs text-muted-foreground sm:px-8">
      {crumbs.map((crumb, index) => (
        <span className="inline-flex items-center gap-2" key={crumb.href}>
          {index > 0 && <span aria-hidden="true">/</span>}
          {index === crumbs.length - 1 ? (
            <span aria-current="page" className="font-medium text-foreground">
              {crumb.label}
            </span>
          ) : (
            <Link className="hover:text-foreground" to={crumb.href}>
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}

function MobileDrawer({
  open,
  onOpenChange,
  search,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  search: string
}) {
  const location = useLocation()
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[90] bg-foreground/35 backdrop-blur-[2px] transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 lg:hidden" />
        <DialogPrimitive.Viewport className="fixed inset-0 z-[95] lg:hidden">
          <DialogPrimitive.Popup className="ml-auto flex h-full w-[min(22rem,88vw)] flex-col gap-1 overflow-y-auto bg-background p-5 shadow-2xl ring-1 ring-border transition-transform data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full">
            <div className="mb-4 flex items-center justify-between">
              <DialogPrimitive.Title className="font-heading text-2xl">
                Where to?
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close menu"
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <X className="size-4" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>
            <GlobalSearch mobile value={search} registerShortcut={false} />
            <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
              {allNav.map(([label, path]) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => onOpenChange(false)}
                  aria-current={location.pathname === path ? 'page' : undefined}
                  className="flex min-h-12 items-center justify-between rounded-lg px-3 text-sm hover:bg-muted aria-[current=page]:bg-secondary aria-[current=page]:font-semibold">
                  {label}
                  <ArrowRight size={16} aria-hidden="true" />
                </NavLink>
              ))}
            </nav>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const navigation = useNavigation()
  const compareCount = useCompareStore((state) => state.ids.length)
  const toastCount = useToastStore((state) => state.toasts.length)
  const search = new URLSearchParams(location.search).get('q') ?? ''

  // The tray is fixed and global; nudging a toast when it changes would be
  // noise, but the store subscription keeps the badge fresh across tabs.
  void toastCount

  return (
    <div className="flex min-h-screen flex-col">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {navigation.state !== 'idle' && (
        <div
          className="fixed inset-x-0 top-0 z-[80] h-1 animate-pulse bg-primary print:hidden"
          role="progressbar"
          aria-label="Loading page"
          aria-valuetext="Loading"
        />
      )}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-5 sm:px-8">
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-2 font-semibold tracking-tight text-foreground">
            <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
              <Leaf size={19} aria-hidden="true" />
            </span>
            <span>Savorly</span>
          </Link>
          <nav
            className="hidden items-center gap-5 lg:flex"
            aria-label="Main navigation">
            {primaryNav.map(([label, path]) => (
              <NavLink
                key={path}
                to={path}
                aria-current={location.pathname === path ? 'page' : undefined}
                className={({ isActive }) =>
                  `text-sm transition-colors hover:text-foreground ${
                    isActive || location.pathname === path
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                  }`
                }>
                {label}
              </NavLink>
            ))}
          </nav>
          <GlobalSearch value={search} registerShortcut={!drawerOpen} />
          <Link
            className="hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground sm:flex"
            to="/compare"
            aria-label={`Compare tray, ${compareCount} of 4 recipes`}>
            <Bookmark size={17} aria-hidden="true" />
            <span className="hidden md:inline">Compare</span>
            <span className="grid min-w-5 place-items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
              {compareCount}
            </span>
          </Link>
          <ModeToggle />
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}>
            <Menu />
          </Button>
        </div>
      </header>
      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        search={search}
      />
      <Breadcrumbs />
      <div className="flex-1">{children}</div>
      <footer className="mt-auto border-t border-border bg-card print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs text-muted-foreground sm:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-semibold text-foreground">
            <Leaf size={17} aria-hidden="true" />
            Savorly
          </Link>
          <span>
            Made for the way you cook. Your kitchen data stays on this device.
          </span>
          <div className="flex flex-wrap gap-4">
            <Link to="/about">About</Link>
            <Link to="/insights">Insights</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/creations/new">Add a recipe</Link>
          </div>
        </div>
      </footer>
      <ScrollRestoration />
      <ToastViewport />
      {compareCount > 0 && location.pathname !== '/compare' && (
        <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xl print:hidden sm:inset-x-auto sm:right-6">
          <span className="text-sm font-medium">
            {compareCount}/4 in your compare tray
          </span>
          <ButtonLink size="sm" to="/compare">
            Compare <ArrowRight />
          </ButtonLink>
        </div>
      )}
    </div>
  )
}

export function RecipeCard({
  item,
  evaluation,
  score,
}: {
  item: CatalogRecipe
  evaluation?: RecipeEvaluation
  score?: number
}) {
  const recipe = item.recipe
  const favorite = useCookbookStore((state) =>
    Boolean(state.favorites[item.id]),
  )
  const toggle = useCookbookStore((state) => state.toggleFavorite)
  const cooked = useCookbookStore((state) => state.cooked[item.id]?.count ?? 0)
  return (
    <Card className="group/recipe relative gap-3 overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <Link
        to={`/recipes/${item.id}`}
        className="relative block aspect-[16/10] overflow-hidden bg-muted">
        <img
          className="size-full object-cover transition-transform duration-500 group-hover/recipe:scale-105"
          src={recipe.image}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.visibility = 'hidden'
          }}
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium">
          {recipe.cuisine}
        </span>
        {item.source === 'mine' && (
          <Badge tone="dark" className="absolute bottom-3 right-3 text-[10px]">
            Your recipe
          </Badge>
        )}
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute right-3 top-3 rounded-full bg-card/90 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={
          favorite
            ? `Remove ${recipe.name} from favourites`
            : `Save ${recipe.name} to favourites`
        }
        aria-pressed={favorite}
        onClick={() => {
          toggle(item.id)
          toast.success(
            favorite ? 'Removed from favourites' : 'Saved to favourites',
            recipe.name,
          )
        }}>
        <Heart
          size={17}
          fill={favorite ? 'currentColor' : 'none'}
          className={favorite ? 'text-rose-700 dark:text-rose-300' : undefined}
        />
      </Button>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {recipe.mealType[0] ?? 'Recipe'} · {recipe.difficulty}
          </div>
          {(evaluation || typeof score === 'number') && (
            <ScorePill
              score={evaluation?.score ?? score ?? 0}
              eligible={evaluation?.eligible ?? true}
            />
          )}
        </div>
        <Link
          to={`/recipes/${item.id}`}
          className="line-clamp-2 font-heading text-xl leading-tight hover:text-primary">
          {recipe.name}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} aria-hidden="true" />
            {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star size={13} className="text-amber-600" aria-hidden="true" />
            {recipe.rating.toFixed(1)}
            {cooked > 0 && (
              <span className="text-[10px]">· cooked {cooked}×</span>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function RecipeGrid({
  items,
  evaluations,
  scores,
}: {
  items: CatalogRecipe[]
  evaluations?: Map<string, RecipeEvaluation>
  scores?: Map<string, number>
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <RecipeCard
          key={item.id}
          item={item}
          evaluation={evaluations?.get(item.id)}
          score={scores?.get(item.id)}
        />
      ))}
    </div>
  )
}

export function PageLayout({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <main
      id="main"
      className={`mx-auto min-h-[55vh] w-full max-w-7xl px-5 py-10 pb-16 sm:px-8 sm:py-12 ${className}`.trim()}>
      {children}
    </main>
  )
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
  icon,
  children,
}: {
  eyebrow: string
  title: string
  sub: string
  actions?: React.ReactNode
  icon?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {icon ?? (
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-primary"
              />
            )}
            {eyebrow}
          </div>
          <h1 className="font-heading text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {sub}
          </p>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {actions}
          </div>
        )}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </header>
  )
}

/** Keep the old name working for pages that only need a title block. */
export const PageTitle = PageHeader

export function CompareLink() {
  const count = useCompareStore((state) => state.ids.length)
  return (
    <Link
      to="/compare"
      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
      <GitCompare size={16} aria-hidden="true" />
      Compare tray ({count}/4)
    </Link>
  )
}
