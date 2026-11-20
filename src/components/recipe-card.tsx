import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Tooltip } from '@base-ui/react/tooltip'
import { Clock3, GitCompare, Heart, Star } from 'lucide-react'
import { useCookbookStore } from '../stores/cookbook'
import { MAX_COMPARE, useCompareStore } from '../stores/compare'
import { toast } from '../stores/toast'
import type { CatalogRecipe } from '../types/recipe'
import { recipeSlug } from '../types/recipe'
import type { RecipeEvaluation } from '../domain/scoring'
import { ScorePill } from './primitives'
import { Badge } from './primitives'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export function RecipeCard({
  item,
  evaluation,
  actions,
}: {
  item: CatalogRecipe
  evaluation?: RecipeEvaluation
  actions?: ReactNode
}) {
  const recipe = item.recipe
  const favorite = useCookbookStore((state) =>
    Boolean(state.favorites[item.id]),
  )
  const toggle = useCookbookStore((state) => state.toggleFavorite)
  const cooked = useCookbookStore((state) => state.cooked[item.id]?.count ?? 0)
  const myRating = useCookbookStore((state) => state.ratings[item.id] ?? 0)
  const inCompare = useCompareStore((state) => state.ids.includes(item.id))
  const compareCount = useCompareStore((state) => state.ids.length)
  const toggleCompare = useCompareStore((state) => state.toggle)

  const onCompare = () => {
    if (!inCompare && compareCount >= MAX_COMPARE) {
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
  return (
    <Card className="group/recipe relative gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <Link
        to={`/recipes/${recipeSlug(item.id)}`}
        className="relative block aspect-[16/10] overflow-hidden bg-muted">
        <img
          className="size-full object-cover transition-transform duration-500 group-hover/recipe:scale-105"
          src={recipe.image}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.visibility = 'hidden'
          }}
        />
        {evaluation?.personalized && (
          <span className="absolute left-3 top-3">
            <ScorePill
              score={evaluation.score}
              eligible={evaluation.eligible}
              className="bg-background/95 shadow-sm ring-1 ring-black/5"
            />
          </span>
        )}
        <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium">
          {recipe.cuisine}
        </span>
        {item.source === 'mine' && (
          <Badge tone="dark" className="absolute bottom-3 right-3 text-[10px]">
            Your recipe
          </Badge>
        )}
      </Link>
      <Tooltip.Provider delay={300}>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full bg-card/90 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={
                    favorite
                      ? `Remove ${recipe.name} from favourites`
                      : `Save ${recipe.name} to favourites`
                  }
                  aria-pressed={favorite}
                  onClick={() => {
                    toggle(item.id)
                    toast.success(
                      favorite
                        ? 'Removed from favourites'
                        : 'Saved to favourites',
                      recipe.name,
                    )
                  }}>
                  <Heart
                    size={17}
                    fill={favorite ? 'currentColor' : 'none'}
                    className={
                      favorite ? 'text-rose-700 dark:text-rose-300' : undefined
                    }
                  />
                </Button>
              }
            />
            <Tooltip.Portal>
              <Tooltip.Positioner side="left" sideOffset={8}>
                <Tooltip.Popup className="z-50 rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md">
                  {favorite ? 'Remove from favourites' : 'Save to favourites'}
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full bg-card/90 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={
                    inCompare
                      ? `Remove ${recipe.name} from compare`
                      : `Add ${recipe.name} to compare`
                  }
                  aria-pressed={inCompare}
                  onClick={onCompare}>
                  <GitCompare
                    size={16}
                    className={inCompare ? 'text-primary' : undefined}
                  />
                </Button>
              }
            />
            <Tooltip.Portal>
              <Tooltip.Positioner side="left" sideOffset={8}>
                <Tooltip.Popup className="z-50 rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md">
                  {inCompare ? 'Remove from compare' : 'Add to compare'}
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </Tooltip.Provider>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {recipe.mealType[0] ?? 'Recipe'} · {recipe.difficulty}
        </div>
        <Link
          to={`/recipes/${recipeSlug(item.id)}`}
          className="line-clamp-2 font-heading text-xl leading-tight hover:text-primary">
          {recipe.name}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} aria-hidden="true" />
            {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
          </span>
          <span
            className="inline-flex items-center gap-1.5"
            title={
              myRating
                ? `Your rating: ${myRating}/5 · Community: ${recipe.rating.toFixed(1)}/5`
                : `Community rating: ${recipe.rating.toFixed(1)}/5`
            }>
            <Star
              size={13}
              fill={myRating ? 'currentColor' : 'none'}
              className="text-amber-600"
              aria-hidden="true"
            />
            {recipe.rating.toFixed(1)}
            {myRating > 0 && (
              <span className="sr-only">
                {' '}
                · You rated this {myRating} out of 5{' '}
              </span>
            )}
            {cooked > 0 && (
              <span className="text-[10px]">· cooked {cooked}×</span>
            )}
          </span>
        </div>
      </CardContent>
      {actions ? (
        <div className="border-t border-border/70 bg-card px-4 py-3">
          {actions}
        </div>
      ) : null}
    </Card>
  )
}

export function RecipeGrid({
  items,
  evaluations,
}: {
  items: CatalogRecipe[]
  evaluations?: Map<string, RecipeEvaluation>
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <RecipeCard
          key={item.id}
          item={item}
          evaluation={evaluations?.get(item.id)}
        />
      ))}
    </div>
  )
}
