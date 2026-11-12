import { Link, useOutletContext } from 'react-router'
import {
  ArrowRight,
  Bookmark,
  ChefHat,
  GitCompare,
  ShoppingBasket,
  Sparkles,
} from 'lucide-react'
import { useKitchenStore } from '../stores/kitchen'
import { useProfileStore } from '../stores/profile'
import { rankRecipes } from '../domain/scoring'
import type { CatalogRecipe } from '../types/recipe'
import { PageLayout, RecipeCard } from '../components/app-shared'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { evaluatePantry, canCookNow, pantryTokens } from '../domain/pantry'
import { weekKey } from '../domain/week'
import { useTasteSetup } from '../hooks/useTasteSetup'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Home() {
  useDocumentTitle('Home')
  const catalog = useOutletContext<CatalogRecipe[]>()
  const profile = useProfileStore((s) => s.profile)
  const kitchen = useKitchenStore()
  const { ctx, personalised } = useTasteSetup()
  const personalized = personalised
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const planned = Object.values(kitchen.weeks[weekKey(new Date())] ?? {}).flat()
    .length
  const tokens = pantryTokens(kitchen.pantry)
  const pantryReady = catalog
    .filter((item) => canCookNow(item.recipe, tokens))
    .slice(0, 4)
  const mostCookedId = Object.entries(kitchen.cooked).sort(
    (a, b) => b[1].count - a[1].count,
  )[0]?.[0]
  const mostCookedName = catalog.find((item) => item.id === mostCookedId)
    ?.recipe.name
  const ranked = rankRecipes(catalog, ctx)
  const shortlist = personalized
    ? ranked.slice(0, 4)
    : [...catalog].sort((a, b) => b.recipe.rating - a.recipe.rating).slice(0, 4)
  return (
    <PageLayout className="space-y-8">
      <section className="relative grid overflow-hidden rounded-[2rem] bg-secondary/70 p-6 sm:p-10 lg:min-h-[28rem] lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-8 lg:p-12">
        <div className="relative z-10 max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> YOUR KITCHEN,
            REIMAGINED
          </div>
          <h1 className="font-heading text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            {personalized ? (
              <>
                Something that fits your <em className="text-primary">taste</em>
                , not a random dinner.
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
            {personalized
              ? 'Your next favorite is waiting.'
              : 'A personal recipe book that fits your tastes, your time, and what is already in your kitchen.'}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              render={<Link to={personalized ? '/foryou' : '/onboarding'} />}>
              {personalized ? 'See your matches' : 'Make it yours'}
              <ArrowRight size={17} />
            </Button>
            <Button variant="ghost" render={<Link to="/recipes" />}>
              Explore all recipes
            </Button>
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
              alt={catalog[0].recipe.name}
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
              Today's little reminder
            </span>
            <p className="mt-1 font-heading text-2xl">
              Make something you love.
            </p>
          </div>
        </div>
      </section>
      <section className="my-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/cookbook">
          <Card className="flex h-full w-full flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-none ring-1 ring-border/70 transition-transform hover:-translate-y-0.5">
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <Bookmark size={19} />
            </span>
            <span>
              <b className="block text-xl">
                {Object.keys(kitchen.favorites).length}
              </b>
              <small className="text-xs text-muted-foreground">
                saved recipes
              </small>
            </span>
            <ArrowRight size={16} />
          </Card>
        </Link>
        <Link to="/pantry">
          <Card className="flex h-full w-full flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-none ring-1 ring-border/70 transition-transform hover:-translate-y-0.5">
            <span className="grid size-10 place-items-center rounded-xl bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100">
              <ShoppingBasket size={19} />
            </span>
            <span>
              <b className="block text-xl">{kitchen.pantry.length}</b>
              <small className="text-xs text-muted-foreground">
                {pantryReady.length} ready to cook now
              </small>
            </span>
            <ArrowRight size={16} />
          </Card>
        </Link>
        <Link to="/compare">
          <Card className="flex h-full w-full flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-none ring-1 ring-border/70 transition-transform hover:-translate-y-0.5">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <GitCompare size={19} />
            </span>
            <span>
              <b className="block text-xl">{kitchen.compare.length}</b>
              <small className="text-xs text-muted-foreground">
                in your compare tray
              </small>
            </span>
            <span className="ml-auto max-w-24 text-right text-[10px] leading-4 text-muted-foreground">
              {mostCookedName
                ? `Most cooked: ${mostCookedName}`
                : 'Compare your favorites'}
            </span>
          </Card>
        </Link>
        <Link to="/planner">
          <Card className="flex h-full w-full flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-none ring-1 ring-border/70 transition-transform hover:-translate-y-0.5">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ChefHat size={19} />
            </span>
            <span>
              <b className="block text-xl">{planned}/7</b>
              <small className="text-xs text-muted-foreground">
                meals planned
              </small>
            </span>
            <ArrowRight size={16} />
          </Card>
        </Link>
      </section>
      <section className="my-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <span className="size-1.5 rounded-full bg-primary" /> A FEW GOOD
              IDEAS
            </div>
            <h2 className="font-heading text-3xl">
              {personalized
                ? 'Picked for your kind of day'
                : 'A little inspiration'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {personalized
                ? 'A short list, thoughtfully matched to you.'
                : 'A few favorites to get you started.'}
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            to={personalized ? '/foryou' : '/recipes'}>
            See all recipes <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shortlist.map((item) => (
            <RecipeCard key={item.id} item={item} />
          ))}
        </div>
      </section>
      <section className="my-12 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
          <Sparkles />
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            YOUR TASTE, YOUR RULES
          </div>
          <h2 className="font-heading text-2xl">
            {personalized
              ? 'Your profile makes every browse feel personal.'
              : 'Recipes that get to know you.'}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Set your dietary needs, spice comfort zone, and time budget. We’ll
            do the sorting.
          </p>
        </div>
        <Button variant="secondary" render={<Link to="/profile" />}>
          {personalized ? 'Tune your profile' : 'Set up your taste'}
          <ArrowRight size={17} />
        </Button>
      </section>
      <section className="my-14">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              From your pantry
            </p>
            <h2 className="mt-2 font-heading text-3xl">Ready to cook now</h2>
          </div>
          <Link
            className="text-sm font-medium text-primary hover:underline"
            to="/pantry">
            Manage pantry
          </Link>
        </div>
        {pantryReady.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pantryReady.map((item) => (
              <RecipeCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-dashed p-5 shadow-none">
            <p className="text-sm text-muted-foreground">
              {kitchen.pantry.length
                ? `Your pantry matches ${catalog.filter((item) => evaluatePantry(item.recipe, tokens).coverage > 0).length} recipes, but each needs one more ingredient.`
                : 'Add a few staples to see what you can cook right now.'}
            </p>
            <Button variant="outline" render={<Link to="/pantry" />}>
              Fill your pantry
            </Button>
          </Card>
        )}
      </section>
    </PageLayout>
  )
}
