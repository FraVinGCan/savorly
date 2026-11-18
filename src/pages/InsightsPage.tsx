import { useMemo } from 'react'
import { Link } from 'react-router'
import {
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
import { average, plural } from '../lib/format'
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
import { recipeSlug } from '../types/recipe'

const CHART_COLOURS = [
  'var(--color-primary, #49633d)',
  '#c2865a',
  '#7b9c8b',
  '#c9ae5c',
  '#8a7ba6',
  '#b0717f',
  '#6c8bb0',
  '#9c8a6d',
]

function AreaChart({ values }: { values: number[] }) {
  const width = 320
  const height = 110
  const max = Math.max(1, ...values)
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * (width - 24) + 12
    const y = height - 14 - (value / max) * (height - 28)
    return { x, y, value }
  })
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  const area = [
    `${points[0]?.x ?? 12},${height - 14}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${points[points.length - 1]?.x ?? width - 12},${height - 14}`,
  ].join(' ')
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
        <polygon
          points={area}
          fill="currentColor"
          fillOpacity="0.16"
          stroke="none"
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
  centreValue,
  centreLabel,
  ariaLabel,
}: {
  entries: { label: string; value: number; colour: string }[]
  centreValue: string
  centreLabel: string
  ariaLabel: string
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
      <div className="relative size-28 shrink-0">
        <svg
          viewBox="0 0 110 110"
          className="size-full -rotate-90"
          role="img"
          aria-label={ariaLabel}>
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-lg leading-none">
            {centreValue}
          </span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">
            {centreLabel}
          </span>
        </div>
      </div>
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
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {entry.value} · {Math.round((entry.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StackedBar({
  segments,
  ariaLabel,
}: {
  segments: { label: string; value: number; colour: string }[]
  ariaLabel: string
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1
  return (
    <div className="space-y-2">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={ariaLabel}>
        {segments.map((segment) => (
          <span
            key={segment.label}
            className="h-full"
            style={{
              width: `${(segment.value / total) * 100}%`,
              background: segment.colour,
            }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((segment) => (
          <li key={segment.label} className="inline-flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ background: segment.colour }}
            />
            <span>{segment.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {segment.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Columns({
  entries,
  ariaLabel,
}: {
  entries: { label: string; value: number }[]
  ariaLabel: string
}) {
  const max = Math.max(1, ...entries.map((entry) => entry.value))
  return (
    <div className="space-y-2">
      <div
        className="flex h-28 items-end gap-2"
        role="img"
        aria-label={ariaLabel}>
        {entries.map((entry) => (
          <div
            key={entry.label}
            className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {entry.value}
            </span>
            <span
              className="w-full rounded-t-md bg-primary"
              style={{
                height: `${Math.max(entry.value ? 8 : 2, (entry.value / max) * 80)}px`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {entries.map((entry) => (
          <span
            key={entry.label}
            className="flex-1 text-center text-[10px] text-muted-foreground">
            {entry.label}
          </span>
        ))}
      </div>
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
  const ratings = useCookbookStore((state) => state.ratings)
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

  const cuisineChart = useMemo(() => {
    const counts = new Map<string, number>()
    for (const [id, entry] of Object.entries(cooked)) {
      const item = byId.get(id as RecipeId)
      if (!item) continue
      counts.set(
        item.recipe.cuisine,
        (counts.get(item.recipe.cuisine) ?? 0) + entry.count,
      )
    }
    const ranked = [...counts.entries()]
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
    const entries = ranked.slice(0, 5).map(([label, value], index) => ({
      label,
      value,
      colour: CHART_COLOURS[index % CHART_COLOURS.length]!,
    }))
    const other = ranked.slice(5).reduce((sum, [, value]) => sum + value, 0)
    if (other > 0)
      entries.push({
        label: 'Other',
        value: other,
        colour: CHART_COLOURS[5]!,
      })
    return {
      entries,
      total: entries.reduce((sum, entry) => sum + entry.value, 0),
    }
  }, [cooked, byId])

  const savedCooked = useMemo(
    () =>
      Object.keys(favorites).filter((id) => (cooked[id]?.count ?? 0) > 0)
        .length,
    [favorites, cooked],
  )

  const ratingValues = Object.values(ratings)
  const ratingAverage = average(ratingValues)
  const ratingBuckets = [5, 4, 3, 2, 1].map((value) => ({
    label: `${value}★`,
    value: ratingValues.filter((rating) => rating === value).length,
  }))

  const ownRecipes = useMemo(
    () => catalog.filter((item) => item.source === 'mine'),
    [catalog],
  )
  const ownDifficulties = ['Easy', 'Medium', 'Hard'].map((difficulty) => ({
    label: difficulty,
    value: ownRecipes.filter((item) => item.recipe.difficulty === difficulty)
      .length,
  }))
  const ownAverageMinutes = ownRecipes.length
    ? Math.round(
        average(
          ownRecipes.map(
            (item) => item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes,
          ),
        ),
      )
    : 0

  const showCookbook =
    cuisineChart.entries.length > 0 ||
    saved > 0 ||
    ratingValues.length > 0 ||
    ownRecipes.length > 0

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
          body="Save a favourite, log a cook, or fill your pantry. Everything here is built from what you do — never from an account or a server."
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
        sub="A quiet look at how you cook, save and explore — all from this device."
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
          label="pantry coverage"
          hint={`${plural(pantryItems.length, 'item')} on your shelf`}
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
              <AreaChart values={cooksPerWeek} />
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

      {showCookbook && (
        <section className="space-y-5">
          <SectionHeading
            eyebrow="YOUR COOKBOOK"
            title="The shelf you have built"
            sub="Built from what you save, cook, rate and create — never from the catalogue as a whole."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            {cuisineChart.entries.length > 0 && (
              <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
                <h3 className="text-sm font-semibold">Cuisines you cook</h3>
                <p className="mb-3 mt-1 text-xs text-muted-foreground">
                  How often you have cooked each cuisine, counted from your
                  logged cooks.
                </p>
                <Donut
                  entries={cuisineChart.entries}
                  centreValue={String(cuisineChart.total)}
                  centreLabel={cuisineChart.total === 1 ? 'cook' : 'cooks'}
                  ariaLabel={`Cooks by cuisine: ${cuisineChart.entries
                    .map((entry) => `${entry.label} ${entry.value}`)
                    .join(', ')}`}
                />
              </Card>
            )}
            {saved > 0 && (
              <Card className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
                <h3 className="text-sm font-semibold">
                  Favourited recipes you have cooked
                </h3>
                <p className="text-xs text-muted-foreground">
                  {savedCooked} of {plural(saved, 'favourited recipe')} have
                  been cooked at least once.
                </p>
                <StackedBar
                  segments={[
                    {
                      label: 'Cooked',
                      value: savedCooked,
                      colour: 'var(--color-primary, #49633d)',
                    },
                    {
                      label: 'Not yet cooked',
                      value: saved - savedCooked,
                      colour: '#c2865a',
                    },
                  ]}
                  ariaLabel={`Favourited recipes: ${savedCooked} cooked, ${saved - savedCooked} not yet cooked`}
                />
                <ButtonLink variant="outline" className="w-full" to="/cookbook">
                  Open cookbook
                </ButtonLink>
              </Card>
            )}
            {ratingValues.length > 0 && (
              <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
                <h3 className="text-sm font-semibold">How you rate</h3>
                <p className="mb-3 mt-1 text-xs text-muted-foreground">
                  You average {ratingAverage.toFixed(1)} out of 5 across{' '}
                  {plural(ratingValues.length, 'recipe')}.
                </p>
                <Columns
                  entries={ratingBuckets}
                  ariaLabel={`Ratings: ${ratingBuckets
                    .map((entry) => `${entry.label} ${entry.value}`)
                    .join(', ')}`}
                />
              </Card>
            )}
            {ownRecipes.length > 0 && (
              <Card className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
                <h3 className="text-sm font-semibold">Your own recipes</h3>
                <p className="text-xs text-muted-foreground">
                  {plural(ownRecipes.length, 'recipe')} written by you,
                  averaging {ownAverageMinutes} minutes each.
                </p>
                <Columns
                  entries={ownDifficulties}
                  ariaLabel={`Your recipes by difficulty: ${ownDifficulties
                    .map((entry) => `${entry.label} ${entry.value}`)
                    .join(', ')}`}
                />
              </Card>
            )}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <SectionHeading
          eyebrow="TASTE PROFILE"
          title="How your taste shapes your picks"
          sub="Each diet follows the same rules as For You, so the numbers always agree."
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
                        to={`/recipes/${recipeSlug(item.id)}`}
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
                Your picks will appear here as your profile comes together.
              </p>
            )}
            <ButtonLink variant="outline" className="mt-4 w-full" to="/foryou">
              Open For you
            </ButtonLink>
          </Card>
        </div>
      </section>

      <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        Built from your profile, saved recipes, pantry and plans on this device.
        Nothing leaves this browser.
        {notes
          ? ` ${plural(Object.keys(notes).length, 'private note')} included.`
          : ''}
      </p>
    </PageLayout>
  )
}
