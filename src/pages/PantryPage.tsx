import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { Plus } from 'lucide-react'
import { PageLayout, PageTitle, RecipeCard } from '../components/app-shared'
import { PANTRY_SUGGESTIONS } from '../domain/ingredients'
import { evaluatePantry, pantryTokens } from '../domain/pantry'
import { useKitchenStore } from '../stores/kitchen'
import type { CatalogRecipe } from '../types/recipe'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function PantryPage() {
  useDocumentTitle('Pantry')
  const catalog = useOutletContext<CatalogRecipe[]>()
  const store = useKitchenStore()
  const [value, setValue] = useState('')
  const tokens = pantryTokens(store.pantry)
  const add = (ingredient: string) => {
    if (!ingredient.trim()) return
    store.setPantry([...store.pantry, ingredient.trim()])
    setValue('')
  }
  const ready = catalog.filter(
    (item) =>
      tokens.size > 0 &&
      evaluatePantry(item.recipe, tokens).missing.length === 0,
  )
  return (
    <PageLayout className="space-y-8">
      <PageTitle
        eyebrow="YOUR KITCHEN"
        title="A little inventory goes a long way."
        sub="Keep track of what you have, then find something lovely to make."
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && add(value)}
          placeholder="Add an ingredient you have"
        />
        <Button onClick={() => add(value)}>
          <Plus size={17} /> Add
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {store.pantry.map((item) => (
          <Button
            variant="outline"
            size="sm"
            key={item}
            onClick={() =>
              store.setPantry(store.pantry.filter((entry) => entry !== item))
            }>
            {item} ×
          </Button>
        ))}
      </div>
      {store.pantry.length === 0 && (
        <>
          <p className="text-sm leading-6 text-muted-foreground">
            Start with a few staples:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {PANTRY_SUGGESTIONS.slice(0, 16).map((item) => (
              <Button
                key={item}
                variant="secondary"
                size="sm"
                onClick={() => add(item)}>
                + {item}
              </Button>
            ))}
          </div>
        </>
      )}
      <h2>Recipes you can make now</h2>
      {ready.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ready.slice(0, 12).map((item) => (
            <RecipeCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          Add ingredients to see recipes that fit what you have.
        </p>
      )}
    </PageLayout>
  )
}
