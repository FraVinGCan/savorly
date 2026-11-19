import { Fragment, useMemo } from 'react'
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
  CookTrendChart,
  CookedFavouritesChart,
  CuisineDonutChart,
  MostCookedBarsChart,
  ValueColumnsChart,
} from '../components/charts'
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

function HeatStrip({ weeks }: { weeks: string[][] }) {
  const background = (level: string | number) => {
    const value = Number(level)
    return value === 0
      ? 'var(--color-muted, rgba(0,0,0,0.05))'
      : `color-mix(in srgb, var(--color-primary, #49633d) ${25 + value * 18}%, transparent)`
  }
  const weekLabel = (index: number) =>
    index === weeks.length - 1
      ? 'This week'
      : plural(weeks.length - 1 - index, 'week ago', 'weeks ago')
  const shortWeekLabel = (index: number) =>
    index === weeks.length - 1 ? 'Now' : `${weeks.length - 1 - index}w`

  return (
    <div className="space-y-1.5">
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `auto repeat(${weeks.length}, minmax(0, 1fr))`,
        }}
        role="group"
        aria-label="Cooks by weekday across the last eight weeks">
        {WEEKDAYS.map((day, dayIndex) => (
          <Fragment key={day}>
            <span
              aria-hidden="true"
              className="flex items-center justify-end whitespace-nowrap text-[9px] font-medium text-muted-foreground sm:text-[10px]">
              {day.slice(0, 3)}
            </span>
            {weeks.map((week, weekIndex) => {
              const level = week[dayIndex] ?? '0'
              const count = Number(level)
              const tooltipPosition = [
                dayIndex === 0 ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
                weekIndex === 0
                  ? 'left-0'
                  : weekIndex === weeks.length - 1
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2',
              ].join(' ')
              return (
                <span
                  key={weekIndex}
                  role="img"
                  aria-label={`${day} · ${weekLabel(weekIndex)} · ${plural(count, 'cook')}`}
                  tabIndex={0}
                  className="group relative aspect-square rounded-sm border border-border/50 transition duration-150 hover:z-10 hover:scale-110 hover:border-primary/50 focus-visible:z-10 focus-visible:scale-110 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  style={{ background: background(level) }}>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none invisible absolute z-20 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] font-medium text-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 ${tooltipPosition}`}>
                    <span className="font-semibold">
                      {day} · {weekLabel(weekIndex)}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {plural(count, 'cook')}
                    </span>
                  </span>
                </span>
              )
            })}
          </Fragment>
        ))}
        <span aria-hidden="true" />
        {weeks.map((_, weekIndex) => (
          <span
            key={weekIndex}
            aria-hidden="true"
            className="text-center text-[9px] leading-4 text-muted-foreground sm:text-[10px]">
            {shortWeekLabel(weekIndex)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span>Mon–Sun × 8 weeks</span>
        <span className="inline-flex items-center gap-1.5">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              role="img"
              aria-label={`${level} ${plural(level, 'cook')}`}
              className="size-2.5 rounded-[2px] border border-border/50"
              style={{ background: background(level) }}
            />
          ))}
          <span>More</span>
        </span>
      </div>
    </div>
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
    const entries = ranked.slice(0, 5).map(([label, value]) => ({
      label,
      value,
    }))
    const other = ranked.slice(5).reduce((sum, [, value]) => sum + value, 0)
    if (other > 0) entries.push({ label: 'Other', value: other })
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
        sub="A quiet look at how you cook, save and explore."
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
              <CookTrendChart
                values={cooksPerWeek}
                ariaLabel={`Cooks per week: ${cooksPerWeek.join(', ')}`}
              />
            </Card>
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
              <h3 className="mb-3 text-sm font-semibold">
                Weekday × week heat strip
              </h3>
              <HeatStrip weeks={heatWeeks} />
            </Card>
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60 lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold">Most cooked</h3>
              <MostCookedBarsChart
                entries={mostCooked.map((entry) => ({
                  label: entry.name,
                  value: entry.count,
                }))}
                ariaLabel={`Most cooked: ${mostCooked
                  .map(
                    (entry) => `${entry.name} ${plural(entry.count, 'cook')}`,
                  )
                  .join(', ')}`}
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
                <CuisineDonutChart
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
                <CookedFavouritesChart
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
                <ValueColumnsChart
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
                <ValueColumnsChart
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
        Built from your taste profile, cookbook, pantry and plans.
        {notes
          ? ` ${plural(Object.keys(notes).length, 'private note')} included.`
          : ''}
      </p>
    </PageLayout>
  )
}
