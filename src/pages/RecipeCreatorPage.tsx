import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useKitchenStore } from '../stores/kitchen'
import type { CatalogRecipe, RecipeId } from '../types/recipe'
import { useForm } from 'react-hook-form'
import { RecipeDraftSchema, type RecipeDraft } from '../schemas/recipe'
import { PageLayout, PageTitle } from '../components/app-shared'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  NativeSelect,
  NativeSelectOption,
} from '../components/ui/native-select'

export default function RecipeCreator() {
  const catalog = useOutletContext<CatalogRecipe[]>()
  const { id: routeId } = useParams()
  useDocumentTitle(routeId ? 'Edit recipe' : 'New recipe')
  const navigate = useNavigate()
  const store = useKitchenStore()
  const id = routeId as RecipeId | undefined
  const existing = id
    ? catalog.find((item) => item.id === id)?.recipe
    : undefined
  const [message, setMessage] = useState('')
  const form = useForm<RecipeDraft>({
    defaultValues: {
      name: existing?.name ?? '',
      cuisine: existing?.cuisine ?? '',
      difficulty: existing?.difficulty ?? 'Easy',
      prepTimeMinutes: existing?.prepTimeMinutes ?? 10,
      cookTimeMinutes: existing?.cookTimeMinutes ?? 20,
      servings: existing?.servings ?? 2,
      caloriesPerServing: existing?.caloriesPerServing ?? 0,
      image: existing?.image ?? '',
      ingredients: existing?.ingredients ?? [''],
      instructions: existing?.instructions ?? [''],
      tagsText: existing?.tags.join(', ') ?? '',
      mealsText: existing?.mealType.join(', ') ?? 'Dinner',
    },
  })
  const onSubmit = (draft: RecipeDraft) => {
    const parsed = RecipeDraftSchema.safeParse(draft)
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the recipe details.')
      return
    }
    const recipe = {
      ...parsed.data,
      ingredients: parsed.data.ingredients,
      instructions: parsed.data.instructions,
      tags: parsed.data.tagsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      mealType: parsed.data.mealsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    }
    let recipeId = id
    if (id && existing) store.updateCreation(id, recipe)
    else recipeId = store.addCreation(recipe)
    navigate(`/recipes/${recipeId}`)
  }
  return (
    <PageLayout>
      <PageTitle
        eyebrow="YOUR RECIPE BOX"
        title={
          existing ? 'Give it a little tweak.' : 'Add a recipe of your own.'
        }
        sub="Your recipes stay on this device and join your personal collection."
      />
      <Card className="max-w-[650px] gap-4 rounded-2xl border border-border bg-card p-6 shadow-none ring-1 ring-border">
        <form
          className="creation-form flex w-full flex-col gap-4 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-xs [&_label]:font-semibold"
          onSubmit={form.handleSubmit(onSubmit)}>
          <label>
            Recipe name
            <Input {...form.register('name')} />
          </label>
          <label>
            Cuisine
            <Input list="cuisine-options" {...form.register('cuisine')} />
            <datalist id="cuisine-options">
              {[...new Set(catalog.map((item) => item.recipe.cuisine))].map(
                (name) => (
                  <option key={name} value={name} />
                ),
              )}
            </datalist>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Difficulty
              <NativeSelect
                className="w-full rounded-xl bg-card"
                {...form.register('difficulty')}>
                <NativeSelectOption>Easy</NativeSelectOption>
                <NativeSelectOption>Medium</NativeSelectOption>
                <NativeSelectOption>Hard</NativeSelectOption>
              </NativeSelect>
            </label>
            <label>
              Prep minutes
              <Input
                type="number"
                {...form.register('prepTimeMinutes', { valueAsNumber: true })}
              />
            </label>
            <label>
              Cook minutes
              <Input
                type="number"
                {...form.register('cookTimeMinutes', { valueAsNumber: true })}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Servings
              <Input
                type="number"
                {...form.register('servings', { valueAsNumber: true })}
              />
            </label>
            <label>
              Calories per serving
              <Input
                type="number"
                {...form.register('caloriesPerServing', {
                  valueAsNumber: true,
                })}
              />
            </label>
          </div>
          <label>
            Image URL (optional)
            <Input
              {...form.register('image')}
              placeholder="A recipe photo URL"
            />
          </label>
          <label>
            Ingredients, one per line
            <Textarea
              className="min-h-24 w-full resize-y rounded-xl border border-border bg-card px-3 py-3 text-xs"
              {...form.register('ingredients.0')}
              onChange={(event) =>
                form.setValue('ingredients', event.target.value.split('\n'))
              }
              defaultValue={form.getValues('ingredients').join('\n')}
            />
          </label>
          <label>
            Instructions, one step per line
            <Textarea
              className="min-h-24 w-full resize-y rounded-xl border border-border bg-card px-3 py-3 text-xs"
              {...form.register('instructions.0')}
              onChange={(event) =>
                form.setValue('instructions', event.target.value.split('\n'))
              }
              defaultValue={form.getValues('instructions').join('\n')}
            />
          </label>
          <label>
            Tags, separated by commas
            <Input {...form.register('tagsText')} />
          </label>
          <label>
            Meal types, separated by commas
            <Input {...form.register('mealsText')} placeholder="Dinner" />
          </label>
          {message && <p role="alert">{message}</p>}
          <Button type="submit">
            {existing ? 'Save changes' : 'Save my recipe'}
            <ArrowRight size={17} />
          </Button>
        </form>
      </Card>
    </PageLayout>
  )
}
