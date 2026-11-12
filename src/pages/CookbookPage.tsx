import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { useKitchenStore } from '../stores/kitchen'
import type { CatalogRecipe } from '../types/recipe'
import {
  Empty,
  PageLayout,
  PageTitle,
  RecipeCard,
} from '../components/app-shared'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Cookbook() {
  useDocumentTitle('Cookbook')
  const catalog = useOutletContext<CatalogRecipe[]>()
  const store = useKitchenStore()
  const [tab, setTab] = useState<'saved' | 'cooked' | 'notes' | 'rated'>(
    'saved',
  )
  const items = catalog.filter((item) => {
    if (tab === 'saved') return Boolean(store.favorites[item.id])
    if (tab === 'cooked') return Boolean(store.cooked[item.id])
    if (tab === 'notes') return Boolean(store.notes[item.id]?.trim())
    return Boolean(store.ratings[item.id])
  })
  const labels = {
    saved: 'Favourites',
    cooked: 'Cooked',
    notes: 'Notes',
    rated: 'Rated',
  }
  return (
    <PageLayout className="space-y-8">
      <PageTitle
        eyebrow="YOUR KEEPSAKES"
        title="Recipes worth keeping."
        sub="All the recipes you have saved and made."
      />
      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Cookbook sections">
        {Object.entries(labels).map(([key, label]) => (
          <Button
            variant={tab === key ? 'secondary' : 'outline'}
            size="sm"
            role="tab"
            aria-selected={tab === key}
            key={key}
            onClick={() => setTab(key as typeof tab)}>
            {label}
          </Button>
        ))}
      </div>
      {tab === 'cooked' && (
        <p className="text-sm leading-6 text-muted-foreground">
          {Object.values(store.cooked).reduce(
            (sum, entry) => sum + entry.count,
            0,
          )}{' '}
          good meals made so far.
        </p>
      )}
      {tab === 'notes' &&
        items.map((item) => (
          <Card
            className="rounded-xl border border-border bg-card p-4"
            key={item.id}>
            <b>{item.recipe.name}</b>
            <p>{store.notes[item.id]}</p>
          </Card>
        ))}
      {items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <RecipeCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <Empty
          copy={`Your ${labels[tab].toLowerCase()} recipes will appear here when you save, cook, note, or rate a dish.`}
        />
      )}
    </PageLayout>
  )
}
