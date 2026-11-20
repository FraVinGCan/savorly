import { Link } from 'react-router'
import {
  ArrowRight,
  Bookmark,
  ChefHat,
  Clock3,
  GitCompare,
  ShoppingBasket,
  Sparkles,
} from 'lucide-react'
import { useCookbookStore } from '../stores/cookbook'
import { useCompareStore } from '../stores/compare'
import { usePantryStore } from '../stores/pantry'
import { usePlannerStore } from '../stores/planner'
import { useProfileStore } from '../stores/profile'
import { canCookNow, evaluatePantry, pantryTokens } from '../domain/pantry'
import { evaluateRecipe, rankRecipes } from '../domain/scoring'
import { WEEKDAYS, weekKey } from '../domain/week'
import { useRecipes } from '../hooks/useRecipes'
import { useTasteSetup } from '../hooks/useTasteSetup'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageLayout } from '../components/app-shared'
import { RecipeCard } from '../components/recipe-card'
import {
  Badge,
  ButtonLink,
  EmptyState,
  SectionHeading,
  Stat,
} from '../components/primitives'
import { Card } from '../components/ui/card'
import { GOAL_LABELS, SPICE_LABELS } from '../lib/format'

export default function Home() {
  useDocumentTitle('Home')
  const { catalog } = useRecipes()
  const profile = useProfileStore((state) => state.profile)
  const favorites = useCookbookStore((state) => state.favorites)
  const cooked = useCookbookStore((state) => state.cooked)
  const pantry = usePantryStore((state) => state.items)
  const compareIds = useCompareStore((state) => state.ids)
  const weeks = usePlannerStore((state) => state.weeks)
  const { ctx, personalised } = useTasteSetup()

  const now = new Date()
  const week = weekKey(now)
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const tokens = pantryTokens(pantry)
  const ready = catalog.filter((item) => canCookNow(item.recipe, tokens))
  const partialMatch = catalog.filter(
    (item) => evaluatePantry(item.recipe, tokens).coverage > 0,
  ).length
  const currentWeek = weeks[week] ?? {}
  const plannedDays = Object.values(currentWeek).filter(
    (day) => day.length > 0,
  ).length
  const plannedMeals = Object.values(currentWeek).reduce(
    (sum, day) => sum + day.length,
    0,
  )
  const ranked = rankRecipes(catalog, ctx)
  const shortlist = personalised
    ? ranked.slice(0, 4)
    : [...catalog].sort((a, b) => b.recipe.rating - a.recipe.rating).slice(0, 4)
  const mostCookedId = Object.entries(cooked).sort(
    (a, b) => b[1].count - a[1].count,
  )[0]?.[0]
  const mostCookedName = catalog.find((item) => item.id === mostCookedId)
    ?.recipe.name

  const cuisineCounts = new Map<string, number>()
  for (const { recipe } of catalog)
    cuisineCounts.set(
      recipe.cuisine,
      (cuisineCounts.get(recipe.cuisine) ?? 0) + 1,
    )
  const cuisines = [...cuisineCounts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
  const quickPicks = catalog
    .filter(
      (item) => item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes <= 30,
    )
    .sort((a, b) => b.recipe.rating - a.recipe.rating)
    .slice(0, 5)
  const creations = catalog.filter((item) => item.source === 'mine')
  const thisWeek = WEEKDAYS.map((name, day) => ({
    name,
    ids: weeks[week]?.[String(day)] ?? [],
  }))

  return (
    <PageLayout className="space-y-10">
      <section className="relative grid overflow-hidden rounded-[2rem] bg-secondary/70 p-6 sm:p-10 lg:min-h-[28rem] lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-8 lg:p-12">
        <div className="relative z-10 max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> YOUR KITCHEN,
            REIMAGINED
          </div>
          <h1 className="font-heading text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            {personalised ? (
              <>
                {'Something that fits your '}
                <em className="text-primary">taste</em>
                {', not a random dinner.'}
              </>
            ) : (
              <>
                Tell us <em className="text-primary">how you eat…</em>
              </>
            )}
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
            {greeting}
            {profile.displayName ? `, ${profile.displayName}` : ''}.{' '}
            {personalised
              ? 'Your next favorite is waiting.'
              : 'A personal recipe book that fits your tastes, your time, and what is already in your kitchen.'}
          </p>
          {personalised && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.diets.map((diet) => (
                <Badge key={diet} tone="sage" glyph="🌿">
                  {diet}
                </Badge>
              ))}
              {profile.allergens.map((allergen) => (
                <Badge key={allergen} tone="amber" glyph="⚠️">
                  no {allergen}
                </Badge>
              ))}
              <Badge tone="neutral" glyph="🎯">
                {GOAL_LABELS[profile.goal]}
              </Badge>
              <Badge tone="neutral" glyph="🌶️">
                {SPICE_LABELS[profile.spice]}
              </Badge>
            </div>
          )}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ButtonLink to={personalised ? '/foryou' : '/onboarding'}>
              {personalised ? 'See your matches' : 'Make it yours'}
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink variant="ghost" to="/recipes">
              Explore all recipes
            </ButtonLink>
          </div>
          <div className="mt-7 flex items-center gap-3 text-xs text-muted-foreground">
            <span aria-hidden="true" className="flex gap-1 text-base">
              <span>🥑</span>
              <span>🍋</span>
              <span>🌿</span>
            </span>
            <span>{catalog.length} recipes, one little kitchen at a time</span>
          </div>
        </div>
        <div className="relative mt-8 min-h-64 overflow-hidden rounded-[1.5rem] bg-muted lg:mt-0 lg:min-h-[22rem]">
          {catalog[0]?.recipe.image ? (
            <img
              className="absolute inset-0 size-full object-cover"
              src={catalog[0].recipe.image}
              alt=""
            />
          ) : (
            <div
              className="grid size-full min-h-64 place-items-center text-7xl"
              aria-hidden="true">
              🥗
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16 text-white">
            <span className="text-xs uppercase tracking-wider text-white/75">
              Today&apos;s little reminder
            </span>
            <p className="mt-1 font-heading text-2xl">
              Make something you love.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/cookbook" className="block h-full">
          <Stat
            icon={<Bookmark size={19} />}
            value={Object.keys(favorites).length}
            label="saved recipes"
            hint="Everything you kept in one place"
          />
        </Link>
        <Link to="/planner" className="block h-full">
          <Stat
            icon={<ChefHat size={19} />}
            value={`${plannedDays}/7`}
            label="days planned this week"
            hint={`${plannedMeals} ${plannedMeals === 1 ? 'meal' : 'meals'} on the plan`}
          />
        </Link>
        <Link to="/pantry" className="block h-full">
          <Stat
            icon={<ShoppingBasket size={19} />}
            value={pantry.length}
            label="pantry staples"
            hint={`${ready.length} recipes you could cook now`}
          />
        </Link>
        <Link to="/compare" className="block h-full">
          <Stat
            icon={<GitCompare size={19} />}
            value={`${compareIds.length}/4`}
            label="in your compare tray"
            hint={
              mostCookedName
                ? `Most cooked: ${mostCookedName}`
                : 'Compare your favourites'
            }
          />
        </Link>
      </section>

      {profile.createdAt === null && (
        <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
            <Sparkles aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              YOUR TASTE, YOUR RULES
            </div>
            <h2 className="font-heading text-2xl">
              Recipes that get to know you.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Set your dietary needs, spice comfort zone, and time budget. We
              will do the sorting.
            </p>
          </div>
          <ButtonLink variant="secondary" to="/onboarding">
            Set up your taste
            <ArrowRight size={17} />
          </ButtonLink>
        </section>
      )}

      <section>
        <SectionHeading
          eyebrow="A FEW GOOD IDEAS"
          title={
            personalised
              ? 'Picked for your kind of day'
              : 'A little inspiration'
          }
          sub={
            personalised
              ? 'A short list, thoughtfully matched to you.'
              : 'A few favourites to get you started.'
          }
          action={
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              to={personalised ? '/foryou' : '/recipes'}>
              See all recipes <ArrowRight size={16} />
            </Link>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shortlist.map((item) => (
            <RecipeCard
              key={item.id}
              item={item}
              evaluation={evaluateRecipe(item, ctx)}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="FROM YOUR PANTRY"
          title="Ready to cook now"
          sub="Recipes with every ingredient already in your kitchen."
          action={
            <Link
              className="text-sm font-medium text-primary hover:underline"
              to="/pantry">
              Manage pantry
            </Link>
          }
        />
        {ready.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ready.slice(0, 4).map((item) => (
              <RecipeCard
                key={item.id}
                item={item}
                evaluation={evaluateRecipe(item, ctx)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            glyph="🧺"
            title="Your pantry is waiting"
            body={
              pantry.length
                ? `Your pantry matches ${partialMatch} recipes, but most need one more ingredient.`
                : 'Add a few staples to see what you can cook right now.'
            }
            actions={
              <ButtonLink variant="outline" to="/pantry">
                Fill your pantry
              </ButtonLink>
            }
          />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
          <SectionHeading
            title="This week"
            sub={`${plannedMeals} ${plannedMeals === 1 ? 'meal' : 'meals'} planned`}
            action={
              <Link
                to="/planner"
                className="text-sm font-medium text-primary hover:underline">
                Open planner
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {thisWeek.map((day) => (
              <div
                key={day.name}
                className="rounded-xl border border-border/70 bg-background/60 p-2 text-center">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {day.name.slice(0, 3)}
                </span>
                <span className="mt-1 block text-lg font-semibold">
                  {day.ids.length || '—'}
                </span>
              </div>
            ))}
          </div>
          {plannedMeals === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing planned yet. Pick a meal to start the week.
            </p>
          )}
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
          <SectionHeading
            title="Quick shortcuts"
            sub="Jump straight into a corner of the catalogue."
          />
          <div className="flex flex-wrap gap-2">
            {cuisines.map(([cuisine, count]) => (
              <Link
                key={cuisine}
                to={`/recipes?cuisine=${encodeURIComponent(cuisine)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
                {cuisine}
                <span className="text-[10px] text-muted-foreground">
                  {count}
                </span>
              </Link>
            ))}
          </div>
          <Link
            to="/recipes?time=30&sort=rating-desc"
            className="mt-5 flex items-center gap-2 rounded-xl bg-secondary/70 px-4 py-3 text-sm font-medium text-secondary-foreground hover:bg-secondary">
            <Clock3 size={16} aria-hidden="true" />
            {quickPicks.length} top-rated meals under 30 minutes
            <ArrowRight size={16} className="ml-auto" aria-hidden="true" />
          </Link>
        </Card>
      </section>

      {creations.length > 0 && (
        <section>
          <SectionHeading
            eyebrow="YOUR RECIPE BOX"
            title="Your recipes"
            sub="Local creations that live beside the public catalogue."
            action={
              <ButtonLink variant="outline" size="sm" to="/creations/new">
                Add a recipe
              </ButtonLink>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {creations.slice(0, 4).map((item) => (
              <RecipeCard
                key={item.id}
                item={item}
                evaluation={evaluateRecipe(item, ctx)}
              />
            ))}
          </div>
        </section>
      )}
    </PageLayout>
  )
}
