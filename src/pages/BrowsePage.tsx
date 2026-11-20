import { useDeferredValue, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import {
  applyBrowse,
  catalogFacets,
  PAGE_SIZE,
  activeFilterCount,
  BROWSE_SORTS,
} from '../domain/browse'
import { useCookbookStore } from '../stores/cookbook'
import { useRecipes } from '../hooks/useRecipes'
import { useRecipeFilters } from '../hooks/useRecipeFilters'
import { useTasteSetup } from '../hooks/useTasteSetup'
import { useScoreLookup } from '../hooks/useScoreLookup'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { copyText } from '../lib/clipboard'
import { toast } from '../stores/toast'
import { PageLayout, PageHeader } from '../components/app-shared'
import { RecipeGrid } from '../components/recipe-card'
import {
  AccordionSection,
  ButtonLink,
  Chip,
  CopyFallbackDialog,
  EmptyState,
} from '../components/primitives'
import { Button } from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import {
  NativeSelect,
  NativeSelectOption,
} from '../components/ui/native-select'
import type { RecipeId } from '../types/recipe'

const SORT_LABELS = {
  recommended: 'Recommended',
  'name-asc': 'Name A–Z',
  'name-desc': 'Name Z–A',
  'rating-desc': 'Rating: high to low',
  'rating-asc': 'Rating: low to high',
  'time-asc': 'Time: shortest',
  'time-desc': 'Time: longest',
  'calories-asc': 'Calories: lowest',
  'calories-desc': 'Calories: highest',
} as const

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const
const TIMES = [15, 30, 45, 60, 90] as const
const CALORIES = [200, 300, 400, 500] as const

export default function Browse() {
  useDocumentTitle('Recipes')
  const { catalog } = useRecipes()
  const { ctx } = useTasteSetup()
  const { scores, evaluations } = useScoreLookup(ctx)
  const { filters, patch, navigate, toggleFacet, reset } = useRecipeFilters()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [copyFallback, setCopyFallback] = useState('')

  const favorites = useCookbookStore((state) => state.favorites)
  const cooked = useCookbookStore((state) => state.cooked)
  const favoriteIds = useMemo(
    () => new Set(Object.keys(favorites) as RecipeId[]),
    [favorites],
  )
  const cookedIds = useMemo(
    () => new Set(Object.keys(cooked) as RecipeId[]),
    [cooked],
  )
  const extras = useMemo(
    () => ({ favorites: favoriteIds, cooked: cookedIds, scores }),
    [favoriteIds, cookedIds, scores],
  )

  const facets = useMemo(() => catalogFacets(catalog), [catalog])
  const deferredFilters = useDeferredValue(filters)
  const result = applyBrowse(catalog, deferredFilters, extras)
  const pageCount = Math.max(1, Math.ceil(result.length / PAGE_SIZE))
  const page = Math.min(filters.page, pageCount)
  const visible = result.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const active = activeFilterCount(filters)

  const facetCounts = useMemo(() => {
    const count = (key: 'cuisines' | 'meals' | 'tags', value: string) => {
      const relaxed = { ...deferredFilters, [key]: undefined }
      return applyBrowse(catalog, relaxed, extras).filter((item) =>
        key === 'cuisines'
          ? item.recipe.cuisine === value
          : key === 'meals'
            ? item.recipe.mealType.includes(value)
            : item.recipe.tags.includes(value),
      ).length
    }
    return {
      cuisines: new Map(
        facets.cuisines.map((value) => [value, count('cuisines', value)]),
      ),
      meals: new Map(
        facets.meals.map((value) => [value, count('meals', value)]),
      ),
      tags: new Map(facets.tags.map((value) => [value, count('tags', value)])),
    }
  }, [catalog, deferredFilters, extras, facets])

  const share = async () => {
    const url = window.location.href
    if (await copyText(url)) toast.success('Search link copied')
    else {
      toast.error('Could not copy the link')
      setCopyFallback(url)
    }
  }

  const goPage = (next: number) => {
    navigate({ page: next })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const panel = (
    <div className="space-y-6">
      <AccordionSection
        title="Cuisine"
        badge={filters.cuisines.length}
        defaultOpen>
        {facets.cuisines.map((item) => (
          <Chip
            key={item}
            active={filters.cuisines.includes(item)}
            count={facetCounts.cuisines.get(item)}
            onClick={() => toggleFacet('cuisine', item)}>
            {item}
          </Chip>
        ))}
      </AccordionSection>

      <AccordionSection
        title="Meal type"
        badge={filters.meals.length}
        defaultOpen>
        {facets.meals.map((item) => (
          <Chip
            key={item}
            active={filters.meals.includes(item)}
            count={facetCounts.meals.get(item)}
            onClick={() => toggleFacet('meal', item)}>
            {item}
          </Chip>
        ))}
      </AccordionSection>

      <AccordionSection title="Tags" badge={filters.tags.length}>
        {facets.tags.map((item) => (
          <Chip
            key={item}
            active={filters.tags.includes(item)}
            count={facetCounts.tags.get(item)}
            onClick={() => toggleFacet('tag', item)}>
            {item}
          </Chip>
        ))}
      </AccordionSection>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2 text-xs font-semibold">
          Difficulty
          <NativeSelect
            className="w-full"
            value={filters.difficulty ?? ''}
            onChange={(event) =>
              patch({ difficulty: event.target.value || null })
            }>
            <NativeSelectOption value="">Any</NativeSelectOption>
            {DIFFICULTIES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {value}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-2 text-xs font-semibold">
          Max time
          <NativeSelect
            className="w-full"
            value={filters.time ?? ''}
            onChange={(event) => patch({ time: event.target.value || null })}>
            <NativeSelectOption value="">Any</NativeSelectOption>
            {TIMES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                ≤ {value} min
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>

      <label className="block space-y-2 text-xs font-semibold">
        Max calories
        <NativeSelect
          className="w-full"
          value={filters.calories ?? ''}
          onChange={(event) => patch({ calories: event.target.value || null })}>
          <NativeSelectOption value="">Any</NativeSelectOption>
          {CALORIES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              ≤ {value} kcal
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>

      <AccordionSection
        title="Show only"
        badge={
          Number(filters.favorites) +
          Number(filters.cooked) +
          Number(filters.mine)
        }
        defaultOpen>
        <Chip
          active={filters.favorites}
          onClick={() => patch({ favorites: !filters.favorites })}>
          Favourites
        </Chip>
        <Chip
          active={filters.cooked}
          onClick={() => patch({ cooked: !filters.cooked })}>
          Cooked
        </Chip>
        <Chip
          active={filters.mine}
          onClick={() => patch({ mine: !filters.mine })}>
          My recipes
        </Chip>
      </AccordionSection>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">
          {active} active {active === 1 ? 'filter' : 'filters'}
        </span>
        <Button variant="ghost" size="sm" onClick={reset}>
          <X size={14} /> Reset
        </Button>
      </div>
    </div>
  )

  return (
    <PageLayout>
      <PageHeader
        eyebrow="THE RECIPE BOX"
        title="Find your next favorite."
        sub="A collection for real life, real cravings, and whatever is left in the fridge."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex h-11 min-w-60 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-muted-foreground">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search recipes</span>
          <Input
            className="h-auto min-w-20 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
            value={filters.q}
            onChange={(event) => patch({ q: event.target.value })}
            placeholder="Search dishes, ingredients, cuisines…"
          />
        </label>
        <NativeSelect
          className="h-11 min-w-44 rounded-xl border-border bg-card text-sm"
          aria-label="Sort recipes"
          value={filters.sort}
          onChange={(event) => patch({ sort: event.target.value })}>
          {BROWSE_SORTS.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {SORT_LABELS[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          variant="outline"
          className="h-11 lg:hidden"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}>
          <SlidersHorizontal size={16} aria-hidden="true" /> Filters
          {active > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
              {active}
            </span>
          )}
        </Button>
        <Button variant="outline" className="h-11" onClick={() => void share()}>
          <Share2 size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Share link</span>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-heading text-xl">Refine</h2>
            {panel}
          </div>
        </aside>

        <div id="browse-results">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              <b className="text-foreground">{result.length}</b>{' '}
              {result.length === 1 ? 'recipe' : 'recipes'}{' '}
              {active ? 'match your filters' : 'to explore'}
            </span>
            <span>
              Showing {result.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(page * PAGE_SIZE, result.length)} of {result.length}
            </span>
          </div>

          {visible.length ? (
            <RecipeGrid items={visible} evaluations={evaluations} />
          ) : (
            <EmptyState
              glyph="🥣"
              title="No recipes found."
              body={
                active
                  ? 'Try a broader search or clear a filter to see more ideas.'
                  : 'The catalogue is still arriving. Check your connection and try again.'
              }
              actions={
                active ? (
                  <Button onClick={reset}>Clear all filters</Button>
                ) : (
                  <ButtonLink href="/recipes">Refresh</ButtonLink>
                )
              }
            />
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
                onClick={() => goPage(page - 1)}>
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= pageCount}
                aria-label="Next page"
                onClick={() => goPage(page + 1)}>
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </div>
      </div>

      <Dialog
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Refine your search"
        description={`${result.length} recipes match right now.`}
        className="max-h-[85vh] overflow-y-auto"
        footer={
          <>
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
            <Button onClick={() => setSheetOpen(false)}>
              Show {result.length} recipes
            </Button>
          </>
        }>
        {panel}
      </Dialog>

      <CopyFallbackDialog
        open={Boolean(copyFallback)}
        onOpenChange={(open) => !open && setCopyFallback('')}
        value={copyFallback}
        title="Copy this search link"
      />
    </PageLayout>
  )
}
