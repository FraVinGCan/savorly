import { Link, useNavigate, useOutletContext, useParams } from 'react-router'
import { Clock3, Heart } from 'lucide-react'
import { useKitchenStore } from '../stores/kitchen'
import { useProfileStore } from '../stores/profile'
import { profileConflicts } from '../domain/taste'
import { weekdayIndex, weekKey } from '../domain/week'
import type { CatalogRecipe, RecipeId } from '../types/recipe'
import { PageLayout, PageTitle } from '../components/app-shared'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Card } from '../components/ui/card'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchAuthor } from '../lib/api'
import { evaluateRecipe, scoreTier } from '../domain/scoring'
import { useTasteSetup } from '../hooks/useTasteSetup'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Detail() {
  const catalog = useOutletContext<CatalogRecipe[]>()
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const id = (routeId ?? '') as RecipeId
  const item = catalog.find((x) => x.id === id)
  useDocumentTitle(item?.recipe.name ?? 'Recipe')
  const { ctx } = useTasteSetup()
  const authorId = item?.recipe.userId ?? 0
  const authorQuery = useQuery(
    queryOptions({
      queryKey: ['author', authorId],
      queryFn: ({ signal }) => fetchAuthor(authorId, signal),
      enabled: authorId > 0,
      staleTime: Infinity,
    }),
  )
  const profile = useProfileStore((s) => s.profile)
  const kitchen = useKitchenStore()
  if (!item)
    return (
      <PageLayout>
        <PageTitle
          eyebrow="RECIPE NOT FOUND"
          title="We couldn't find that one."
          sub="Try browsing the recipe box instead."
        />
        <Button render={<Link to="/recipes" />}>Browse recipes</Button>
      </PageLayout>
    )
  const r = item.recipe
  const evaluation = evaluateRecipe(item, ctx)
  const shareRecipe = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copy this recipe link', url)
    }
  }
  const conflicts = profile.createdAt ? profileConflicts(r, profile) : []
  return (
    <PageLayout className="space-y-8">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 w-fit"
        onClick={() => navigate(-1)}>
        ← Back to recipes
      </Button>
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
            {r.cuisine} · {r.mealType.join(' / ')}
          </div>
          <h1 className="font-heading text-4xl leading-tight tracking-tight sm:text-5xl">
            {r.name}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {r.rating.toFixed(1)} ★ <span>·</span> {r.difficulty} <span>·</span>{' '}
            {r.prepTimeMinutes + r.cookTimeMinutes} minutes
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void shareRecipe()}>
            Share
          </Button>
          <Button variant="ghost" onClick={() => kitchen.toggleFavorite(id)}>
            <Heart size={17} />{' '}
            {kitchen.favorites[id] ? 'Saved' : 'Save recipe'}
          </Button>
          <Button onClick={() => kitchen.logCook(id)}>I made this</Button>
          {item.source === 'mine' && (
            <>
              <Button
                variant="outline"
                render={<Link to={`/creations/${id}/edit`} />}>
                Edit
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (
                    window.confirm(
                      'Delete this local recipe? This action cannot be undone.',
                    )
                  ) {
                    kitchen.removeCreation(id)
                    navigate('/recipes')
                  }
                }}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <div className="min-w-0 space-y-8">
          <img
            className="aspect-[16/10] w-full rounded-2xl object-cover"
            src={r.image}
            alt={r.name}
          />
          <Card className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/70">
            <div className="space-y-1">
              <b className="block text-xl">
                {r.prepTimeMinutes + r.cookTimeMinutes} min
              </b>
              <small className="text-xs text-muted-foreground">
                Total time
              </small>
            </div>
            <div className="space-y-1">
              <b className="block text-xl">{r.caloriesPerServing}</b>
              <small className="text-xs text-muted-foreground">
                Calories / serving
              </small>
            </div>
            <div className="space-y-1">
              <b className="block text-xl">{r.servings}</b>
              <small className="text-xs text-muted-foreground">Servings</small>
            </div>
          </Card>
          <section className="space-y-4 border-b border-border pb-7">
            <h2 className="font-heading text-2xl">What you'll need</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              A little note: this source doesn't include quantities.
            </p>
            {r.ingredients.map((x, i) => (
              <label
                className="flex items-start gap-3 rounded-lg py-2 text-sm"
                key={i}>
                <input type="checkbox" />
                <span>{x}</span>
              </label>
            ))}
          </section>
          <section className="space-y-4 border-b border-border pb-7">
            <h2 className="font-heading text-2xl">Let's make it</h2>
            {r.instructions.map((x, i) => (
              <div
                className="flex gap-4 border-b border-border py-3 text-sm leading-6"
                key={i}>
                <b>{String(i + 1).padStart(2, '0')}</b>
                <p>{x}</p>
              </div>
            ))}
          </section>
          <section className="space-y-4 border-b border-border pb-7">
            <h2 className="font-heading text-2xl">Your private notes</h2>
            <Textarea
              className="min-h-24 w-full resize-y rounded-xl border border-border bg-card px-3 py-3 text-xs"
              placeholder="What did you change? Would you make it again?"
              value={kitchen.notes[id] ?? ''}
              onChange={(e) => kitchen.setNote(id, e.target.value)}
            />
          </section>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="space-y-3 rounded-2xl border border-border p-5 shadow-none ring-0">
            <h3 className="font-heading text-xl">At a glance</h3>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 size={16} /> Prep {r.prepTimeMinutes} min · Cook{' '}
              {r.cookTimeMinutes} min
            </p>
            <p className="text-sm text-muted-foreground">
              ★ Community rating {r.rating.toFixed(1)} / 5
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => kitchen.toggleCompare(id)}>
              ＋ Add to compare
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const today = new Date()
                kitchen.assign(weekKey(today), weekdayIndex(today), id)
                navigate('/planner')
              }}>
              Add to today's plan
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => kitchen.rate(id, 5)}>
              Rate this recipe ☆
            </Button>
          </Card>
          <Card className="rounded-2xl border border-border p-5 shadow-none ring-0">
            <div className="flex items-center gap-4">
              <div
                className="grid size-16 shrink-0 place-items-center rounded-full p-[5px]"
                style={{
                  background: `conic-gradient(var(--primary) ${evaluation.score * 3.6}deg, var(--muted) 0)`,
                }}>
                <div className="grid size-full place-items-center rounded-full bg-card text-lg font-semibold">
                  {evaluation.eligible ? evaluation.score : '—'}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Your match
                </p>
                <h3 className="mt-1 font-heading text-xl">
                  {evaluation.eligible
                    ? scoreTier(evaluation.score)
                    : 'Off-menu'}
                </h3>
              </div>
            </div>
            {evaluation.reasons.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-border pt-4">
                {evaluation.reasons.map((reason) => (
                  <li
                    className="flex items-start justify-between gap-3 text-xs"
                    key={reason.id}>
                    <span className="text-muted-foreground">
                      {reason.label}
                    </span>
                    <span
                      className={
                        reason.weight < 0
                          ? 'text-destructive'
                          : 'font-medium text-primary'
                      }>
                      {reason.weight > 0 ? '+' : ''}
                      {Math.round(reason.weight)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {authorId > 0 && (
            <Card className="flex items-center gap-3 rounded-2xl border border-border p-4 shadow-none ring-0">
              <div className="grid size-10 place-items-center rounded-full bg-secondary font-heading text-lg text-primary">
                {authorQuery.data?.firstName?.[0] ?? 'C'}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Recipe contributor
                </p>
                <p className="text-sm font-medium">
                  {authorQuery.data
                    ? `${authorQuery.data.firstName} ${authorQuery.data.lastName}`
                    : 'Community cook'}
                </p>
              </div>
            </Card>
          )}
          {conflicts.length > 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">
              <b>May not fit your profile</b>
              <p>
                {conflicts.map((conflict) => conflict.label).join(', ')}.
                Ingredient matching is a helpful hint, not a safety guarantee.
              </p>
            </div>
          )}
        </aside>
      </div>
    </PageLayout>
  )
}
