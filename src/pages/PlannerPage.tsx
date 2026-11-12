import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useKitchenStore } from '../stores/kitchen'
import {
  addWeeks,
  formatWeekRange,
  isToday,
  startOfWeek,
  WEEKDAYS,
  weekKey,
} from '../domain/week'
import { buildShoppingList } from '../domain/shoppingList'
import type { CatalogRecipe, RecipeId } from '../types/recipe'
import { Empty, PageLayout, PageTitle } from '../components/app-shared'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Planner() {
  useDocumentTitle('Planner')
  const catalog = useOutletContext<CatalogRecipe[]>()
  const store = useKitchenStore()
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))
  const week = weekKey(anchor)
  const days = WEEKDAYS.map((name, index) => {
    const date = new Date(anchor)
    date.setDate(date.getDate() + index)
    const id = store.weeks[week]?.[index]?.[0]
    return { name, index, date, item: catalog.find((entry) => entry.id === id) }
  })
  const planned = days.flatMap((day) =>
    day.item
      ? [
          {
            recipeId: day.item.id,
            recipeName: day.item.recipe.name,
            ingredients: day.item.recipe.ingredients,
          },
        ]
      : [],
  )
  const list = buildShoppingList(planned)
  return (
    <PageLayout className="space-y-8">
      <PageTitle
        eyebrow="THE WEEK AHEAD"
        title="Make room for good meals."
        sub="Plan the week one delicious decision at a time."
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAnchor((date) => addWeeks(date, -1))}
          aria-label="Previous week">
          <ChevronLeft />
        </Button>
        <b>{formatWeekRange(anchor)}</b>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAnchor((date) => addWeeks(date, 1))}
          aria-label="Next week">
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          onClick={() => setAnchor(startOfWeek(new Date()))}>
          This week
        </Button>
        <span>{planned.length} of 7 meals planned</span>
      </div>
      <div className="grid grid-cols-7 gap-3 overflow-x-auto pb-3 [&>*]:min-w-36">
        {days.map((day) => (
          <section
            className={`min-h-40 min-w-36 rounded-2xl border border-border bg-card p-3 ${isToday(day.date) ? 'ring-2 ring-primary' : ''}`}
            key={day.name}>
            <div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold">
              {day.name}
              <small>
                {day.date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </small>
            </div>
            <select
              aria-label={`Recipe for ${day.name}`}
              value={day.item?.id ?? ''}
              onChange={(event) =>
                event.target.value
                  ? store.assign(
                      week,
                      day.index,
                      event.target.value as RecipeId,
                    )
                  : day.item && store.unassign(week, day.index, day.item.id)
              }>
              <option value="">Choose a meal…</option>
              {catalog.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.recipe.name}
                </option>
              ))}
            </select>
            {day.item && (
              <Card className="mt-3 flex flex-col items-start gap-2 rounded-xl border border-border p-3">
                <Link to={`/recipes/${day.item.id}`}>
                  {day.item.recipe.name}
                </Link>
                <Button size="sm" onClick={() => store.logCook(day.item!.id)}>
                  Made it
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => store.unassign(week, day.index, day.item!.id)}
                  aria-label={`Remove ${day.item.recipe.name}`}>
                  Remove
                </Button>
              </Card>
            )}
          </section>
        ))}
      </div>
      <section className="my-12 space-y-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
              <span /> THE SHOPPING LIST
            </div>
            <h2>Just what you'll need.</h2>
            <p>
              {list.itemCount} ingredients across {list.recipeCount} planned
              recipes.
            </p>
          </div>
        </div>
        {list.sections.length ? (
          list.sections.map((section) => (
            <div key={section.category} className="my-5 space-y-2">
              <h3>{section.category}</h3>
              {section.items.map((item) => {
                const key = `${week}::${item.key}`
                return (
                  <label
                    key={key}
                    className="grid grid-cols-[auto_minmax(120px,1fr)_minmax(0,2fr)] items-center gap-3 border-b border-border py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={store.checked.includes(key)}
                      onChange={() => store.toggleCheck(key)}
                    />
                    <span>{item.label}</span>
                    <small>{item.recipes.join(', ')}</small>
                  </label>
                )
              })}
            </div>
          ))
        ) : (
          <Empty copy="Add a few meals to your week to build a shopping list." />
        )}
      </section>
    </PageLayout>
  )
}
