import { useEffect, useId, useMemo, useState } from 'react'
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
  ArrowUp,
  GitCompare,
  Leaf,
  Menu,
  Search,
  X,
} from 'lucide-react'
import { useCompareStore } from '../stores/compare'
import { useToastStore } from '../stores/toast'
import { Button } from './ui/button'
import { ProfileMenu } from './profile-menu'
import { ToastViewport } from './ui/toast'
import { ButtonLink } from './primitives'

const primaryNav = [
  ['Recipes', '/recipes'],
  ['For you', '/foryou'],
  ['Pantry', '/pantry'],
  ['Planner', '/planner'],
  ['Cookbook', '/cookbook'],
] as const

const allNav = [
  ...primaryNav,
  ['Insights', '/insights'],
  ['About', '/about'],
] as const

type CrumbHandle = {
  breadcrumb?: string | ((params: Record<string, string | undefined>) => string)
  hideInBreadcrumbs?: boolean
}

function GlobalSearch({
  value,
  mobile = false,
  registerShortcut = true,
  onSearch,
}: {
  value: string
  mobile?: boolean
  registerShortcut?: boolean
  onSearch?: () => void
}) {
  const [search, setSearch] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)
  const location = useLocation()
  const navigate = useNavigate()
  const inputId = useId()
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

  const submitSearch = () => {
    const query = search.trim()
    const params = new URLSearchParams(
      location.pathname === '/recipes' ? location.search : '',
    )
    if (query) params.set('q', query)
    else params.delete('q')
    params.delete('page')
    navigate(`/recipes${params.size ? `?${params}` : ''}`)
    onSearch?.()
  }

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
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        submitSearch()
      }}
      className={`${
        mobile
          ? 'mb-3 flex w-full'
          : 'ml-auto hidden h-10 w-full max-w-xs sm:flex'
      } items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/40`}>
      <label className="sr-only" htmlFor={inputId}>
        Search recipes
      </label>
      <input
        id={inputId}
        ref={inputRef}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search recipes…"
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon-xs"
        aria-label="Search"
        className="text-muted-foreground hover:text-foreground">
        <Search className="size-4" aria-hidden="true" />
      </Button>
      {registerShortcut && (
        <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">
          /
        </kbd>
      )}
    </form>
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
            <GlobalSearch
              mobile
              value={search}
              registerShortcut={false}
              onSearch={() => onOpenChange(false)}
            />
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

function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 80)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  if (!visible) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="fixed bottom-20 right-5 z-40 rounded-full shadow-lg print:hidden sm:right-6"
      aria-label="Back to top"
      onClick={() => {
        const reduced = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
      }}>
      <ArrowUp size={18} aria-hidden="true" />
    </Button>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const navigation = useNavigation()
  const compareCount = useCompareStore((state) => state.ids.length)
  const toastCount = useToastStore((state) => state.toasts.length)
  const search = new URLSearchParams(location.search).get('q') ?? ''
  const showTray = compareCount > 0 && location.pathname !== '/compare'

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
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            to="/compare"
            aria-label={`Compare tray, ${compareCount} of 4 recipes`}>
            <GitCompare size={17} aria-hidden="true" />
            <span className="hidden md:inline">Compare</span>
            <span className="grid min-w-5 place-items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
              {compareCount}
            </span>
          </Link>
          <ProfileMenu />
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
          </div>
        </div>
      </footer>
      <ScrollRestoration />
      <ToastViewport />
      {showTray && (
        <div className="fixed inset-x-4 bottom-4 z-30 mx-auto hidden max-w-md items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xl print:hidden sm:inset-x-auto sm:right-6 sm:flex">
          <span className="text-sm font-medium">
            {compareCount}/4 in your compare tray
          </span>
          <ButtonLink size="sm" to="/compare">
            Compare <ArrowRight />
          </ButtonLink>
        </div>
      )}
      <BackToTop />
    </div>
  )
}

export { RecipeCard, RecipeGrid } from './recipe-card'

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
