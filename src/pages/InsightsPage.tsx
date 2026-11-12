import { Bookmark, ChefHat, Leaf } from 'lucide-react'
import { useOutletContext } from 'react-router'
import { useKitchenStore } from '../stores/kitchen'
import type { CatalogRecipe } from '../types/recipe'
import { Empty, PageLayout, PageTitle } from '../components/app-shared'
import { Card } from '../components/ui/card'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Insights() {
  useDocumentTitle('Insights')
  const catalog = useOutletContext<CatalogRecipe[]>()
  const kitchen = useKitchenStore()
  const totalCooks = Object.values(kitchen.cooked).reduce(
    (sum, entry) => sum + entry.count,
    0,
  )
  const saved = Object.keys(kitchen.favorites).length
  const cookedRecipes = Object.entries(kitchen.cooked)
    .map(([id, entry]) => ({
      id,
      ...entry,
      recipe: catalog.find((item) => item.id === id)?.recipe,
    }))
    .filter((entry) => entry.recipe)
  const maximum = Math.max(1, ...cookedRecipes.map((entry) => entry.count))
  return (
    <PageLayout className="space-y-8">
      <PageTitle
        eyebrow="YOUR KITCHEN, IN NUMBERS"
        title="Little habits add up."
        sub="A gentle look at how you cook, save, and explore."
      />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <ChefHat />
            </span>
            <span>
              <b>{totalCooks}</b>
              <small>times cooked</small>
            </span>
          </div>
          <div>
            <span className="grid size-10 place-items-center rounded-xl bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100">
              <Bookmark />
            </span>
            <span>
              <b>{saved}</b>
              <small>recipes saved</small>
            </span>
          </div>
          <div>
            <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <Leaf />
            </span>
            <span>
              <b>{kitchen.pantry.length}</b>
              <small>pantry staples</small>
            </span>
          </div>
        </div>
        <Card className="rounded-2xl border border-border bg-card p-5 shadow-none">
          <h2>Your most cooked</h2>
          {cookedRecipes.length ? (
            cookedRecipes
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map((item) => (
                <div
                  className="flex items-center justify-between gap-3 border-b border-border py-3 text-sm"
                  key={item.id}>
                  <span>{item.recipe?.name}</span>
                  <div>
                    <i
                      style={{
                        width: `${Math.max(8, (item.count / maximum) * 100)}%`,
                      }}
                    />
                  </div>
                  <b>{item.count}×</b>
                </div>
              ))
          ) : (
            <Empty copy="Log a cooked recipe and your kitchen rhythms will show up here." />
          )}
        </Card>
        <p className="mt-8 text-xs leading-5 text-muted-foreground">
          Computed locally from foodwiki.profile.v1, foodwiki.cookbook.v1,
          foodwiki.pantry.v1, and foodwiki.planner.v1.
        </p>
      </div>
    </PageLayout>
  )
}
