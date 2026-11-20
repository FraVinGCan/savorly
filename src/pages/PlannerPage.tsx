import { useState } from 'react'
import { Link } from 'react-router'
import {
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Printer,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from 'cn'
import { CATEGORY_META, type IngredientCategory } from '../domain/ingredients'
import { buildShoppingList } from '../domain/shoppingList'
import { rankRecipes } from '../domain/scoring'
import {
  WEEKDAYS,
  addWeeks,
  formatWeekRange,
  isToday,
  startOfWeek,
  weekdayShort,
  weekKey,
} from '../domain/week'
import { usePlannerStore, checkKey } from '../stores/planner'
import { useCookbookStore } from '../stores/cookbook'
import { toast } from '../stores/toast'
import { useRecipes } from '../hooks/useRecipes'
import { useTasteSetup } from '../hooks/useTasteSetup'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { copyText } from '../lib/clipboard'
import { formatShortDate, plural } from '../lib/format'
import { PageHeader, PageLayout } from '../components/app-shared'
import { RecipeCard } from '../components/recipe-card'
import {
  Badge,
  ButtonLink,
  ConfirmDialog,
  CopyFallbackDialog,
  EmptyState,
  SectionHeading,
} from '../components/primitives'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Checkbox, ProgressBar } from '../components/ui/controls'
import {
  NativeSelect,
  NativeSelectOption,
} from '../components/ui/native-select'
import type { CatalogRecipe, RecipeId } from '../types/recipe'
import { recipeSlug } from '../types/recipe'

const categoryLabel = (category: string) =>
  CATEGORY_META[category as IngredientCategory]?.label ?? category

const categoryGlyph = (category: string) =>
  CATEGORY_META[category as IngredientCategory]?.glyph ?? '🧺'

export default function Planner() {
  useDocumentTitle('Planner')
  const { catalog, byId } = useRecipes()
  const { ctx, personalised } = useTasteSetup()
  const weeks = usePlannerStore((state) => state.weeks)
  const checked = usePlannerStore((state) => state.checked)
  const assign = usePlannerStore((state) => state.assign)
  const unassign = usePlannerStore((state) => state.unassign)
  const clearWeek = usePlannerStore((state) => state.clearWeek)
  const clearChecked = usePlannerStore((state) => state.clearChecked)
  const toggleCheck = usePlannerStore((state) => state.toggleCheck)
  const logCook = useCookbookStore((state) => state.logCook)
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))
  const [confirmClear, setConfirmClear] = useState(false)
  const [copyFallback, setCopyFallback] = useState('')

  const week = weekKey(anchor)
  const thisWeek = weekKey(startOfWeek(new Date()))
  const isCurrentWeek = week === thisWeek

  const days = WEEKDAYS.map((name, index) => {
    const date = new Date(anchor)
    date.setDate(date.getDate() + index)
    const ids = weeks[week]?.[String(index)] ?? []
    return {
      name,
      index,
      date,
      entries: ids.map((id) => ({ id, item: byId.get(id) })),
    }
  })

  // Rebuilt from the plan on every render — a week holds at most 21 slots.
  const planned = days.flatMap((day) =>
    day.entries.flatMap(({ item }) =>
      item
        ? [
            {
              recipeId: item.id,
              recipeName: item.recipe.name,
              ingredients: item.recipe.ingredients,
            },
          ]
        : [],
    ),
  )
  const list = buildShoppingList(planned)
  const mealCount = planned.length
  const filledDays = days.filter((day) => day.entries.length).length
  const checkedSet = new Set(checked)
  const listKeys = list.sections.flatMap((section) =>
    section.items.map((item) => checkKey(week, item.key)),
  )
  const doneCount = listKeys.filter((key) => checkedSet.has(key)).length

  const addRecipe = (day: number, id: string, name: string) => {
    if (!id) return
    const existing = weeks[week]?.[String(day)] ?? []
    if (existing.includes(id as RecipeId)) {
      toast.info('Already planned', `${name} is already on ${WEEKDAYS[day]}.`)
      return
    }
    assign(week, day, id as RecipeId)
    toast.success('Added to plan', `${name} · ${WEEKDAYS[day]}`)
  }

  const addFromSelect = (value: string, item: CatalogRecipe) => {
    if (!value) return
    addRecipe(Number(value), item.id, item.recipe.name)
  }

  const buildCopyText = () => {
    const lines = [`Shopping list · ${formatWeekRange(anchor)}`, '']
    if (!list.itemCount) lines.push('No meals planned for this week yet.')
    for (const section of list.sections) {
      lines.push(categoryLabel(section.category).toUpperCase())
      for (const item of section.items) {
        const ticked = checkedSet.has(checkKey(week, item.key))
        lines.push(
          `${ticked ? '[x]' : '[ ]'} ${item.label} — ${item.recipes.join(', ')}`,
        )
      }
      lines.push('')
    }
    return lines.join('\n').trim()
  }

  const copyList = async () => {
    const text = buildCopyText()
    if (await copyText(text)) {
      toast.success(
        'Shopping list copied',
        `${plural(list.itemCount, 'ingredient')} across ${plural(list.recipeCount, 'recipe')}.`,
      )
      return
    }
    setCopyFallback(text)
    toast.error(
      'Could not copy automatically',
      'Select the text in the dialog and copy it manually.',
    )
  }

  const gaps = rankRecipes(catalog, ctx)
    .filter((item) => !ctx.cookedIds.has(item.id))
    .slice(0, 6)

  return (
    <PageLayout className="space-y-8">
      <PageHeader
        eyebrow="THE WEEK AHEAD"
        title="Make room for good meals."
        sub="Plan the week one delicious decision at a time."
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={16} aria-hidden="true" /> Print plan
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmClear(true)}
              disabled={!mealCount}>
              <Trash2 size={16} aria-hidden="true" /> Clear week
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAnchor((date) => addWeeks(date, -1))}
          aria-label="Previous week">
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <b>{formatWeekRange(anchor)}</b>
            {isCurrentWeek && <Badge tone="sage">This week</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {filledDays} of 7 days planned · {plural(mealCount, 'meal')}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAnchor((date) => addWeeks(date, 1))}
          aria-label="Next week">
          <ChevronRight aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          onClick={() => setAnchor(startOfWeek(new Date()))}
          disabled={isCurrentWeek}>
          Today
        </Button>
      </div>

      <div
        id="planner-grid"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => (
          <section
            key={day.name}
            aria-label={`${day.name}, ${formatShortDate(day.date)}`}
            aria-current={isToday(day.date) ? 'date' : undefined}
            className={cn(
              'flex min-h-44 flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-none ring-1 ring-border/60',
              isToday(day.date) && 'border-primary/50 ring-2 ring-primary',
            )}>
            <div className="flex items-center justify-between gap-2">
              <h3
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                title={day.name}>
                {weekdayShort(day.date)}
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {formatShortDate(day.date)}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              {day.entries.length ? (
                day.entries.map(({ id, item }) =>
                  item ? (
                    <div
                      key={id}
                      className="rounded-xl border border-border/70 bg-background/60 p-2">
                      <Link
                        to={`/recipes/${recipeSlug(id)}`}
                        className="line-clamp-2 text-sm font-medium leading-5 hover:text-primary">
                        {item.recipe.name}
                      </Link>
                      <div className="mt-1.5 flex items-center gap-1 print:hidden">
                        <Button
                          variant="ghost"
                          size="xs"
                          aria-label={`Mark ${item.recipe.name} cooked`}
                          onClick={() => {
                            logCook(id)
                            toast.success('Logged as cooked', item.recipe.name)
                          }}>
                          <ChefHat size={13} aria-hidden="true" /> Cooked
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="ml-auto text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${item.recipe.name} from ${day.name}`}
                          onClick={() => {
                            unassign(week, day.index, id)
                            toast.info('Removed from plan', item.recipe.name)
                          }}>
                          <X size={13} aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border/70 p-2">
                      <span className="text-xs text-muted-foreground">
                        Recipe no longer available
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove unavailable recipe from ${day.name}`}
                        onClick={() => unassign(week, day.index, id)}>
                        <X size={13} aria-hidden="true" />
                      </Button>
                    </div>
                  ),
                )
              ) : (
                <p className="grid flex-1 place-items-center rounded-xl border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
                  Nothing planned
                </p>
              )}
            </div>

            <label className="mt-auto block print:hidden">
              <span className="sr-only">Add a meal to {day.name}</span>
              <NativeSelect
                size="sm"
                className="w-full"
                value=""
                onChange={(event) => {
                  const id = event.target.value
                  if (!id) return
                  const item = byId.get(id as RecipeId)
                  addRecipe(day.index, id, item?.recipe.name ?? 'Recipe')
                }}>
                <NativeSelectOption value="">+ Add a meal…</NativeSelectOption>
                {catalog.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {item.recipe.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          </section>
        ))}
      </div>

      <section className="space-y-5">
        <SectionHeading
          eyebrow="THE SHOPPING LIST"
          title="Just what you'll need."
          sub={
            list.itemCount
              ? `${plural(list.itemCount, 'ingredient')} across ${plural(list.recipeCount, 'planned recipe')}, grouped the way you shop.`
              : 'Add a few meals to this week and the list builds itself.'
          }
          action={
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button
                variant="outline"
                onClick={() => void copyList()}
                disabled={!list.itemCount}>
                <Copy size={16} aria-hidden="true" /> Copy list
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  clearChecked(week)
                  toast.info(
                    'Shopping list unticked',
                    'Every ingredient is unchecked for this week.',
                  )
                }}
                disabled={!doneCount}>
                Untick all
              </Button>
            </div>
          }
        />

        {list.itemCount > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <ProgressBar
              value={doneCount}
              max={list.itemCount}
              label="Shopping list progress"
              className="max-w-sm"
            />
            <span className="text-xs tabular-nums text-muted-foreground">
              {doneCount} of {list.itemCount} ticked
            </span>
          </div>
        )}

        {list.sections.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.sections.map((section) => (
              <Card
                key={section.category}
                className="rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/60">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span aria-hidden="true">
                    {categoryGlyph(section.category)}
                  </span>
                  {categoryLabel(section.category)}
                  <span className="text-[10px] font-normal">
                    {section.items.length}
                  </span>
                </h3>
                <ul className="divide-y divide-border">
                  {section.items.map((item) => {
                    const key = checkKey(week, item.key)
                    const ticked = checkedSet.has(key)
                    return (
                      <li
                        key={item.key}
                        className="flex items-start gap-2.5 py-2">
                        <Checkbox
                          checked={ticked}
                          onCheckedChange={() => toggleCheck(key)}
                          label={`Ticked ${item.label}`}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <span
                            className={cn(
                              'block text-sm',
                              ticked && 'text-muted-foreground line-through',
                            )}>
                            {item.label}
                          </span>
                          <small className="block text-[11px] leading-4 text-muted-foreground">
                            {item.recipes.join(', ')}
                          </small>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            glyph="🧾"
            title="Nothing to shop for yet"
            body="Add meals to this week and the list fills itself, aisle by aisle, with the recipes that need each ingredient."
            actions={<ButtonLink href="#planner-grid">Plan a meal</ButtonLink>}
          />
        )}
      </section>

      <details className="group rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/60 print:hidden">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <div>
            <h2 className="font-heading text-2xl">Fill the gaps</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {personalised
                ? 'Six recipes that fit your taste and you have not cooked yet.'
                : 'Six highly rated recipes you have not cooked yet. Set your taste to personalise this list.'}
            </p>
          </div>
          <ChevronDown
            size={18}
            className="text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        {gaps.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {gaps.map((item) => (
              <RecipeCard
                key={item.id}
                item={item}
                evaluation={item.evaluation}
                actions={
                  <label className="block">
                    <span className="sr-only">
                      Add {item.recipe.name} to a day
                    </span>
                    <NativeSelect
                      size="sm"
                      className="w-full"
                      value=""
                      onChange={(event) =>
                        addFromSelect(event.target.value, item)
                      }>
                      <NativeSelectOption value="">
                        + Add to plan…
                      </NativeSelectOption>
                      {days.map((day) => (
                        <NativeSelectOption
                          key={day.index}
                          value={String(day.index)}>
                          {day.name} · {formatShortDate(day.date)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                }
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Every eligible recipe is already in your cook log. Time to revisit a
            favourite.
          </p>
        )}
        {!personalised && (
          <p className="mt-4 text-xs text-muted-foreground">
            <Link to="/onboarding" className="text-primary hover:underline">
              Set your taste
            </Link>{' '}
            to rank these by your preferences.
          </p>
        )}
      </details>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear this week's plan?"
        description={`This removes ${plural(mealCount, 'meal')} and every shopping tick for ${formatWeekRange(anchor)}. Your saved recipes and pantry are untouched.`}
        confirmLabel="Clear week"
        destructive
        onConfirm={() => {
          clearWeek(week)
          toast.success('Week cleared', formatWeekRange(anchor))
        }}
      />

      <CopyFallbackDialog
        open={Boolean(copyFallback)}
        onOpenChange={(open) => !open && setCopyFallback('')}
        value={copyFallback}
        title="Copy the shopping list"
      />
    </PageLayout>
  )
}
