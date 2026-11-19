import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { queryOptions, useQuery } from '@tanstack/react-query'
import {
  BookmarkPlus,
  CalendarPlus,
  ChefHat,
  GitCompare,
  Heart,
  Share2,
} from 'lucide-react'
import { EMPTY_COOK_ENTRY, useCookbookStore } from '../stores/cookbook'
import { useCompareStore, MAX_COMPARE } from '../stores/compare'
import { useCreationsStore } from '../stores/creations'
import { usePantryStore } from '../stores/pantry'
import { usePlannerStore } from '../stores/planner'
import { useProfileStore } from '../stores/profile'
import { toast } from '../stores/toast'
import { fetchAuthor } from '../lib/api'
import { copyText } from '../lib/clipboard'
import { plural } from '../lib/format'
import {
  DIETS,
  allergenBadges,
  profileConflicts,
  type TasteProfile,
} from '../domain/taste'
import { evaluateRecipe, scoreTier } from '../domain/scoring'
import { weekKey, weekdayIndex } from '../domain/week'
import { useRecipes } from '../hooks/useRecipes'
import { useTasteSetup } from '../hooks/useTasteSetup'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageLayout, PageHeader, RecipeCard } from '../components/app-shared'
import {
  Badge,
  ButtonLink,
  ConfirmDialog,
  CopyFallbackDialog,
  Rating,
  ScoreRing,
} from '../components/primitives'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Checkbox } from '../components/ui/controls'
import { Textarea } from '../components/ui/textarea'
import { recipeIdFromSlug, recipeSlug } from '../types/recipe'

export default function RecipeDetail() {
  const { id: routeId } = useParams()
  const id = recipeIdFromSlug(routeId)
  const navigate = useNavigate()
  const { catalog, get } = useRecipes()
  const item = id ? get(id) : undefined
  useDocumentTitle(item?.recipe.name ?? 'Recipe')

  const { ctx } = useTasteSetup()
  const profile = useProfileStore((state) => state.profile)
  const favorites = useCookbookStore((state) => state.favorites)
  const notes = useCookbookStore((state) => state.notes)
  const ratings = useCookbookStore((state) => state.ratings)
  const cooked = useCookbookStore((state) => state.cooked)
  const toggleFavorite = useCookbookStore((state) => state.toggleFavorite)
  const setNote = useCookbookStore((state) => state.setNote)
  const rate = useCookbookStore((state) => state.rate)
  const logCook = useCookbookStore((state) => state.logCook)
  const compareIds = useCompareStore((state) => state.ids)
  const toggleCompare = useCompareStore((state) => state.toggle)
  const pantry = usePantryStore((state) => state.items)
  const togglePantry = usePantryStore((state) => state.toggle)
  const hasPantry = usePantryStore((state) => state.has)
  const assignToPlan = usePlannerStore((state) => state.assign)
  const deleteCreation = useCreationsStore((state) => state.deleteCreation)

  const [imageFailed, setImageFailed] = useState(false)
  const [copyFallback, setCopyFallback] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const authorId = item?.recipe.userId ?? 0
  const authorQuery = useQuery(
    queryOptions({
      queryKey: ['author', authorId],
      queryFn: ({ signal }) => fetchAuthor(authorId, signal),
      enabled: authorId > 0,
      staleTime: Infinity,
    }),
  )

  if (!item)
    return (
      <PageLayout>
        <PageHeader
          eyebrow="RECIPE NOT FOUND"
          title="We couldn't find that one."
          sub="The recipe may have been removed, or the link may be out of date."
          actions={<ButtonLink to="/recipes">Browse recipes</ButtonLink>}
        />
      </PageLayout>
    )

  const recipe = item.recipe
  const evaluation = evaluateRecipe(item, ctx)
  const entry = cooked[item.id] ?? EMPTY_COOK_ENTRY
  const conflicts = profile.createdAt ? profileConflicts(recipe, profile) : []
  const allergens = allergenBadges(recipe)
  const suitableDiets = DIETS.filter(
    (diet) =>
      profileConflicts(recipe, {
        diets: [diet],
        allergens: [],
        avoidIngredients: [],
      } satisfies Pick<
        TasteProfile,
        'diets' | 'allergens' | 'avoidIngredients'
      >).length === 0,
  )
  const related = catalog
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => {
      const sharedTags = candidate.recipe.tags.filter((tag) =>
        recipe.tags.includes(tag),
      ).length
      return {
        item: candidate,
        weight:
          (candidate.recipe.cuisine === recipe.cuisine ? 10 : 0) +
          sharedTags * 2 +
          candidate.recipe.rating,
      }
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map((row) => row.item)

  const favorite = Boolean(favorites[item.id])
  const inCompare = compareIds.includes(item.id)
  const myRating = ratings[item.id] ?? 0

  const share = async () => {
    const url = window.location.href
    if (await copyText(url)) toast.success('Recipe link copied')
    else {
      toast.error('Could not copy the link')
      setCopyFallback(url)
    }
  }

  const addToToday = () => {
    const today = new Date()
    assignToPlan(weekKey(today), weekdayIndex(today), item.id)
    toast.success('Added to today’s plan', recipe.name)
  }

  const compare = () => {
    if (!inCompare && compareIds.length >= MAX_COMPARE) {
      toast.error(
        'Compare tray is full',
        `Remove one of the ${MAX_COMPARE} recipes first.`,
      )
      return
    }
    const added = toggleCompare(item.id)
    toast.success(
      added ? 'Added to compare' : 'Removed from compare',
      recipe.name,
    )
  }

  const removeCreation = async () => {
    const result = await deleteCreation(item.id)
    if (result.synced) toast.success('Recipe deleted', recipe.name)
    else toast.info('Recipe removed', 'It is gone from your kitchen.')
    navigate('/recipes')
  }

  return (
    <PageLayout className="space-y-8">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 w-fit"
        onClick={() => navigate(-1)}>
        ← Back to recipes
      </Button>

      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
            <Badge tone="sage">{recipe.cuisine}</Badge>
            {recipe.mealType.map((meal) => (
              <Badge key={meal} tone="neutral">
                {meal}
              </Badge>
            ))}
            <Badge tone="amber" glyph="★">
              {recipe.rating.toFixed(1)}
            </Badge>
            {item.source === 'mine' && <Badge tone="dark">Your recipe</Badge>}
          </div>
          <h1 className="font-heading text-4xl leading-tight tracking-tight sm:text-5xl">
            {recipe.name}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {recipe.difficulty} <span>·</span>{' '}
            {recipe.prepTimeMinutes + recipe.cookTimeMinutes} minutes
            {entry.count > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <ChefHat size={15} aria-hidden="true" /> Cooked {entry.count}×
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={() => void share()}>
            <Share2 size={16} aria-hidden="true" /> Share
          </Button>
          <Button variant="ghost" onClick={() => toggleFavorite(item.id)}>
            <Heart
              size={17}
              fill={favorite ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            {favorite ? 'Saved' : 'Save recipe'}
          </Button>
          <Button onClick={() => logCook(item.id)}>
            <ChefHat size={17} aria-hidden="true" /> I cooked this
          </Button>
          {item.source === 'mine' && (
            <>
              <ButtonLink
                variant="outline"
                to={`/creations/${recipeSlug(item.id)}/edit`}>
                Edit
              </ButtonLink>
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)]">
        <div className="min-w-0 space-y-8">
          {imageFailed || !recipe.image ? (
            <div className="grid aspect-[16/10] w-full place-items-center rounded-2xl bg-secondary text-6xl text-secondary-foreground">
              <span aria-hidden="true">🍽️</span>
              <span className="sr-only">
                No photo available for {recipe.name}
              </span>
            </div>
          ) : (
            <img
              className="aspect-[16/10] w-full rounded-2xl object-cover"
              src={recipe.image}
              alt={recipe.name}
              onError={() => setImageFailed(true)}
            />
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/70">
              <b className="block text-xl">
                {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
              </b>
              <small className="text-xs text-muted-foreground">
                {recipe.prepTimeMinutes} prep · {recipe.cookTimeMinutes} cook
              </small>
            </Card>
            <Card className="rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/70">
              <b className="block text-xl">{recipe.caloriesPerServing}</b>
              <small className="text-xs text-muted-foreground">
                kcal / serving
              </small>
            </Card>
            <Card className="rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/70">
              <b className="block text-xl">{recipe.servings}</b>
              <small className="text-xs text-muted-foreground">servings</small>
            </Card>
            <Card className="rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/70">
              <b className="block text-xl">{recipe.tags.length}</b>
              <small className="text-xs text-muted-foreground">
                {recipe.difficulty} · {plural(recipe.tags.length, 'tag')}
              </small>
            </Card>
          </div>

          <section className="space-y-3 border-b border-border pb-7">
            <h2 className="font-heading text-2xl">What you&apos;ll need</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              This source doesn&apos;t include quantities. Tick an ingredient to
              add it to your pantry.
            </p>
            <ul className="space-y-1">
              {recipe.ingredients.map((ingredient) => {
                const owned = hasPantry(ingredient)
                return (
                  <li
                    key={ingredient}
                    className="flex items-start gap-3 rounded-lg px-1 py-1.5 text-sm">
                    <Checkbox
                      checked={owned}
                      onCheckedChange={() => togglePantry(ingredient)}
                      label={`${owned ? 'Remove' : 'Add'} ${ingredient} ${owned ? 'from' : 'to'} pantry`}
                      className="mt-0.5"
                    />
                    <span
                      className={
                        owned
                          ? 'text-muted-foreground line-through decoration-primary/40'
                          : undefined
                      }>
                      {ingredient}
                    </span>
                    {owned && (
                      <Badge tone="sage" className="ml-auto shrink-0">
                        on hand
                      </Badge>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              {pantry.length
                ? `Matching is fuzzy: ${plural(pantry.length, 'pantry item')} checked against normalised ingredient keys.`
                : 'Your pantry is empty, so nothing is marked on hand yet.'}
            </p>
          </section>

          <section className="space-y-3 border-b border-border pb-7">
            <h2 className="font-heading text-2xl">Let&apos;s make it</h2>
            {recipe.instructions.map((step, index) => (
              <div
                className="flex gap-4 border-b border-border py-3 text-sm leading-6"
                key={`${index}-${step.slice(0, 24)}`}>
                <b className="text-primary">
                  {String(index + 1).padStart(2, '0')}
                </b>
                <p>{step}</p>
              </div>
            ))}
          </section>

          <section className="space-y-3 border-b border-border pb-7">
            <h2 className="font-heading text-2xl">Your private notes</h2>
            <Textarea
              className="min-h-24 w-full resize-y rounded-xl border border-border bg-card px-3 py-3 text-xs"
              placeholder="What did you change? Would you make it again?"
              aria-label="Your private note"
              value={notes[item.id] ?? ''}
              onChange={(event) => setNote(item.id, event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your notes update as you type.
            </p>
          </section>

          {allergens.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-heading text-2xl">Contains</h2>
              <div className="flex flex-wrap gap-2">
                {allergens.map((allergen) => (
                  <Badge key={allergen.id} tone="amber" glyph={allergen.glyph}>
                    {allergen.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Keyword detection is a helpful hint, not a safety guarantee.
                Always check the source recipe.
              </p>
            </section>
          )}

          {recipe.tags.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-heading text-2xl">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/recipes?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    {tag}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="space-y-3 rounded-2xl border border-border p-5 shadow-none ring-0">
            <h2 className="font-heading text-xl">Make it yours</h2>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => toggleFavorite(item.id)}>
              <Heart
                size={16}
                fill={favorite ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              {favorite ? 'Remove from favourites' : 'Save to favourites'}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={addToToday}>
              <CalendarPlus size={16} aria-hidden="true" /> Add to today&apos;s
              plan
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={compare}>
              <GitCompare size={16} aria-hidden="true" />
              {inCompare ? 'Remove from compare' : 'Add to compare'}
            </Button>
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Your rating</span>
                <Rating
                  value={myRating}
                  onChange={(value) => {
                    rate(item.id, value)
                    toast.success(`Rated ${value} / 5`, recipe.name)
                  }}
                />
              </div>
              {entry.lastCooked && (
                <p className="text-xs text-muted-foreground">
                  Last cooked {new Date(entry.lastCooked).toLocaleDateString()}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  logCook(item.id)
                  toast.success('Cook logged', recipe.name)
                }}>
                <BookmarkPlus size={15} aria-hidden="true" /> Log another cook
              </Button>
            </div>
          </Card>

          <Card className="space-y-4 rounded-2xl border border-border p-5 shadow-none ring-0">
            <div className="flex items-center gap-4">
              <ScoreRing
                score={evaluation.score}
                eligible={evaluation.eligible}
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Your match
                </p>
                <h2 className="mt-1 font-heading text-xl">
                  {evaluation.eligible
                    ? scoreTier(evaluation.score)
                    : 'Off-menu'}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {evaluation.personalized
                    ? 'Weighted against your profile'
                    : 'Catalogue rating — finish onboarding for a personal score'}
                </p>
              </div>
            </div>
            {evaluation.reasons.length > 0 && (
              <ul className="space-y-2 border-t border-border pt-4">
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
                          ? 'font-medium text-destructive'
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

          {conflicts.length > 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">
              <b>Why it is off your menu</b>
              <ul className="mt-2 space-y-1">
                {conflicts.map((conflict) => (
                  <li key={conflict.id}>
                    {conflict.glyph} {conflict.label}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Ingredient matching is a helpful hint, not a safety guarantee.
              </p>
            </div>
          )}

          <Card className="rounded-2xl border border-border p-5 shadow-none ring-0">
            <h2 className="font-heading text-xl">Suitable for</h2>
            {suitableDiets.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {suitableDiets.map((diet) => (
                  <Badge key={diet} tone="sage">
                    {diet}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No listed diet fits this recipe with certainty.
              </p>
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
        </aside>
      </div>

      {related.length > 0 && (
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                <span className="size-1.5 rounded-full bg-primary" /> KEEP
                COOKING
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl">
                More like this
              </h2>
            </div>
            <Link
              className="text-sm font-medium text-primary hover:underline"
              to={`/recipes?cuisine=${encodeURIComponent(recipe.cuisine)}`}>
              More {recipe.cuisine}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((candidate) => (
              <RecipeCard
                key={candidate.id}
                item={candidate}
                evaluation={evaluateRecipe(candidate, ctx)}
              />
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this recipe?"
        description="This deletes the recipe from this browser. It can’t be undone."
        confirmLabel="Delete recipe"
        destructive
        onConfirm={() => void removeCreation()}
      />

      <CopyFallbackDialog
        open={Boolean(copyFallback)}
        onOpenChange={(open) => !open && setCopyFallback('')}
        value={copyFallback}
        title="Copy this recipe link"
      />
    </PageLayout>
  )
}
