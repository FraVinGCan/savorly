import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Bookmark,
  ChefHat,
  NotebookPen,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react'
import { useCookbookStore } from '../stores/cookbook'
import { useCreationsStore } from '../stores/creations'
import { toast } from '../stores/toast'
import { useRecipes } from '../hooks/useRecipes'
import { useTasteSetup } from '../hooks/useTasteSetup'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { evaluateRecipe } from '../domain/scoring'
import { average, formatDate, plural } from '../lib/format'
import { PageHeader, PageLayout, RecipeCard } from '../components/app-shared'
import {
  Badge,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  Rating,
  Stat,
} from '../components/primitives'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { TabGroup } from '../components/ui/tabs'
import type { RecipeId } from '../types/recipe'
import { recipeSlug } from '../types/recipe'

type CookbookTab = 'saved' | 'cooked' | 'notes' | 'rated' | 'mine'

const LABELS: Record<CookbookTab, string> = {
  saved: 'Favourites',
  cooked: 'Cooked',
  notes: 'Notes',
  rated: 'Rated',
  mine: 'My recipes',
}

const TAB_VALUES = Object.keys(LABELS) as CookbookTab[]

function tabFromParam(value: string | null): CookbookTab {
  return TAB_VALUES.find((tab) => tab === value) ?? 'saved'
}

export default function Cookbook() {
  useDocumentTitle('Cookbook')
  const { ctx } = useTasteSetup()
  const { byId, catalog, get } = useRecipes()
  const favorites = useCookbookStore((state) => state.favorites)
  const cooked = useCookbookStore((state) => state.cooked)
  const notes = useCookbookStore((state) => state.notes)
  const ratings = useCookbookStore((state) => state.ratings)
  const forget = useCookbookStore((state) => state.forget)
  const deleteCreation = useCreationsStore((state) => state.deleteCreation)
  const forgetCreation = useCreationsStore((state) => state.forgetCreation)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = tabFromParam(searchParams.get('tab'))
  const [forgetTarget, setForgetTarget] = useState<{
    id: RecipeId
    name: string
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: RecipeId
    name: string
  } | null>(null)

  const selectTab = (next: CookbookTab) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      if (next === 'saved') params.delete('tab')
      else params.set('tab', next)
      return params
    })
  }

  const savedIds = useMemo(
    () =>
      Object.entries(favorites)
        .sort((a, b) => b[1].localeCompare(a[1]))
        .map(([id]) => id as RecipeId),
    [favorites],
  )
  const cookedIds = useMemo(
    () =>
      Object.entries(cooked)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([id]) => id as RecipeId),
    [cooked],
  )
  const noteIds = useMemo(() => Object.keys(notes) as RecipeId[], [notes])
  const ratedIds = useMemo(
    () =>
      Object.entries(ratings)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id as RecipeId),
    [ratings],
  )
  const mineIds = useMemo(
    () =>
      catalog.filter((item) => item.source === 'mine').map((item) => item.id),
    [catalog],
  )

  const timesCooked = Object.values(cooked).reduce(
    (sum, entry) => sum + entry.count,
    0,
  )
  const avgRating = average(Object.values(ratings))
  const recentCooks = Object.entries(cooked)
    .flatMap(([id, entry]) =>
      entry.history.map((iso) => ({ id: id as RecipeId, iso })),
    )
    .sort((a, b) => b.iso.localeCompare(a.iso))
    .slice(0, 8)

  const idsFor: Record<CookbookTab, RecipeId[]> = {
    saved: savedIds,
    cooked: cookedIds,
    notes: noteIds,
    rated: ratedIds,
    mine: mineIds,
  }
  const activeIds = idsFor[tab]
  const activeItems = activeIds.flatMap((id) => {
    const item = byId.get(id)
    return item ? [item] : []
  })

  const list = (tabular: boolean) =>
    activeItems.length ? (
      <div
        className={
          tab === 'notes'
            ? 'space-y-3'
            : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }>
        {activeItems.map((item) => (
          <div key={item.id} className="space-y-2">
            <RecipeCard item={item} evaluation={evaluateRecipe(item, ctx)} />
            {tab === 'notes' && (
              <Card className="rounded-xl border border-border bg-card p-4 text-sm leading-6 shadow-none">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-foreground">
                  <NotebookPen size={14} aria-hidden="true" /> Note on{' '}
                  {item.recipe.name}
                </div>
                <p className="text-muted-foreground">{notes[item.id]}</p>
              </Card>
            )}
            {tabular && tab === 'mine' && (
              <div className="flex flex-wrap items-center gap-2 px-1">
                <ButtonLink
                  variant="outline"
                  size="sm"
                  to={`/creations/${recipeSlug(item.id)}/edit`}>
                  <Pencil size={14} aria-hidden="true" /> Edit
                </ButtonLink>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() =>
                    setDeleteTarget({ id: item.id, name: item.recipe.name })
                  }>
                  <Trash2 size={14} aria-hidden="true" /> Delete
                </Button>
              </div>
            )}
            {tabular && tab !== 'mine' && (
              <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
                {tab === 'cooked' && (
                  <Badge tone="sage" glyph="🍳">
                    Cooked {cooked[item.id]?.count ?? 0}×
                  </Badge>
                )}
                {tab === 'rated' && (
                  <Rating
                    value={ratings[item.id] ?? 0}
                    label={`Your rating for ${item.recipe.name}`}
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={() =>
                    setForgetTarget({ id: item.id, name: item.recipe.name })
                  }>
                  Forget
                </Button>
              </div>
            )}
            {!tabular && (
              <div className="flex justify-end px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() =>
                    setForgetTarget({ id: item.id, name: item.recipe.name })
                  }>
                  Forget
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    ) : tab === 'mine' ? (
      <EmptyState
        glyph="✍️"
        title="No recipes of your own yet"
        body="Add one and it becomes part of your kitchen — ready to cook, rate and come back to."
        actions={<ButtonLink to="/creations/new">Add a recipe</ButtonLink>}
      />
    ) : (
      <EmptyState
        glyph="📖"
        title={`No ${LABELS[tab].toLowerCase()} yet`}
        body={`Recipes you ${tab === 'saved' ? 'save' : tab === 'cooked' ? 'cook' : tab === 'notes' ? 'write notes on' : 'rate'} will appear here.`}
        actions={<ButtonLink href="/recipes">Browse recipes</ButtonLink>}
      />
    )

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    const result = await deleteCreation(target.id)
    if (result.synced) toast.success('Recipe deleted', target.name)
    else {
      forgetCreation(target.id)
      toast.info('Recipe removed', 'It is gone from your kitchen.')
    }
  }

  return (
    <PageLayout className="space-y-8">
      <PageHeader
        eyebrow="YOUR KEEPSAKES"
        title="Recipes worth keeping."
        sub="All the recipes you've saved, cooked, noted, rated and created."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Bookmark size={19} />}
          value={savedIds.length}
          label="saved recipes"
          hint="Favourites, newest first"
        />
        <Stat
          icon={<ChefHat size={19} />}
          value={timesCooked}
          label="times cooked"
          hint={plural(cookedIds.length, 'recipe')}
        />
        <Stat
          icon={<NotebookPen size={19} />}
          value={noteIds.length}
          label="notes written"
        />
        <Stat
          icon={<Star size={19} />}
          value={avgRating ? avgRating.toFixed(1) : '—'}
          label="average your rating"
          hint={plural(ratedIds.length, 'rated recipe')}
        />
      </div>

      <TabGroup
        label="Cookbook sections"
        value={tab}
        onValueChange={selectTab}
        items={TAB_VALUES.map((value) => ({
          value,
          label: LABELS[value],
          count: idsFor[value].length,
          content: (
            <div className="space-y-5">
              {value === 'cooked' && recentCooks.length > 0 && (
                <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
                  <h2 className="font-heading text-xl">Recent cook log</h2>
                  <ol className="mt-3 divide-y divide-border">
                    {recentCooks.map((entry) => (
                      <li
                        key={`${entry.id}-${entry.iso}`}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <span>
                          {get(entry.id)?.recipe.name ?? 'Removed recipe'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.iso, true)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
              {list(true)}
            </div>
          ),
        }))}
      />

      <ConfirmDialog
        open={Boolean(forgetTarget)}
        onOpenChange={(open) => !open && setForgetTarget(null)}
        title={`Forget ${forgetTarget?.name ?? 'this recipe'}?`}
        description="This removes its favourite mark, note, rating and cook history from this browser. A full cookbook reset would remove that for every recipe; this only affects the one you chose."
        confirmLabel="Forget this recipe"
        destructive
        onConfirm={() => {
          if (!forgetTarget) return
          forget(forgetTarget.id)
          toast.success('Recipe forgotten', forgetTarget.name)
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? 'this recipe'}?`}
        description="This deletes the recipe from this device. It can’t be undone."
        confirmLabel="Delete recipe"
        destructive
        onConfirm={() => void confirmDelete()}
      />
    </PageLayout>
  )
}
