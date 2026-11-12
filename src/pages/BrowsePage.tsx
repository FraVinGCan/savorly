import { useDeferredValue, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Share2,
} from 'lucide-react'
import {
  applyBrowse,
  catalogFacets,
  PAGE_SIZE,
  activeFilterCount,
  type BrowseState,
} from '../domain/browse'
import type { CatalogRecipe } from '../types/recipe'
import { PageLayout, PageTitle, RecipeCard } from '../components/app-shared'
import {
  NativeSelect,
  NativeSelectOption,
} from '../components/ui/native-select'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { useKitchenStore } from '../stores/kitchen'
import { useTasteSetup } from '../hooks/useTasteSetup'
import { useScoreLookup } from '../hooks/useScoreLookup'

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      className="rounded-full"
      aria-pressed={active}
      onClick={onClick}>
      {children}
    </Button>
  )
}

export default function Browse() {
  const catalog = useOutletContext<CatalogRecipe[]>()
  const [params, setParams] = useSearchParams()
  const [mobileFilters, setMobileFilters] = useState(false)
  const favorites = useKitchenStore((state) => state.favorites)
  const cooked = useKitchenStore((state) => state.cooked)
  const favoriteIds = useMemo(
    () => new Set(Object.keys(favorites) as CatalogRecipe['id'][]),
    [favorites],
  )
  const cookedIds = useMemo(
    () => new Set(Object.keys(cooked) as CatalogRecipe['id'][]),
    [cooked],
  )
  const { ctx } = useTasteSetup()
  const { scores } = useScoreLookup(ctx)
  const facets = useMemo(() => catalogFacets(catalog), [catalog])
  const filters = useMemo<BrowseState>(
    () => ({
      q: params.get('q') ?? '',
      cuisines: params.getAll('cuisine'),
      meals: params.getAll('meal'),
      tags: params.getAll('tag'),
      difficulty: params.get('difficulty') ?? undefined,
      time: Number(params.get('time')) || undefined,
      calories: Number(params.get('calories')) || undefined,
      favorites: params.has('favorites'),
      cooked: params.has('cooked'),
      mine: params.has('mine'),
      sort: params.get('sort') ?? 'recommended',
    }),
    [params],
  )
  const deferredFilters = useDeferredValue(filters)
  const result = applyBrowse(catalog, deferredFilters, {
    favorites: favoriteIds,
    cooked: cookedIds,
    scores,
  })
  const page = Math.max(1, Number(params.get('page')) || 1)
  const pageCount = Math.max(1, Math.ceil(result.length / PAGE_SIZE))
  const visible = result.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const count = activeFilterCount(filters)

  const setValue = (key: string, value: string, replace = false) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace })
  }
  const toggleValue = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    const current = next.getAll(key)
    next.delete(key)
    for (const item of current.filter((item) => item !== value))
      next.append(key, item)
    if (!current.includes(value)) next.append(key, value)
    next.delete('page')
    setParams(next)
  }
  const reset = () => setParams(new URLSearchParams())
  const share = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copy this recipe search link', url)
    }
  }
  const filterPanel = (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold">Cuisine</legend>
        <div className="flex flex-wrap gap-2">
          {facets.cuisines.map((item) => (
            <FilterChip
              key={item}
              active={filters.cuisines?.includes(item) ?? false}
              onClick={() => toggleValue('cuisine', item)}>
              {item}
            </FilterChip>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold">Meal type</legend>
        <div className="flex flex-wrap gap-2">
          {facets.meals.map((item) => (
            <FilterChip
              key={item}
              active={filters.meals?.includes(item) ?? false}
              onClick={() => toggleValue('meal', item)}>
              {item}
            </FilterChip>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold">Tags</legend>
        <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
          {facets.tags.slice(0, 24).map((item) => (
            <FilterChip
              key={item}
              active={filters.tags?.includes(item) ?? false}
              onClick={() => toggleValue('tag', item)}>
              {item}
            </FilterChip>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2 text-xs font-semibold">
          Difficulty
          <NativeSelect
            className="w-full bg-background"
            aria-label="Difficulty"
            value={filters.difficulty ?? ''}
            onChange={(event) => setValue('difficulty', event.target.value)}>
            <NativeSelectOption value="">Any</NativeSelectOption>
            {['Easy', 'Medium', 'Hard'].map((value) => (
              <NativeSelectOption key={value}>{value}</NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-2 text-xs font-semibold">
          Max time
          <NativeSelect
            className="w-full bg-background"
            aria-label="Maximum time"
            value={filters.time ?? ''}
            onChange={(event) => setValue('time', event.target.value)}>
            <NativeSelectOption value="">Any</NativeSelectOption>
            {[15, 30, 45, 60, 90].map((value) => (
              <NativeSelectOption key={value} value={value}>
                ≤ {value} min
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>
      <label className="space-y-2 text-xs font-semibold">
        Max calories
        <NativeSelect
          className="w-full bg-background"
          aria-label="Maximum calories"
          value={filters.calories ?? ''}
          onChange={(event) => setValue('calories', event.target.value)}>
          <NativeSelectOption value="">Any</NativeSelectOption>
          {[200, 300, 400, 500].map((value) => (
            <NativeSelectOption key={value} value={value}>
              ≤ {value} kcal
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold">Show only</legend>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={!!filters.favorites}
            onClick={() => setValue('favorites', filters.favorites ? '' : '1')}>
            Favorites
          </FilterChip>
          <FilterChip
            active={!!filters.cooked}
            onClick={() => setValue('cooked', filters.cooked ? '' : '1')}>
            Cooked
          </FilterChip>
          <FilterChip
            active={!!filters.mine}
            onClick={() => setValue('mine', filters.mine ? '' : '1')}>
            My recipes
          </FilterChip>
        </div>
      </fieldset>
    </div>
  )

  return (
    <PageLayout>
      <PageTitle
        eyebrow="THE RECIPE BOX"
        title="Find your next favorite."
        sub="A collection for real life, real cravings, and whatever is left in the fridge."
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex h-12 min-w-60 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-muted-foreground">
          <Search size={18} />
          <span className="sr-only">Search recipes</span>
          <Input
            className="h-auto min-w-20 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
            value={filters.q ?? ''}
            onChange={(event) => setValue('q', event.target.value, true)}
            placeholder="Search dishes, ingredients, cuisines…"
          />
        </label>
        <NativeSelect
          className="h-12 min-w-40 rounded-xl bg-card text-sm"
          aria-label="Sort recipes"
          value={filters.sort}
          onChange={(event) => setValue('sort', event.target.value)}>
          <NativeSelectOption value="recommended">
            Recommended
          </NativeSelectOption>
          <NativeSelectOption value="name-asc">Name A–Z</NativeSelectOption>
          <NativeSelectOption value="name-desc">Name Z–A</NativeSelectOption>
          <NativeSelectOption value="rating-desc">
            Rating: high to low
          </NativeSelectOption>
          <NativeSelectOption value="rating-asc">
            Rating: low to high
          </NativeSelectOption>
          <NativeSelectOption value="time-asc">
            Time: shortest
          </NativeSelectOption>
          <NativeSelectOption value="time-desc">
            Time: longest
          </NativeSelectOption>
          <NativeSelectOption value="calories-asc">
            Calories: lowest
          </NativeSelectOption>
          <NativeSelectOption value="calories-desc">
            Calories: highest
          </NativeSelectOption>
        </NativeSelect>
        <Button
          variant="outline"
          className="h-12 md:hidden"
          onClick={() => setMobileFilters((value) => !value)}
          aria-expanded={mobileFilters}>
          <SlidersHorizontal size={16} /> Filters{' '}
          {count > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
              {count}
            </span>
          )}
        </Button>
        <Button variant="outline" className="h-12" onClick={() => void share()}>
          <Share2 size={16} />
          <span className="hidden sm:inline">Share link</span>
        </Button>
      </div>
      <Card
        className={`${mobileFilters ? 'block' : 'hidden'} mb-6 rounded-2xl p-5 md:block`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-xl">Refine your search</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {count} active
            </span>
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
        {filterPanel}
      </Card>
      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          <b className="text-foreground">{result.length}</b> recipes{' '}
          {count ? 'match your filters' : 'to explore'}
        </span>
        <span>
          Showing {result.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
          {Math.min(page * PAGE_SIZE, result.length)} of {result.length}
        </span>
      </div>
      {visible.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => (
            <RecipeCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <Card className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border-dashed p-8 text-center shadow-none">
          <span className="text-3xl" aria-hidden="true">
            🥣
          </span>
          <h2 className="font-heading text-2xl">No recipes found.</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try a broader search or clear a filter to see more ideas.
          </p>
          <Button onClick={reset}>Clear filters</Button>
        </Card>
      )}
      {pageCount > 1 && (
        <nav
          aria-label="Recipe pages"
          className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            aria-label="Previous page"
            onClick={() => setValue('page', String(page - 1))}>
            <ChevronLeft />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= pageCount}
            aria-label="Next page"
            onClick={() => setValue('page', String(page + 1))}>
            <ChevronRight />
          </Button>
        </nav>
      )}
    </PageLayout>
  )
}
