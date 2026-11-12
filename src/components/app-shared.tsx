import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Link,
  ScrollRestoration,
  useLocation,
  useMatches,
  useNavigate,
} from 'react-router'
import {
  ArrowRight,
  Bookmark,
  Clock3,
  Heart,
  Leaf,
  Menu,
  Search,
  X,
} from 'lucide-react'
import { useKitchenStore } from '../stores/kitchen'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { ModeToggle } from '../components/mode-toggle'
import type { CatalogRecipe } from '../types/recipe'

const routes = [
  ['Recipes', '/recipes'],
  ['For you', '/foryou'],
  ['Pantry', '/pantry'],
  ['Planner', '/planner'],
  ['Cookbook', '/cookbook'],
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
}: {
  value: string
  mobile?: boolean
}) {
  const [search, setSearch] = useState(value)
  const location = useLocation()
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (search.trim() === value) return
    const timer = window.setTimeout(() => {
      const query = search.trim()
      const params = new URLSearchParams(
        location.pathname === '/recipes' ? location.search : '',
      )
      if (query) params.set('q', query)
      else params.delete('q')
      navigate(`/recipes${params.size ? `?${params}` : ''}`, { replace: true })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search, value, location.pathname, location.search, navigate])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      if (event.key === '/' && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (
        event.key === 'Escape' &&
        document.activeElement === searchRef.current
      )
        searchRef.current?.blur()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])
  return (
    <label
      className={`${mobile ? 'mb-3 flex w-full' : 'ml-auto hidden h-10 w-full max-w-xs sm:flex'} items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground`}>
      <Search size={16} aria-hidden="true" />
      <span className="sr-only">Search recipes</span>
      <input
        ref={searchRef}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search recipes…"
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">
        /
      </kbd>
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
      className="mx-auto flex w-full max-w-7xl items-center gap-2 px-5 pt-5 text-xs text-muted-foreground sm:px-8">
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

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const count = useKitchenStore((state) => state.compare.length)
  const destinations = routes
  useEffect(() => {
    if (!open) return
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [open])

  return (
    <>
      <a
        className="sr-only fixed left-4 top-4 z-[100] rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only"
        href="#main">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-5 sm:px-8">
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-2 font-semibold tracking-tight text-foreground">
            <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
              <Leaf size={19} />
            </span>
            <span>
              food
              <wbr />
              wiki
            </span>
          </Link>
          <nav
            className="hidden items-center gap-5 lg:flex"
            aria-label="Main navigation">
            {routes.slice(0, 5).map(([label, path]) => (
              <Link
                key={path}
                to={path}
                aria-current={location.pathname === path ? 'page' : undefined}
                className={`text-sm transition-colors hover:text-foreground ${location.pathname === path ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </Link>
            ))}
          </nav>
          <GlobalSearch
            key={`${location.pathname}${location.search}`}
            value={new URLSearchParams(location.search).get('q') ?? ''}
          />
          <Link
            className="hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground sm:flex"
            to="/compare"
            aria-label={`Compare tray, ${count} recipes`}>
            <Bookmark size={17} />
            <span>Compare</span>
            <span className="grid min-w-5 place-items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
              {count}
            </span>
          </Link>
          <ModeToggle />
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </header>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] bg-foreground/30 lg:hidden"
            onClick={() => setOpen(false)}>
            <nav
              aria-label="Mobile navigation"
              className="ml-auto flex h-full w-[min(22rem,88vw)] flex-col gap-1 overflow-y-auto bg-background p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <span className="font-heading text-2xl">Where to?</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu">
                  <X />
                </Button>
              </div>
              <GlobalSearch
                mobile
                key={`mobile-${location.pathname}${location.search}`}
                value={new URLSearchParams(location.search).get('q') ?? ''}
              />
              {destinations.map(([label, path]) => (
                <Link
                  key={path}
                  onClick={() => setOpen(false)}
                  to={path}
                  aria-current={location.pathname === path ? 'page' : undefined}
                  className="flex min-h-12 items-center justify-between rounded-lg px-3 text-sm hover:bg-muted">
                  {label}
                  <ArrowRight size={16} />
                </Link>
              ))}
            </nav>
          </div>,
          document.body,
        )}
      <Breadcrumbs />
      {children}
      <footer className="mt-12 border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs text-muted-foreground sm:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-semibold text-foreground">
            <Leaf size={17} />
            foodwiki
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
      {count > 0 && location.pathname !== '/compare' && (
        <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-xl">
          <span className="text-sm font-medium">
            {count} recipe{count === 1 ? '' : 's'} in your compare tray
          </span>
          <Button size="sm" render={<Link to="/compare" />}>
            Compare <ArrowRight />
          </Button>
        </div>
      )}
    </>
  )
}

export function RecipeCard({ item }: { item: CatalogRecipe }) {
  const recipe = item.recipe
  const favorite = useKitchenStore((state) => !!state.favorites[item.id])
  const toggle = useKitchenStore((state) => state.toggleFavorite)
  return (
    <Card className="group/recipe relative overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <Link
        to={`/recipes/${item.id}`}
        className="relative block aspect-[16/10] overflow-hidden bg-muted">
        <img
          className="size-full object-cover transition-transform duration-500 group-hover/recipe:scale-105"
          src={recipe.image}
          alt=""
          loading="lazy"
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium">
          {recipe.cuisine}
        </span>
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        className={`absolute right-3 top-3 rounded-full bg-card/90 text-muted-foreground hover:text-foreground ${favorite ? 'text-rose-700' : ''}`}
        aria-label={favorite ? 'Remove favorite' : 'Add favorite'}
        onClick={() => toggle(item.id)}>
        <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
      </Button>
      <CardContent className="p-4">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {recipe.mealType[0] ?? 'Recipe'} · {recipe.difficulty}
        </div>
        <Link
          to={`/recipes/${item.id}`}
          className="line-clamp-2 font-heading text-xl leading-tight hover:text-primary">
          {recipe.name}
        </Link>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} />
            {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
          </span>
          <span>★ {recipe.rating.toFixed(1)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function PageTitle({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string
  title: string
  sub: string
}) {
  return (
    <header className="mb-8 max-w-3xl">
      <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
        {eyebrow}
      </div>
      <h1 className="font-heading text-4xl leading-[1.05] tracking-tight sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
        {sub}
      </p>
    </header>
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
      className={`mx-auto min-h-[55vh] w-full max-w-7xl px-5 py-10 pb-16 sm:px-8 sm:py-14 ${className}`.trim()}>
      {children}
    </main>
  )
}

export function Empty({ copy }: { copy: string }) {
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border-dashed px-6 py-8 text-center shadow-none">
      <span className="text-3xl" aria-hidden="true">
        📚
      </span>
      <h2 className="font-heading text-2xl">
        A little room for something new.
      </h2>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>
      <Button render={<Link to="/recipes" />}>Browse recipes</Button>
    </Card>
  )
}
