import { useMemo } from 'react'
import { Link } from 'react-router'
import {
  BarChart3,
  Bookmark,
  ChefHat,
  Compass,
  Leaf,
  Sparkles,
  Utensils,
} from 'lucide-react'
import { evaluatePantry, pantryTokens } from '../domain/pantry'
import { eligibleCount, rankRecipes, scoreTier } from '../domain/scoring'
import {
  ALLERGEN_META,
  profileConflicts,
  type TasteProfile,
} from '../domain/taste'
import { average, median, plural } from '../lib/format'
import { STORAGE_KEYS } from '../lib/storage'
import { addWeeks, startOfWeek, weekKey, WEEKDAYS } from '../domain/week'
import { useCookbookStore } from '../stores/cookbook'
import { usePantryStore } from '../stores/pantry'
import { usePlannerStore, countFor } from '../stores/planner'
import { useProfileStore } from '../stores/profile'
import { useRecipes } from '../hooks/useRecipes'
import { useTasteSetup } from '../hooks/useTasteSetup'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageHeader, PageLayout } from '../components/app-shared'
import {
  Badge,
  ButtonLink,
  EmptyState,
  ScorePill,
  SectionHeading,
  Stat,
} from '../components/primitives'
import { Card } from '../components/ui/card'
import { GOAL_LABELS, SPICE_LABELS } from '../lib/format'
import type { CatalogRecipe, RecipeId } from '../types/recipe'

const DONUT_COLOURS = [
  'var(--color-primary, #49633d)',
  '#c2865a',
  '#7b9c8b',
  '#c9ae5c',
  '#8a7ba6',
  '#b0717f',
  '#6c8bb0',
  '#9c8a6d',
]

function LineChart({ values }: { values: number[] }) {
  const width = 320
  const height = 110
  const max = Math.max(1, ...values)
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * (width - 24) + 12
    const y = height - 14 - (value / max) * (height - 28)
    return { x, y, value }
  })
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full text-primary"
        role="img"
        aria-label={`Cooks per week: ${values.join(', ')}`}>
        <line
          x1="12"
          y1={height - 14}
          x2={width - 12}
          y2={height - 14}
          stroke="currentColor"
          className="opacity-20"
          strokeWidth="1"
        />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill="currentColor"
          />
        ))}
      </svg>
      <figcaption className="flex justify-between text-[10px] text-muted-foreground">
        <span>8 weeks ago</span>
        <span>This week</span>
      </figcaption>
    </figure>
  )
}

function HeatStrip({ weeks }: { weeks: string[][] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-1 flex-col gap-1.5">
            {week.map((level, dayIndex) => (
              <span
                key={`${weekIndex}-${dayIndex}`}
                title={`${WEEKDAYS[dayIndex]} · ${level} cook${level === '1' ? '' : 's'}`}
                className="aspect-square rounded-sm border border-border/50"
                style={{
                  background:
                    level === '0'
                      ? 'var(--color-muted, rgba(0,0,0,0.05))'
                      : `color-mix(in srgb, var(--color-primary, #49633d) ${25 + Number(level) * 18}%, transparent)`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Mon–Sun × 8 weeks</span>
        <span>Less → more</span>
      </div>
    </div>
  )
}

function Donut({
  entries,
}: {
  entries: { label: string; value: number; colour: string }[]
}) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0) || 1
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const slices = entries.map((entry, index) => ({
    entry,
    length: (entry.value / total) * circumference,
    offset: entries
      .slice(0, index)
      .reduce(
        (sum, previous) => sum + (previous.value / total) * circumference,
        0,
      ),
  }))
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg
        viewBox="0 0 110 110"
        className="size-28 shrink-0 -rotate-90"
        role="img"
        aria-label="Recipes by cuisine">
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="var(--color-muted, rgba(0,0,0,0.06))"
          strokeWidth="12"
        />
        {slices.map(({ entry, length, offset }) => (
          <circle
            key={entry.label}
            cx="55"
            cy="55"
            r={radius}
            fill="none"
            stroke={entry.colour}
            strokeWidth="12"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
          />
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {entries.map((entry) => (
          <li
            key={entry.label}
            className="flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: entry.colour }}
              />
              <span className="truncate">{entry.label}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Bars({ entries }: { entries: { label: string; value: number }[] }) {
  const max = Math.max(1, ...entries.map((entry) => entry.value))
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.label}
          className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-xs">
          <span className="truncate">{entry.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${(entry.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right tabular-nums text-muted-foreground">
            {entry.value}
          </span>
        </li>
      ))}
    </ul>
  )
}

function dietMatches(
  catalog: CatalogRecipe[],
  profile: TasteProfile,
  diet: TasteProfile['diets'][number],
) {
  const scoped: TasteProfile = {
    ...profile,
    diets: [diet],
    allergens: [],
    avoidIngredients: [],
  }
  return catalog.filter(
    (item) => profileConflicts(item.recipe, scoped).length === 0,
  ).length
}

export default function Insights() {
  useDocumentTitle('Insights')
  const { catalog, byId } = useRecipes()
  const { ctx } = useTasteSetup()
  const profile = useProfileStore((state) => state.profile)
  const favorites = useCookbookStore((state) => state.favorites)
  const cooked = useCookbookStore((state) => state.cooked)
  const notes = useCookbookStore((state) => state.notes)
  const pantryItems = usePantryStore((state) => state.items)
  const weeks = usePlannerStore((state) => state.weeks)
  const currentWeek = weekKey(new Date())

  const totalCooks = Object.values(cooked).reduce(
    (sum, entry) => sum + entry.count,
    0,
  )
  const saved = Object.keys(favorites).length
  const planned = countFor(usePlannerStore.getState(), currentWeek)
  const hasPersonalData = Boolean(
    totalCooks ||
    saved ||
    notes ||
    pantryItems.length ||
    Object.keys(weeks).length ||
    profile.createdAt,
  )

  const savedCuisine = useMemo(() => {
    const counts = new Map<string, number>()
    for (const id of Object.keys(favorites)) {
      const item = byId.get(id as RecipeId)
      if (!item) continue
      counts.set(
        item.recipe.cuisine,
        (counts.get(item.recipe.cuisine) ?? 0) + 1,
      )
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  }, [favorites, byId])

  const pantryCoverage = useMemo(() => {
    const tokens = pantryTokens(pantryItems)
    if (!tokens.size || !catalog.length) return 0
    return average(
      catalog.map((item) => evaluatePantry(item.recipe, tokens).coverage),
    )
  }, [catalog, pantryItems])

  const canEat = eligibleCount(catalog, ctx)
  const ranked = useMemo(() => rankRecipes(catalog, ctx), [catalog, ctx])
  const topMatches = ranked.slice(0, 5)

  const cooksPerWeek = useMemo(() => {
    const weeksList = Array.from({ length: 8 }, (_, index) => {
      const start = startOfWeek(addWeeks(new Date(), index - 7))
      const end = addWeeks(start, 1)
      return { start, end }
    })
    return weeksList.map(
      ({ start, end }) =>
        Object.values(cooked)
          .flatMap((entry) => entry.history)
          .filter((iso) => {
            const date = new Date(iso)
            return date >= start && date < end
          }).length,
    )
  }, [cooked])

  const heatWeeks = useMemo(() => {
    return Array.from({ length: 8 }, (_, index) => {
      const start = startOfWeek(addWeeks(new Date(), index - 7))
      return Array.from({ length: 7 }, (_, day) => {
        const date = new Date(start)
        date.setDate(date.getDate() + day)
        const next = new Date(date)
        next.setDate(next.getDate() + 1)
        const count = Object.values(cooked)
          .flatMap((entry) => entry.history)
          .filter((iso) => {
            const at = new Date(iso)
            return at >= date && at < next
          }).length
        return String(Math.min(4, count))
      })
    })
  }, [cooked])

  const mostCooked = useMemo(
    () =>
      Object.entries(cooked)
        .map(([id, entry]) => ({
          id,
          count: entry.count,
          name: byId.get(id as RecipeId)?.recipe.name ?? 'Removed recipe',
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    [cooked, byId],
  )

  const times = useMemo(
    () =>
      catalog.map(
        (item) => item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes,
      ),
    [catalog],
  )
  const calories = useMemo(
    () => catalog.map((item) => item.recipe.caloriesPerServing),
    [catalog],
  )

  const cuisineEntries = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of catalog)
      counts.set(
        item.recipe.cuisine,
        (counts.get(item.recipe.cuisine) ?? 0) + 1,
      )
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], index) => ({
        label,
        value,
        colour: DONUT_COLOURS[index % DONUT_COLOURS.length]!,
      }))
  }, [catalog])

  const mealEntries = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of catalog)
      for (const meal of item.recipe.mealType)
        counts.set(meal, (counts.get(meal) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }))
  }, [catalog])

  const tagRanking = useMemo(() => {
    if (profile.favoriteCuisines.length)
      return {
        title: 'Saved cuisines',
        items: profile.favoriteCuisines.map((value) => ({
          label: value,
          value:
            cuisineEntries.find((entry) => entry.label === value)?.value ?? 0,
        })),
      }
    const counts = new Map<string, number>()
    for (const item of catalog)
      for (const tag of item.recipe.tags)
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
    return {
      title: 'Top 14 tags',
      items: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 14)
        .map(([label, value]) => ({ label, value })),
    }
  }, [catalog, cuisineEntries, profile.favoriteCuisines])

  if (!hasPersonalData)
    return (
      <PageLayout className="space-y-8">
        <PageHeader
          eyebrow="YOUR KITCHEN, IN NUMBERS"
          title="Little habits add up."
          sub="A gentle look at how you cook, save, and explore — once there is something to look at."
        />
        <EmptyState
          glyph="📈"
          title="Your insights start with your first recipe"
          body="Save a favourite, log a cook, or fill your pantry. Everything here is computed locally from what you do, never from an account or a server."
          actions={
            <>
              <ButtonLink to="/recipes">
                <Compass size={16} aria-hidden="true" />
                Explore recipes
              </ButtonLink>
              <ButtonLink variant="outline" to="/onboarding">
                <Sparkles size={16} aria-hidden="true" />
                Set your taste
              </ButtonLink>
            </>
          }
        />
      </PageLayout>
    )

  const coveragePercent = Math.round(pantryCoverage * 100)
  const selectedDiets = profile.diets

  return (
    <PageLayout className="space-y-10">
      <PageHeader
        eyebrow="YOUR KITCHEN, IN NUMBERS"
        title="Little habits add up."
        sub="Every number below is computed locally from this browser. No accounts, no tracking, no server writes."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<ChefHat size={19} />}
          value={totalCooks}
          label="times cooked"
          hint={plural(Object.keys(cooked).length, 'recipe')}
        />
        <Stat
          icon={<Bookmark size={19} />}
          value={saved}
          label="recipes saved"
          hint={savedCuisine ? `Mostly ${savedCuisine}` : 'Nothing saved yet'}
        />
        <Stat
          icon={<Leaf size={19} />}
          value={`${coveragePercent}%`}
          label="average pantry coverage"
          hint={`${pantryItems.length} pantry ${pantryItems.length === 1 ? 'item' : 'items'} across the catalogue`}
        />
        <Stat
          icon={<Utensils size={19} />}
          value={`${canEat}/${catalog.length}`}
          label="recipes you can eat"
          hint={
            planned ? `${planned} planned this week` : 'Nothing planned yet'
          }
        />
      </div>

      {totalCooks > 0 && (
        <section className="space-y-5">
          <SectionHeading
            eyebrow="COOKING RHYTHM"
            title="When the kitchen is busy"
            sub="Built from every cook you have logged, not from a schedule you had to keep."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
              <h3 className="mb-3 text-sm font-semibold">Cooks per week</h3>
              <LineChart values={cooksPerWeek} />
            </Card>
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
              <h3 className="mb-3 text-sm font-semibold">
                Weekday × week heat strip
              </h3>
              <HeatStrip weeks={heatWeeks} />
            </Card>
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60 lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold">Most cooked</h3>
              <Bars
                entries={mostCooked.map((entry) => ({
                  label: entry.name,
                  value: entry.count,
                }))}
              />
            </Card>
          </div>
        </section>
      )}

      <section className="space-y-5">
        <SectionHeading
          eyebrow="TASTE PROFILE"
          title="How your taste shapes the catalogue"
          sub="Each diet uses the same detection engine as For You, so these counts cannot disagree."
        />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
            <div>
              <h3 className="font-heading text-xl">
                {profile.displayName
                  ? `${profile.displayName}'s table`
                  : 'Your table'}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="neutral" glyph="🎯">
                  {GOAL_LABELS[profile.goal]}
                </Badge>
                <Badge tone="neutral" glyph="🌶️">
                  {SPICE_LABELS[profile.spice]}
                </Badge>
                {profile.maxTotalMinutes && (
                  <Badge tone="neutral" glyph="⏱">
                    ≤ {profile.maxTotalMinutes} min
                  </Badge>
                )}
                {profile.maxCalories && (
                  <Badge tone="neutral" glyph="🔥">
                    ≤ {profile.maxCalories} kcal
                  </Badge>
                )}
                {profile.avoidIngredients.map((item) => (
                  <Badge key={item} tone="red" glyph="✕">
                    avoid {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Diet coverage
              </h4>
              {selectedDiets.length ? (
                selectedDiets.map((diet) => {
                  const matches = dietMatches(catalog, profile, diet)
                  const ratio = catalog.length ? matches / catalog.length : 0
                  return (
                    <div key={diet} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium capitalize">{diet}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {matches}/{catalog.length}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No diets selected yet.
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Allergens flagged
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.allergens.length ? (
                  profile.allergens.map((allergen) => (
                    <Badge
                      key={allergen}
                      tone="amber"
                      glyph={ALLERGEN_META[allergen].glyph}>
                      {ALLERGEN_META[allergen].label}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    None selected.
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={16} aria-hidden="true" /> Your current top 5
            </h3>
            {topMatches.length ? (
              <ol className="divide-y divide-border">
                {topMatches.map((item, index) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <Link
                        to={`/recipes/${item.id}`}
                        className="truncate hover:text-primary">
                        {item.recipe.name}
                      </Link>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {scoreTier(item.evaluation.score)}
                      </span>
                      <ScorePill score={item.evaluation.score} />
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                No ranked recipes yet. Check the catalogue connection.
              </p>
            )}
            <ButtonLink variant="outline" className="mt-4 w-full" to="/foryou">
              Open For you
            </ButtonLink>
          </Card>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading
          eyebrow="THE CATALOGUE"
          title="What is in the collection"
          sub="A snapshot of the recipes everyone can browse, before your taste narrows the list."
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
            <h3 className="mb-3 text-sm font-semibold">Recipes by cuisine</h3>
            <Donut entries={cuisineEntries} />
          </Card>
          <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
            <h3 className="mb-3 text-sm font-semibold">Recipes by meal type</h3>
            {mealEntries.length ? (
              <Bars entries={mealEntries} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Meal types are not listed yet.
              </p>
            )}
          </Card>
          <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 size={16} aria-hidden="true" /> Time and calories
            </h3>
            {times.length ? (
              <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Quickest</dt>
                  <dd className="tabular-nums">{Math.min(...times)} min</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Longest</dt>
                  <dd className="tabular-nums">{Math.max(...times)} min</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Median</dt>
                  <dd className="tabular-nums">
                    {Math.round(median(times))} min
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Average</dt>
                  <dd className="tabular-nums">
                    {Math.round(average(times))} min
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Lightest</dt>
                  <dd className="tabular-nums">{Math.min(...calories)} kcal</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Richest</dt>
                  <dd className="tabular-nums">{Math.max(...calories)} kcal</dd>
                </div>
                <div className="col-span-2 flex justify-between gap-2 border-t border-border pt-2">
                  <dt className="text-muted-foreground">Average calories</dt>
                  <dd className="tabular-nums">
                    {Math.round(average(calories))} kcal
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No catalogue data to summarise yet.
              </p>
            )}
          </Card>
          <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
            <h3 className="mb-3 text-sm font-semibold">{tagRanking.title}</h3>
            {tagRanking.items.length ? (
              <ul className="flex flex-wrap gap-2">
                {tagRanking.items.map((entry) => (
                  <li
                    key={entry.label}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs">
                    <span
                      className="size-1.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    {entry.label}
                    {entry.value > 0 && (
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {entry.value}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Save a few cuisines in your profile to rank them here.
              </p>
            )}
          </Card>
        </div>
      </section>

      <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        Computed from <code>{STORAGE_KEYS.profile}</code>,{' '}
        <code>{STORAGE_KEYS.cookbook}</code>, <code>{STORAGE_KEYS.pantry}</code>
        , <code>{STORAGE_KEYS.planner}</code>, and the in-memory recipe
        catalogue.
        {notes
          ? ` ${plural(Object.keys(notes).length, 'private note')} included.`
          : ''}
      </p>
    </PageLayout>
  )
}
