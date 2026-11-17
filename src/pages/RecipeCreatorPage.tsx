import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChefHat,
  Plus,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { CATEGORY_META, classifyIngredient } from '../domain/ingredients'
import { profileConflicts } from '../domain/taste'
import { MEAL_TYPES, RecipeDraftSchema, type MealType } from '../schemas/recipe'
import { useCreationsStore } from '../stores/creations'
import { useProfileStore } from '../stores/profile'
import { toast } from '../stores/toast'
import { useRecipes } from '../hooks/useRecipes'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageHeader, PageLayout } from '../components/app-shared'
import {
  Badge,
  ButtonLink,
  Chip,
  ConfirmDialog,
  EmptyState,
} from '../components/primitives'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import {
  NativeSelect,
  NativeSelectOption,
} from '../components/ui/native-select'
import type { Recipe, RecipeId } from '../types/recipe'

type Row = { value: string }

interface CreatorForm {
  name: string
  cuisine: string
  difficulty: Recipe['difficulty']
  prepTimeMinutes: number
  cookTimeMinutes: number
  servings: number
  caloriesPerServing: number
  image: string
  tagsText: string
  meals: MealType[]
  ingredients: Row[]
  instructions: Row[]
}

const rowCopy = (value: string): Row => ({ value })

function formDefaults(recipe?: Recipe): CreatorForm {
  return {
    name: recipe?.name ?? '',
    cuisine: recipe?.cuisine ?? '',
    difficulty: recipe?.difficulty ?? 'Easy',
    prepTimeMinutes: recipe?.prepTimeMinutes ?? 10,
    cookTimeMinutes: recipe?.cookTimeMinutes ?? 20,
    servings: recipe?.servings ?? 2,
    caloriesPerServing: recipe?.caloriesPerServing ?? 0,
    image: recipe?.image.startsWith('https://dummyjson.com/image/')
      ? ''
      : (recipe?.image ?? ''),
    tagsText: recipe?.tags.join(', ') ?? '',
    meals: (recipe?.mealType.filter((meal): meal is MealType =>
      (MEAL_TYPES as readonly string[]).includes(meal),
    ) ?? ['Dinner']) as MealType[],
    ingredients: recipe?.ingredients.length
      ? recipe.ingredients.map(rowCopy)
      : [rowCopy('')],
    instructions: recipe?.instructions.length
      ? recipe.instructions.map(rowCopy)
      : [rowCopy('')],
  }
}

const numberField = {
  setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span role="alert" className="text-xs font-normal text-destructive">
      {message}
    </span>
  )
}

export default function RecipeCreatorPage() {
  const { id: routeId } = useParams()
  const id = routeId as RecipeId | undefined
  const navigate = useNavigate()
  const { get, cuisines } = useRecipes()
  const existing = id ? get(id) : undefined
  const mine = existing?.source === 'mine' ? existing : undefined
  useDocumentTitle(mine ? 'Edit recipe' : 'New recipe')

  const profile = useProfileStore((state) => state.profile)
  const addCreation = useCreationsStore((state) => state.addCreation)
  const updateCreation = useCreationsStore((state) => state.updateCreation)
  const deleteCreation = useCreationsStore((state) => state.deleteCreation)
  const forgetCreation = useCreationsStore((state) => state.forgetCreation)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [formError, setFormError] = useState<{
    area: 'ingredients' | 'instructions'
    message: string
  } | null>(null)

  const defaults = useMemo(() => formDefaults(mine?.recipe), [mine])
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CreatorForm>({ defaultValues: defaults })

  const ingredients = useFieldArray({ control, name: 'ingredients' })
  const instructions = useFieldArray({ control, name: 'instructions' })

  useEffect(() => {
    reset(defaults)
  }, [defaults, reset])

  const meals = useWatch({ control, name: 'meals' }) ?? []
  const rawIngredients = useWatch({ control, name: 'ingredients' }) ?? []
  const deferred = useDeferredValue(rawIngredients)
  const ingredientLines = useMemo(
    () => deferred.map((row) => row.value.trim()).filter(Boolean),
    [deferred],
  )
  const previews = useMemo(
    () =>
      ingredientLines.map((line) => ({
        line,
        category: classifyIngredient(line),
      })),
    [ingredientLines],
  )
  const conflicts = useMemo(
    () => profileConflicts(ingredientLines, profile),
    [ingredientLines, profile],
  )

  // Array-level messages only clear on the next submit, so drop them as soon as
  // the cook edits the list that produced them.
  const clearSectionError = (area: 'ingredients' | 'instructions') => () => {
    if (formError?.area === area) setFormError(null)
  }

  const deleteConfirm = async () => {
    if (!id) return
    setConfirmDelete(false)
    const name = mine?.recipe.name ?? 'this recipe'
    const result = await deleteCreation(id)
    if (result.synced) toast.success('Recipe deleted', name)
    else {
      forgetCreation(id)
      toast.info(
        'Removed from this device',
        'The API echo failed, so Savorly used the local-only fallback.',
      )
    }
    navigate('/recipes')
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    clearErrors()
    const draft = {
      ...values,
      ingredients: values.ingredients
        .map((row) => row.value)
        .filter((row) => row.trim()),
      instructions: values.instructions
        .map((row) => row.value)
        .filter((row) => row.trim()),
    }
    const parsed = RecipeDraftSchema.safeParse(draft)
    if (!parsed.success) {
      let firstArrayError: {
        area: 'ingredients' | 'instructions'
        message: string
      } | null = null
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        const indexed = /^(ingredients|instructions)\.(\d+)/.exec(path)
        if (indexed) {
          setError(
            `${indexed[1]}.${indexed[2]}.value` as Parameters<
              typeof setError
            >[0],
            {
              type: 'validation',
              message: issue.message,
            },
          )
        } else if (path === 'ingredients' || path === 'instructions') {
          firstArrayError ??= { area: path, message: issue.message }
        } else {
          setError(path as Parameters<typeof setError>[0], {
            type: 'validation',
            message: issue.message,
          })
        }
      }
      if (firstArrayError) setFormError(firstArrayError)
      return
    }
    const {
      tagsText,
      meals: mealTypes,
      ingredients,
      instructions,
      ...rest
    } = parsed.data
    const recipe: Partial<Recipe> = {
      ...rest,
      ingredients,
      instructions,
      mealType: mealTypes,
      tags: tagsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    }
    setSaving(true)
    try {
      if (id) {
        if (!mine) {
          toast.error('This recipe cannot be edited')
          return
        }
        const result = await updateCreation(id, recipe)
        if (result.synced)
          toast.success('Recipe updated', recipe.name ?? 'Saved')
        else
          toast.info(
            'Saved to this device',
            'The API echo failed, so your edit was kept locally.',
          )
        navigate(`/recipes/${id}`)
      } else {
        const result = await addCreation(recipe)
        if (result.synced) toast.success('Recipe added', recipe.name ?? 'Saved')
        else
          toast.info(
            'Added to this device',
            'The API echo failed, so your recipe was kept locally.',
          )
        navigate(`/recipes/${result.id}`)
      }
    } finally {
      setSaving(false)
    }
  })

  if (id && !mine)
    return (
      <PageLayout className="space-y-8">
        <PageHeader
          eyebrow="YOUR RECIPE BOX"
          title="That recipe is not yours to edit."
          sub="Only recipes saved on this device can be edited or deleted here."
        />
        <EmptyState
          glyph="🔒"
          title="Nothing to edit"
          body="The recipe may have been removed, or it belongs to the shared catalogue. You can still browse it."
          actions={
            <>
              <ButtonLink to={`/recipes/${id}`}>Open the recipe</ButtonLink>
              <ButtonLink variant="outline" to="/creations/new">
                Add your own
              </ButtonLink>
            </>
          }
        />
      </PageLayout>
    )

  return (
    <PageLayout className="space-y-8">
      <PageHeader
        eyebrow="YOUR RECIPE BOX"
        title={mine ? 'Give it a little tweak.' : 'Add a recipe of your own.'}
        sub="Your recipes stay on this device and join your personal collection with a stable mine-* id."
        actions={
          mine ? (
            <Button variant="outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden="true" /> Delete recipe
            </Button>
          ) : undefined
        }
      />

      <form
        className="space-y-6"
        noValidate
        onSubmit={(event) => void onSubmit(event)}>
        <Card className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60 sm:p-6">
          <h2 className="font-heading text-2xl">The basics</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-semibold sm:col-span-2">
              Recipe name
              <Input
                {...register('name')}
                placeholder="What are we cooking?"
                aria-invalid={Boolean(errors.name)}
              />
              <FieldError message={errors.name?.message} />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold">
              Cuisine
              <Input
                list="creator-cuisines"
                {...register('cuisine')}
                placeholder="e.g. Italian"
                aria-invalid={Boolean(errors.cuisine)}
              />
              <datalist id="creator-cuisines">
                {cuisines.map((cuisine) => (
                  <option key={cuisine} value={cuisine} />
                ))}
              </datalist>
              <FieldError message={errors.cuisine?.message} />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold">
              Difficulty
              <NativeSelect className="w-full" {...register('difficulty')}>
                <NativeSelectOption value="Easy">Easy</NativeSelectOption>
                <NativeSelectOption value="Medium">Medium</NativeSelectOption>
                <NativeSelectOption value="Hard">Hard</NativeSelectOption>
              </NativeSelect>
              <FieldError message={errors.difficulty?.message} />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold">
              Prep minutes
              <Input
                type="number"
                min={0}
                {...register('prepTimeMinutes', numberField)}
                aria-invalid={Boolean(errors.prepTimeMinutes)}
              />
              <FieldError message={errors.prepTimeMinutes?.message} />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold">
              Cook minutes
              <Input
                type="number"
                min={0}
                {...register('cookTimeMinutes', numberField)}
                aria-invalid={Boolean(errors.cookTimeMinutes)}
              />
              <FieldError message={errors.cookTimeMinutes?.message} />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold">
              Servings
              <Input
                type="number"
                min={1}
                {...register('servings', numberField)}
                aria-invalid={Boolean(errors.servings)}
              />
              <FieldError message={errors.servings?.message} />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold">
              Calories per serving
              <Input
                type="number"
                min={0}
                {...register('caloriesPerServing', numberField)}
                aria-invalid={Boolean(errors.caloriesPerServing)}
              />
              <FieldError message={errors.caloriesPerServing?.message} />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold sm:col-span-2">
              Image URL (optional)
              <Input
                {...register('image')}
                placeholder="A recipe photo URL — leave blank for a generated cover"
                aria-invalid={Boolean(errors.image)}
              />
              <FieldError message={errors.image?.message} />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold sm:col-span-2">
              Tags, separated by commas
              <Input
                {...register('tagsText')}
                placeholder="e.g. Comfort food, One pot"
              />
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Meal types
            </legend>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((meal) => (
                <Chip
                  key={meal}
                  active={meals.includes(meal)}
                  onClick={() =>
                    setValue(
                      'meals',
                      meals.includes(meal)
                        ? meals.filter((entry) => entry !== meal)
                        : [...meals, meal],
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }>
                  {meal}
                </Chip>
              ))}
            </div>
            <FieldError message={errors.meals?.message} />
          </fieldset>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-2xl">Ingredients</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => ingredients.append(rowCopy(''))}>
                <Plus size={14} aria-hidden="true" /> Add row
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Write one ingredient per row. Category badges and conflicts update
              as you type.
            </p>
            <ol className="space-y-2">
              {ingredients.fields.map((field, index) => {
                const line = rawIngredients[index]?.value?.trim() ?? ''
                const category = line ? classifyIngredient(line) : null
                return (
                  <li key={field.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                        {index + 1}.
                      </span>
                      <Input
                        {...register(`ingredients.${index}.value`, {
                          onChange: clearSectionError('ingredients'),
                        })}
                        placeholder="e.g. 2 cups cherry tomatoes"
                        aria-label={`Ingredient ${index + 1}`}
                        aria-invalid={Boolean(
                          errors.ingredients?.[index]?.value,
                        )}
                      />
                      <div className="flex shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Move ingredient ${index + 1} up`}
                          disabled={index === 0}
                          onClick={() => ingredients.move(index, index - 1)}>
                          <ArrowUp size={14} aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Move ingredient ${index + 1} down`}
                          disabled={index === ingredients.fields.length - 1}
                          onClick={() => ingredients.move(index, index + 1)}>
                          <ArrowDown size={14} aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ingredient ${index + 1}`}
                          onClick={() => ingredients.remove(index)}>
                          <X size={14} aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pl-7">
                      {category && (
                        <Badge
                          tone="sage"
                          glyph={CATEGORY_META[category].glyph}>
                          {CATEGORY_META[category].label}
                        </Badge>
                      )}
                      <FieldError
                        message={errors.ingredients?.[index]?.value?.message}
                      />
                    </div>
                  </li>
                )
              })}
            </ol>
            <FieldError
              message={
                formError?.area === 'ingredients'
                  ? formError.message
                  : undefined
              }
            />
          </Card>

          <Card className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-2xl">Instructions</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => instructions.append(rowCopy(''))}>
                <Plus size={14} aria-hidden="true" /> Add step
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              One step per row. Reorder with the arrows; the method renders in
              this order.
            </p>
            <ol className="space-y-2">
              {instructions.fields.map((field, index) => (
                <li key={field.id} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="mt-2.5 w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      {index + 1}.
                    </span>
                    <Textarea
                      className="min-h-16 w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm"
                      {...register(`instructions.${index}.value`, {
                        onChange: clearSectionError('instructions'),
                      })}
                      placeholder="Describe this step"
                      aria-label={`Step ${index + 1}`}
                      aria-invalid={Boolean(
                        errors.instructions?.[index]?.value,
                      )}
                    />
                    <div className="flex shrink-0 flex-col">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move step ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => instructions.move(index, index - 1)}>
                        <ArrowUp size={14} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move step ${index + 1} down`}
                        disabled={index === instructions.fields.length - 1}
                        onClick={() => instructions.move(index, index + 1)}>
                        <ArrowDown size={14} aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove step ${index + 1}`}
                        onClick={() => instructions.remove(index)}>
                        <X size={14} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <div className="pl-7">
                    <FieldError
                      message={errors.instructions?.[index]?.value?.message}
                    />
                  </div>
                </li>
              ))}
            </ol>
            <FieldError
              message={
                formError?.area === 'instructions'
                  ? formError.message
                  : undefined
              }
            />
          </Card>
        </div>

        <Card className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60 sm:p-6">
          <h2 className="flex items-center gap-2 font-heading text-2xl">
            <ChefHat size={20} aria-hidden="true" /> Before you save
          </h2>
          <div className="flex flex-wrap gap-2">
            {previews.length ? (
              previews.map((preview) => (
                <Badge
                  key={`${preview.line}-${preview.category}`}
                  tone="neutral"
                  glyph={CATEGORY_META[preview.category].glyph}>
                  {preview.line}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Add ingredients to see how Savorly classifies them.
              </p>
            )}
          </div>
          {conflicts.length ? (
            <div className="rounded-xl border border-amber-600/30 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
              <p className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-100">
                <AlertTriangle size={16} aria-hidden="true" /> This recipe would
                be off your menu
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {conflicts.map((conflict) => (
                  <Badge key={conflict.id} tone="amber" glyph={conflict.glyph}>
                    {conflict.label}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-amber-900/80 dark:text-amber-100/80">
                You can still save it. It will appear on the Off-menu tab rather
                than in your ranked matches.
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-emerald-600/25 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              {previews.length
                ? 'No conflicts with your taste profile.'
                : 'Your taste profile will be checked once ingredients are added.'}
            </p>
          )}
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ButtonLink variant="ghost" to={mine ? `/recipes/${id}` : '/recipes'}>
            Cancel
          </ButtonLink>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : mine ? 'Save changes' : 'Save my recipe'}
              <ArrowRight size={17} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${mine?.recipe.name ?? 'this recipe'}?`}
        description="This deletes the recipe from this device only. It is local and irreversible — DummyJSON keeps no copy to restore."
        confirmLabel="Delete recipe"
        destructive
        onConfirm={() => void deleteConfirm()}
      />
    </PageLayout>
  )
}
