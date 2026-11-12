import { Link, useOutletContext } from 'react-router'
import {
  Empty,
  PageLayout,
  PageTitle,
  RecipeCard,
} from '../components/app-shared'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { evaluatePantry, pantryTokens } from '../domain/pantry'
import { useKitchenStore } from '../stores/kitchen'
import { useProfileStore } from '../stores/profile'
import { evaluateRecipe } from '../domain/scoring'
import type { CatalogRecipe, RecipeId } from '../types/recipe'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function ComparePage() {
  useDocumentTitle('Compare')
  const catalog = useOutletContext<CatalogRecipe[]>()
  const store = useKitchenStore()
  const profile = useProfileStore((state) => state.profile)
  const items = store.compare
    .map((id) => catalog.find((item) => item.id === id))
    .filter((item): item is CatalogRecipe => Boolean(item))
  const tokens = pantryTokens(store.pantry)
  if (!items.length)
    return (
      <PageLayout>
        <PageTitle
          eyebrow="THE SHORTLIST"
          title="Good things, side by side."
          sub="Compare up to four recipes before you choose."
        />
        <Empty copy="Add recipes to compare them side by side." />
      </PageLayout>
    )
  const rows: { label: string; value: (item: CatalogRecipe) => string }[] = [
    {
      label: 'Total time',
      value: ({ recipe }) =>
        `${recipe.prepTimeMinutes + recipe.cookTimeMinutes} min`,
    },
    {
      label: 'Prep / cook',
      value: ({ recipe }) =>
        `${recipe.prepTimeMinutes} / ${recipe.cookTimeMinutes} min`,
    },
    {
      label: 'Calories / serving',
      value: ({ recipe }) => String(recipe.caloriesPerServing),
    },
    { label: 'Servings', value: ({ recipe }) => String(recipe.servings) },
    { label: 'Difficulty', value: ({ recipe }) => recipe.difficulty },
    {
      label: 'Community rating',
      value: ({ recipe }) => `${recipe.rating.toFixed(1)} / 5`,
    },
    {
      label: 'Match for you',
      value: (item) =>
        `${evaluateRecipe(item, { profile, pantryTokens: tokens, cookedIds: new Set<RecipeId>() }).score}%`,
    },
    {
      label: 'Pantry coverage',
      value: ({ recipe }) =>
        `${Math.round(evaluatePantry(recipe, tokens).coverage * 100)}%`,
    },
    { label: 'Cuisine', value: ({ recipe }) => recipe.cuisine },
  ]
  return (
    <PageLayout className="space-y-8">
      <PageTitle
        eyebrow="THE SHORTLIST"
        title="Good things, side by side."
        sub="Compare the details before you choose."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id}>
            <RecipeCard item={item} />
            <Button
              className="absolute right-3 top-3 z-10"
              variant="ghost"
              onClick={() => store.toggleCompare(item.id)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Card className="overflow-x-auto rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/70">
        <table className="w-full border-collapse text-left text-sm [&_td]:border-b [&_td]:border-border [&_td]:p-3 [&_th]:border-b [&_th]:border-border [&_th]:p-3">
          <thead>
            <tr>
              <th>At a glance</th>
              {items.map((item) => (
                <th key={item.id}>
                  <Link to={`/recipes/${item.id}`}>{item.recipe.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th>{row.label}</th>
                {items.map((item) => (
                  <td key={item.id}>{row.value(item)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <section className="space-y-4 border-b border-border pb-7">
        <h2>Ingredients</h2>
        {[...new Set(items.flatMap((item) => item.recipe.ingredients))].map(
          (ingredient) => (
            <div
              className="grid grid-cols-[auto_minmax(120px,1fr)_minmax(0,2fr)] items-center gap-3 border-b border-border py-3 text-sm"
              key={ingredient}>
              <span>{ingredient}</span>
              {items.map((item) => (
                <span key={item.id}>
                  {item.recipe.ingredients.includes(ingredient) ? '✓' : '—'}
                </span>
              ))}
            </div>
          ),
        )}
      </section>
    </PageLayout>
  )
}
