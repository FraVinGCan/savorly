import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { cn } from 'cn'
import {
  displayIngredient,
  matchKeys,
  normalizeIngredient,
} from '../domain/ingredients'
import { DIETS, allergenBadges, profileConflicts } from '../domain/taste'
import { MAX_COMPARE, useCompareStore } from '../stores/compare'
import { useCookbookStore } from '../stores/cookbook'
import { toast } from '../stores/toast'
import { useRecipes } from '../hooks/useRecipes'
import { useScoreLookup } from '../hooks/useScoreLookup'
import { useTasteSetup } from '../hooks/useTasteSetup'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { percent, titleCase } from '../lib/format'
import { PageHeader, PageLayout } from '../components/app-shared'
import {
  Badge,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  Rating,
} from '../components/primitives'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { TabGroup } from '../components/ui/tabs'
import type { CatalogRecipe, RecipeId } from '../types/recipe'
import { recipeSlug } from '../types/recipe'

type CompareTab = 'side' | 'ingredients' | 'method'

const difficultyRank = { Easy: 0, Medium: 1, Hard: 2 } as const

function dietsFor(item: CatalogRecipe) {
  return DIETS.filter(
    (diet) =>
      profileConflicts(item.recipe.ingredients, {
        diets: [diet],
        allergens: [],
        avoidIngredients: [],
      }).length === 0,
  )
}

export default function ComparePage() {
  useDocumentTitle('Compare')
  const ids = useCompareStore((state) => state.ids)
  const remove = useCompareStore((state) => state.remove)
  const clear = useCompareStore((state) => state.clear)
  const { byId } = useRecipes()
  const { ctx } = useTasteSetup()
  const { evaluations } = useScoreLookup(ctx)
  const ratings = useCookbookStore((state) => state.ratings)
  const notes = useCookbookStore((state) => state.notes)
  const [tab, setTab] = useState<CompareTab>('side')
  const [confirmClear, setConfirmClear] = useState(false)

  const items = ids.flatMap((id) => {
    const item = byId.get(id)
    return item ? [item] : []
  })
  const tokens = ctx.pantryTokens

  /** The best cell in a numeric row, with ties sharing the mark. */
  const bestFor = (
    score: (item: CatalogRecipe) => number | null,
    higherIsBetter = true,
  ) => {
    const scored = items.flatMap((item) => {
      const value = score(item)
      return value === null || !Number.isFinite(value)
        ? []
        : [{ id: item.id, value }]
    })
    if (!scored.length) return new Set<RecipeId>()
    const edge = higherIsBetter
      ? Math.max(...scored.map((entry) => entry.value))
      : Math.min(...scored.map((entry) => entry.value))
    return new Set(
      scored.filter((entry) => entry.value === edge).map((entry) => entry.id),
    )
  }

  const ingredientRows = (() => {
    const merged = new Map<
      string,
      { key: string; label: string; recipes: Set<RecipeId> }
    >()
    for (const item of items)
      for (const raw of item.recipe.ingredients) {
        const key = normalizeIngredient(raw)
        if (!key) continue
        const row = merged.get(key) ?? {
          key,
          label: displayIngredient(key),
          recipes: new Set<RecipeId>(),
        }
        row.recipes.add(item.id)
        merged.set(key, row)
      }
    return [...merged.values()]
      .map((row) => ({
        ...row,
        owned: !!tokens && matchKeys(row.key).some((key) => tokens.has(key)),
      }))
      .sort(
        (a, b) =>
          Number(b.owned) - Number(a.owned) || a.label.localeCompare(b.label),
      )
  })()

  if (!items.length)
    return (
      <PageLayout className="space-y-8">
        <PageHeader
          eyebrow="THE SHORTLIST"
          title="Good things, side by side."
          sub="Compare up to four recipes before you choose."
        />
        <EmptyState
          glyph="⚖️"
          title="Nothing to compare yet"
          body="Add recipes from the catalogue, a recipe page or the tray prompt, then return here to weigh them up."
          actions={
            <>
              <ButtonLink to="/recipes">Browse recipes</ButtonLink>
              <ButtonLink variant="outline" to="/foryou">
                Find a match
              </ButtonLink>
            </>
          }
        />
      </PageLayout>
    )

  const rows: {
    label: string
    value: (item: CatalogRecipe) => ReactNode
    best?: () => Set<RecipeId>
  }[] = [
    {
      label: 'Total time',
      value: (item) =>
        `${item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes} min`,
      best: () =>
        bestFor(
          (item) => item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes,
          false,
        ),
    },
    {
      label: 'Prep / cook',
      value: (item) =>
        `${item.recipe.prepTimeMinutes} min prep · ${item.recipe.cookTimeMinutes} min cook`,
      best: () =>
        bestFor(
          (item) => item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes,
          false,
        ),
    },
    {
      label: 'Calories / serving',
      value: (item) => item.recipe.caloriesPerServing,
      best: () => bestFor((item) => item.recipe.caloriesPerServing, false),
    },
    {
      label: 'Servings',
      value: (item) => item.recipe.servings,
      best: () => bestFor((item) => item.recipe.servings),
    },
    {
      label: 'Difficulty',
      value: (item) => item.recipe.difficulty,
      best: () =>
        bestFor((item) => difficultyRank[item.recipe.difficulty], false),
    },
    {
      label: 'Community rating',
      value: (item) => (
        <span className="inline-flex flex-wrap items-baseline gap-1.5">
          <b className="tabular-nums">{item.recipe.rating.toFixed(1)} / 5</b>
          <small className="text-[11px] text-muted-foreground">
            {item.recipe.reviewCount} reviews
          </small>
        </span>
      ),
      best: () => bestFor((item) => item.recipe.rating),
    },
    {
      label: 'Your rating',
      value: (item) =>
        ratings[item.id] ? (
          <Rating
            value={ratings[item.id]!}
            label={`Your rating for ${item.recipe.name}`}
          />
        ) : (
          <span className="text-muted-foreground">Not rated</span>
        ),
      best: () => bestFor((item) => ratings[item.id] ?? null),
    },
    {
      label: 'Match for your taste',
      value: (item) => {
        const evaluation = evaluations.get(item.id)
        if (!evaluation) return '—'
        return evaluation.eligible ? (
          `${evaluation.score}%`
        ) : (
          <Badge tone="red" className="text-[10px]">
            Off-menu
          </Badge>
        )
      },
      best: () => bestFor((item) => evaluations.get(item.id)?.score ?? null),
    },
    {
      label: 'Pantry coverage',
      value: (item) => {
        const pantry = evaluations.get(item.id)?.pantry
        if (!pantry)
          return <span className="text-muted-foreground">Pantry empty</span>
        return (
          <span className="tabular-nums">
            {percent(pantry.coverage)}
            <small className="ml-1 text-[11px] text-muted-foreground">
              {pantry.have.length}/{item.recipe.ingredients.length}
            </small>
          </span>
        )
      },
      best: () =>
        tokens
          ? bestFor(
              (item) => evaluations.get(item.id)?.pantry?.coverage ?? null,
            )
          : new Set<RecipeId>(),
    },
    {
      label: 'Cuisine',
      value: (item) => item.recipe.cuisine,
    },
    {
      label: 'Contains',
      value: (item) => {
        const allergens = allergenBadges(item.recipe)
        return allergens.length ? (
          <span className="flex flex-wrap gap-1">
            {allergens.map((allergen) => (
              <Badge
                key={allergen.id}
                tone="amber"
                glyph={allergen.glyph}
                className="text-[10px]">
                {allergen.label}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">Nothing flagged</span>
        )
      },
    },
    {
      label: 'Suitable diets',
      value: (item) => {
        const diets = dietsFor(item)
        return diets.length ? (
          <span className="flex flex-wrap gap-1">
            {diets.map((diet) => (
              <Badge key={diet} tone="sage" className="text-[10px]">
                {titleCase(diet)}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">None of the six</span>
        )
      },
    },
    {
      label: 'Tags',
      value: (item) =>
        item.recipe.tags.length ? (
          <span className="flex flex-wrap gap-1">
            {item.recipe.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      label: 'Your note',
      value: (item) =>
        notes[item.id] ? (
          <span
            className="line-clamp-3 max-w-56 text-xs leading-5"
            title={notes[item.id]}>
            {notes[item.id]}
          </span>
        ) : (
          <span className="text-muted-foreground">No note</span>
        ),
    },
  ]

  const methodSteps = items.reduce(
    (sum, item) => sum + item.recipe.instructions.length,
    0,
  )

  return (
    <PageLayout className="space-y-8">
      <PageHeader
        eyebrow="THE SHORTLIST"
        title="Good things, side by side."
        sub="Compare the details before you choose."
        actions={
          <Button variant="outline" onClick={() => setConfirmClear(true)}>
            <Trash2 size={16} aria-hidden="true" /> Clear tray
          </Button>
        }
      />

      <section aria-label="Recipes in the compare tray" className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="relative rounded-2xl border border-border bg-card p-0 shadow-none ring-1 ring-border/60">
              <img
                className="aspect-[16/9] w-full object-cover"
                src={item.recipe.image}
                alt=""
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.visibility = 'hidden'
                }}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-2 top-2 rounded-full bg-card/90 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${item.recipe.name} from compare`}
                onClick={() => {
                  remove(item.id)
                  toast.info('Removed from compare', item.recipe.name)
                }}>
                <X size={16} aria-hidden="true" />
              </Button>
              <div className="p-3">
                <Link
                  to={`/recipes/${recipeSlug(item.id)}`}
                  className="line-clamp-2 font-heading text-lg leading-tight hover:text-primary">
                  {item.recipe.name}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.recipe.cuisine}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes}{' '}
                    min
                  </span>
                </div>
              </div>
            </Card>
          ))}
          {items.length < MAX_COMPARE && (
            <Link
              to="/recipes"
              className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
              <Plus size={20} aria-hidden="true" />
              <span className="font-medium">Add another recipe</span>
              <small className="text-xs">Browse the catalogue</small>
            </Link>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {items.length >= MAX_COMPARE
            ? 'Compare is full (4 of 4). Remove a recipe to swap in another.'
            : `${items.length} of ${MAX_COMPARE} slots used. Your tray follows you across pages.`}
        </p>
      </section>

      <TabGroup
        label="Compare views"
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: 'side',
            label: 'Side by side',
            content: (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  The strongest cell in each row is highlighted.
                </p>
                <Card className="rounded-2xl border border-border bg-card p-0 shadow-none ring-1 ring-border/60">
                  <div className="relative overflow-x-auto">
                    <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th
                            scope="col"
                            className="border-b border-border p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            At a glance
                          </th>
                          {items.map((item) => (
                            <th
                              key={item.id}
                              scope="col"
                              className="border-b border-border p-3 align-bottom">
                              <Link
                                to={`/recipes/${recipeSlug(item.id)}`}
                                className="font-heading text-base hover:text-primary">
                                {item.recipe.name}
                              </Link>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const best = row.best?.() ?? new Set<RecipeId>()
                          return (
                            <tr key={row.label} className="align-top">
                              <th
                                scope="row"
                                className="border-b border-border p-3 text-xs font-medium text-muted-foreground">
                                {row.label}
                              </th>
                              {items.map((item) => {
                                const isBest = best.has(item.id)
                                return (
                                  <td
                                    key={item.id}
                                    className={cn(
                                      'border-b border-border p-3',
                                      isBest && 'bg-secondary/70',
                                    )}>
                                    <span className="inline-flex items-center gap-1.5">
                                      {row.value(item)}
                                      {isBest && (
                                        <Check
                                          size={14}
                                          className="shrink-0 text-primary"
                                          aria-hidden="true"
                                        />
                                      )}
                                    </span>
                                    {isBest && (
                                      <span className="sr-only">
                                        {' '}
                                        (best in this row)
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            ),
          },
          {
            value: 'ingredients',
            label: 'Ingredients',
            count: ingredientRows.length,
            content: (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {tokens
                    ? 'Rows marked “On hand” are covered by your pantry.'
                    : 'Add pantry items to see which ingredients you already own.'}
                </p>
                {ingredientRows.length ? (
                  <Card className="rounded-2xl border border-border bg-card p-0 shadow-none ring-1 ring-border/60">
                    <div className="relative overflow-x-auto">
                      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th
                              scope="col"
                              className="border-b border-border p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Ingredient
                            </th>
                            {items.map((item) => (
                              <th
                                key={item.id}
                                scope="col"
                                className="border-b border-border p-3 text-center align-bottom">
                                <Link
                                  to={`/recipes/${recipeSlug(item.id)}`}
                                  className="font-heading text-base hover:text-primary">
                                  {item.recipe.name}
                                </Link>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ingredientRows.map((row) => (
                            <tr
                              key={row.key}
                              className={cn(
                                'align-middle',
                                row.owned && 'bg-secondary/40',
                              )}>
                              <th
                                scope="row"
                                className="border-b border-border p-3 text-left font-normal">
                                <span className="inline-flex flex-wrap items-center gap-2">
                                  {row.label}
                                  {row.owned && (
                                    <Badge
                                      tone="sage"
                                      glyph="✓"
                                      className="text-[10px]">
                                      On hand
                                    </Badge>
                                  )}
                                </span>
                              </th>
                              {items.map((item) => {
                                const needed = row.recipes.has(item.id)
                                return (
                                  <td
                                    key={item.id}
                                    className="border-b border-border p-3 text-center">
                                    {needed ? (
                                      <>
                                        <Check
                                          size={15}
                                          className="mx-auto text-primary"
                                          aria-hidden="true"
                                        />
                                        <span className="sr-only">
                                          {item.recipe.name} needs{' '}
                                          {row.label.toLowerCase()}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ) : (
                  <EmptyState
                    glyph="🧺"
                    title="No ingredients recorded"
                    body="These recipes have no ingredients to compare."
                  />
                )}
              </div>
            ),
          },
          {
            value: 'method',
            label: 'Method',
            count: methodSteps,
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        to={`/recipes/${recipeSlug(item.id)}`}
                        className="font-heading text-xl hover:text-primary">
                        {item.recipe.name}
                      </Link>
                      <Badge tone="neutral">
                        {item.recipe.instructions.length} steps
                      </Badge>
                    </div>
                    {item.recipe.instructions.length ? (
                      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground marker:font-semibold marker:text-foreground">
                        {item.recipe.instructions.map((step, index) => (
                          <li key={`${item.id}-${index}`}>{step}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No method recorded for this recipe.
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear the compare tray?"
        description={`This removes all ${items.length} recipes from your shortlist. Saved recipes, notes and plans are untouched.`}
        confirmLabel="Clear tray"
        destructive
        onConfirm={() => {
          clear()
          toast.success('Compare tray cleared')
        }}
      />
    </PageLayout>
  )
}
