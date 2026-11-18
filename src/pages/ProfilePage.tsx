import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import {
  Bookmark,
  ChefHat,
  Download,
  Leaf,
  Moon,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Utensils,
} from 'lucide-react'
import { ALLERGEN_META, DIETS, type TasteProfile } from '../domain/taste'
import { countFor, usePlannerStore, validatePlanner } from '../stores/planner'
import { useCookbookStore, validateCookbook } from '../stores/cookbook'
import { usePantryStore, validatePantry } from '../stores/pantry'
import { useCompareStore, validateCompare } from '../stores/compare'
import { useCreationsStore, validateCreations } from '../stores/creations'
import { useProfileStore, validateProfileStore } from '../stores/profile'
import { isThemeChoice, useThemeStore } from '../stores/theme'
import { toast } from '../stores/toast'
import { useTheme } from '../components/theme-context'
import {
  ALL_STORAGE_KEYS,
  DATA_KEYS,
  STORAGE_KEYS,
  clearStorageKeys,
  isRecord,
  persistedState,
  readJson,
  readRaw,
  storageBytes,
} from '../lib/storage'
import { GOAL_LABELS, SPICE_LABELS, formatBytes, plural } from '../lib/format'
import { weekKey } from '../domain/week'
import { useRecipes } from '../hooks/useRecipes'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageHeader, PageLayout } from '../components/app-shared'
import {
  Badge,
  ButtonLink,
  Chip,
  ConfirmDialog,
  EmptyState,
  SectionHeading,
  Stat,
} from '../components/primitives'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Checkbox } from '../components/ui/controls'
import { TabGroup } from '../components/ui/tabs'
import type { RecipeId } from '../types/recipe'
import { recipeSlug } from '../types/recipe'

type ProfileTab = 'taste' | 'data' | 'creations' | 'appearance'
type ClearZone =
  | 'profile'
  | 'cookbook'
  | 'pantry'
  | 'planner'
  | 'creations'
  | 'compare'
  | 'everything'

const CLEAR_ZONES: Record<
  ClearZone,
  { label: string; title: string; loss: string }
> = {
  profile: {
    label: 'Taste profile',
    title: 'Clear your taste profile?',
    loss: 'Your name, diets, allergens, avoid list, goal, spice level, favourite cuisines and tags, and time or calorie limits will be removed. Saved recipes, plans and pantry items stay.',
  },
  cookbook: {
    label: 'Cookbook',
    title: 'Clear your cookbook?',
    loss: 'Every favourite, private note, your rating, and your whole cook history will be removed. Pantry items, plans and your taste profile stay.',
  },
  pantry: {
    label: 'Pantry',
    title: 'Clear your pantry?',
    loss: 'Every pantry item will be removed, and pantry coverage will drop to nothing. Recipes, plans and notes stay.',
  },
  planner: {
    label: 'Planner',
    title: 'Clear your plans?',
    loss: 'Every planned meal and every ticked shopping-list item will be removed. Recipes, pantry and notes stay.',
  },
  creations: {
    label: 'My recipes',
    title: 'Clear your own recipes?',
    loss: 'Every recipe you created on this device will be removed. Favourites, notes, plans and ratings for other recipes stay.',
  },
  compare: {
    label: 'Compare tray',
    title: 'Clear the compare tray?',
    loss: 'The recipes waiting in your compare tray will be removed. Everything else stays.',
  },
  everything: {
    label: 'Everything',
    title: 'Clear all Savorly data?',
    loss: 'This removes your profile, cookbook, pantry, plans, creations, compare tray and theme choice from this browser. There is no account to restore them from — export a backup first if you want to keep a copy.',
  },
}

const BACKUP_VERSION_KEY = 'savorly.version'

export default function Profile() {
  useDocumentTitle('Profile')
  const { catalog, cuisines, tags } = useRecipes()
  const profile = useProfileStore((state) => state.profile)
  const update = useProfileStore((state) => state.update)
  const toggleDiet = useProfileStore((state) => state.toggleDiet)
  const toggleAllergen = useProfileStore((state) => state.toggleAllergen)
  const toggleCuisine = useProfileStore((state) => state.toggleCuisine)
  const toggleTag = useProfileStore((state) => state.toggleTag)
  const addAvoidIngredient = useProfileStore(
    (state) => state.addAvoidIngredient,
  )
  const removeAvoidIngredient = useProfileStore(
    (state) => state.removeAvoidIngredient,
  )
  const setGoal = useProfileStore((state) => state.setGoal)
  const setSpice = useProfileStore((state) => state.setSpice)
  const resetProfile = useProfileStore((state) => state.reset)

  const favoriteCount = useCookbookStore(
    (state) => Object.keys(state.favorites).length,
  )
  const totalCooks = useCookbookStore((state) =>
    Object.values(state.cooked).reduce((sum, entry) => sum + entry.count, 0),
  )
  const noteCount = useCookbookStore((state) => Object.keys(state.notes).length)
  const pantryItems = usePantryStore((state) => state.items)
  const weeks = usePlannerStore((state) => state.weeks)
  const creations = useCreationsStore((state) => state.creations)
  const deleteCreation = useCreationsStore((state) => state.deleteCreation)
  const forgetCreation = useCreationsStore((state) => state.forgetCreation)
  const { theme, setTheme } = useTheme()

  const [tab, setTab] = useState<ProfileTab>('taste')
  const [clearTarget, setClearTarget] = useState<ClearZone | null>(null)
  const [resetTaste, setResetTaste] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: RecipeId
    name: string
  } | null>(null)
  const [storageTick, setStorageTick] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, setError, formState } = useForm<{
    ingredient: string
  }>({ defaultValues: { ingredient: '' } })

  const planned = countFor(usePlannerStore.getState(), weekKey(new Date()))

  const usage = useMemo(() => {
    void storageTick
    const rows = ALL_STORAGE_KEYS.map((key) => ({
      key,
      bytes: storageBytes(key),
    }))
    const max = Math.max(1, ...rows.map((row) => row.bytes))
    return { rows, max, total: rows.reduce((sum, row) => sum + row.bytes, 0) }
  }, [storageTick])

  const addAvoid = handleSubmit((values) => {
    const entry = values.ingredient.trim()
    if (!entry) {
      setError('ingredient', { message: 'Type an ingredient first.' })
      return
    }
    if (profile.avoidIngredients.includes(entry.toLocaleLowerCase())) {
      toast.info('Already on your avoid list', entry)
    } else {
      addAvoidIngredient(entry)
      toast.success('Added to your avoid list', entry)
    }
    reset({ ingredient: '' })
  })

  const exportBackup = () => {
    const backup: Record<string, unknown> = {
      [BACKUP_VERSION_KEY]: 1,
      exportedAt: new Date().toISOString(),
    }
    for (const key of ALL_STORAGE_KEYS) {
      if (key === STORAGE_KEYS.theme) {
        backup[key] = readRaw(key)
        continue
      }
      const value = readJson(key)
      backup[key] = value === null ? null : (persistedState(value) ?? value)
    }
    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: 'application/json',
        }),
      )
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `savorly-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success(
        'Backup exported',
        'Seven storage sections written to JSON.',
      )
    } catch {
      toast.error(
        'Could not export your data',
        'Your browser blocked the download.',
      )
    }
  }

  const importBackup = async (file?: File) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      if (!isRecord(parsed)) throw new Error('Not an object')
      const validators: Record<string, (value: unknown) => unknown> = {
        [STORAGE_KEYS.profile]: (value) => validateProfileStore(value),
        [STORAGE_KEYS.cookbook]: (value) => validateCookbook(value),
        [STORAGE_KEYS.pantry]: (value) => validatePantry(value),
        [STORAGE_KEYS.planner]: (value) => validatePlanner(value),
        [STORAGE_KEYS.creations]: (value) => validateCreations(value),
        [STORAGE_KEYS.compare]: (value) => validateCompare(value),
      }
      let restored = 0
      for (const key of DATA_KEYS) {
        if (!(key in parsed)) continue
        const value = parsed[key]
        if (value === null) {
          clearStorageKeys([key])
          restored += 1
          continue
        }
        const raw = persistedState(value) ?? value
        const clean = validators[key]?.(raw)
        if (clean === undefined) continue
        localStorage.setItem(key, JSON.stringify({ state: clean, version: 1 }))
        restored += 1
      }
      if (STORAGE_KEYS.theme in parsed) {
        const value = parsed[STORAGE_KEYS.theme]
        if (isThemeChoice(value)) {
          localStorage.setItem(STORAGE_KEYS.theme, value)
          restored += 1
        }
      }
      if (!restored) throw new Error('No recognisable sections')
      toast.success(
        `${restored} Savorly ${restored === 1 ? 'section' : 'sections'} restored`,
        'Reloading so every store rehydrates cleanly.',
      )
      window.setTimeout(() => window.location.reload(), 900)
    } catch {
      toast.error(
        'This file is not a valid Savorly backup',
        'Nothing was changed. Export a fresh backup and try again.',
      )
    }
  }

  const clearZone = () => {
    if (!clearTarget) return
    const zone = clearTarget
    if (zone === 'everything') {
      clearStorageKeys(ALL_STORAGE_KEYS)
      useProfileStore.getState().reset()
      useCookbookStore.getState().reset()
      usePantryStore.getState().clear()
      usePlannerStore.getState().reset()
      useCreationsStore.getState().reset()
      useCompareStore.getState().clear()
      useThemeStore.getState().setTheme('system')
    } else {
      const keys: Record<Exclude<ClearZone, 'everything'>, string> = {
        profile: STORAGE_KEYS.profile,
        cookbook: STORAGE_KEYS.cookbook,
        pantry: STORAGE_KEYS.pantry,
        planner: STORAGE_KEYS.planner,
        creations: STORAGE_KEYS.creations,
        compare: STORAGE_KEYS.compare,
      }
      clearStorageKeys([keys[zone]])
      if (zone === 'profile') useProfileStore.getState().reset()
      if (zone === 'cookbook') useCookbookStore.getState().reset()
      if (zone === 'pantry') usePantryStore.getState().clear()
      if (zone === 'planner') usePlannerStore.getState().reset()
      if (zone === 'creations') useCreationsStore.getState().reset()
      if (zone === 'compare') useCompareStore.getState().clear()
    }
    setStorageTick((tick) => tick + 1)
    toast.success('Cleared', CLEAR_ZONES[zone].label)
    setClearTarget(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    const result = await deleteCreation(target.id)
    if (result.synced) toast.success('Recipe deleted', target.name)
    else {
      forgetCreation(target.id)
      toast.info(
        'Removed from this device',
        'The API echo failed, so Savorly used the local-only fallback.',
      )
    }
  }

  const tasteContent = (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
          <SectionHeading
            title="The basics"
            sub="A name for the greeting, and the shape of your week."
            className="mb-2"
          />
          <label className="flex flex-col gap-2 text-xs font-semibold">
            Display name
            <Input
              value={profile.displayName}
              onChange={(event) => update({ displayName: event.target.value })}
              placeholder="What should we call you?"
              maxLength={80}
            />
          </label>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cooking style
            </h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(GOAL_LABELS) as TasteProfile['goal'][]).map(
                (goal) => (
                  <Chip
                    key={goal}
                    active={profile.goal === goal}
                    onClick={() => setGoal(goal)}>
                    {GOAL_LABELS[goal]}
                  </Chip>
                ),
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Heat tolerance
            </h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SPICE_LABELS) as TasteProfile['spice'][]).map(
                (spice) => (
                  <Chip
                    key={spice}
                    active={profile.spice === spice}
                    onClick={() => setSpice(spice)}>
                    {SPICE_LABELS[spice]}
                  </Chip>
                ),
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-semibold">
              Max total time
              <input
                type="range"
                min={0}
                max={120}
                step={5}
                value={profile.maxTotalMinutes ?? 0}
                onChange={(event) =>
                  update({
                    maxTotalMinutes: Number(event.target.value) || null,
                  })
                }
                className="accent-primary"
                aria-label="Maximum total cooking time in minutes, zero means any"
              />
              <span className="text-xs font-normal text-muted-foreground">
                {profile.maxTotalMinutes
                  ? `${profile.maxTotalMinutes} minutes`
                  : 'Any length'}
              </span>
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold">
              Max calories per serving
              <input
                type="range"
                min={0}
                max={1000}
                step={25}
                value={profile.maxCalories ?? 0}
                onChange={(event) =>
                  update({ maxCalories: Number(event.target.value) || null })
                }
                className="accent-primary"
                aria-label="Maximum calories per serving, zero means any"
              />
              <span className="text-xs font-normal text-muted-foreground">
                {profile.maxCalories
                  ? `${profile.maxCalories} kcal`
                  : 'Any calories'}
              </span>
            </label>
          </div>
        </Card>

        <Card className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
          <SectionHeading
            title="Diets and allergens"
            sub="Every surface uses the same keyword engine, so these choices agree everywhere."
            className="mb-2"
          />
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Diet preferences
            </h3>
            <div className="space-y-1.5">
              {DIETS.map((diet) => (
                <label
                  key={diet}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-muted">
                  <Checkbox
                    checked={profile.diets.includes(diet)}
                    onCheckedChange={() => toggleDiet(diet)}
                    label={diet}
                  />
                  <span className="capitalize">{diet}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Allergies and sensitivities
            </h3>
            <div className="flex flex-wrap gap-2">
              {(
                Object.keys(ALLERGEN_META) as (keyof typeof ALLERGEN_META)[]
              ).map((allergen) => (
                <Chip
                  key={allergen}
                  active={profile.allergens.includes(allergen)}
                  onClick={() => toggleAllergen(allergen)}>
                  <span aria-hidden="true">
                    {ALLERGEN_META[allergen].glyph}
                  </span>
                  {ALLERGEN_META[allergen].label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Never show these ingredients
            </h3>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={addAvoid}>
              <Input
                {...register('ingredient')}
                placeholder="e.g. mushrooms"
                aria-label="Ingredient to avoid"
              />
              <Button variant="outline" type="submit">
                Add
              </Button>
            </form>
            {formState.errors.ingredient && (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {formState.errors.ingredient.message}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.avoidIngredients.length ? (
                profile.avoidIngredients.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background py-1 pl-3 pr-1 text-xs">
                    {item}
                    <button
                      type="button"
                      aria-label={`Remove ${item} from avoid list`}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => removeAvoidIngredient(item)}>
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  Nothing on the avoid list.
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
          <SectionHeading
            title="Favourite cuisines"
            sub={`${profile.favoriteCuisines.length} chosen · ${catalog.length} recipes in the catalogue.`}
            className="mb-2"
          />
          <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1">
            {cuisines.map((cuisine) => (
              <Chip
                key={cuisine}
                active={profile.favoriteCuisines.includes(cuisine)}
                onClick={() => toggleCuisine(cuisine)}>
                {cuisine}
              </Chip>
            ))}
          </div>
        </Card>
        <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
          <SectionHeading
            title="Favourite tags"
            sub={`${profile.favoriteTags.length} chosen · tags come from the live catalogue.`}
            className="mb-2"
          />
          <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1">
            {tags.map((tag) => (
              <Chip
                key={tag}
                active={profile.favoriteTags.includes(tag)}
                onClick={() => toggleTag(tag)}>
                {tag}
              </Chip>
            ))}
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
        <SectionHeading
          title="How Savorly sees you"
          sub="These are the preferences every score and recommendation reads."
          className="mb-2"
        />
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral" glyph="🎯">
            {GOAL_LABELS[profile.goal]}
          </Badge>
          <Badge tone="neutral" glyph="🌶️">
            {SPICE_LABELS[profile.spice]}
          </Badge>
          {profile.diets.map((diet) => (
            <Badge key={diet} tone="sage" glyph="🌿">
              {diet}
            </Badge>
          ))}
          {profile.allergens.map((allergen) => (
            <Badge
              key={allergen}
              tone="amber"
              glyph={ALLERGEN_META[allergen].glyph}>
              no {ALLERGEN_META[allergen].label.toLowerCase()}
            </Badge>
          ))}
          {profile.avoidIngredients.map((item) => (
            <Badge key={item} tone="red" glyph="✕">
              avoid {item}
            </Badge>
          ))}
          {profile.maxTotalMinutes && (
            <Badge tone="neutral" glyph="⏱">
              ≤ {profile.maxTotalMinutes} min
            </Badge>
          )}
          {profile.maxCalories && (
            <Badge tone="neutral" glyph="🔥">
              ≤ {profile.maxCalories} kcal
            </Badge>
          )}
          {profile.favoriteCuisines.slice(0, 3).map((cuisine) => (
            <Badge key={cuisine} tone="brand" glyph="🍽">
              {cuisine}
            </Badge>
          ))}
          {!profile.createdAt && (
            <Badge tone="neutral" glyph="✨">
              Onboarding not finished
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          className="mt-4 text-destructive"
          onClick={() => setResetTaste(true)}>
          Reset taste profile
        </Button>
      </Card>
    </div>
  )

  const dataContent = (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
          <SectionHeading
            title="Backup and restore"
            sub="One pretty-printed JSON file covering all seven storage keys."
            className="mb-2"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportBackup}>
              <Download size={16} aria-hidden="true" /> Export your data
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInput.current?.click()}>
              <Upload size={16} aria-hidden="true" /> Import a backup
            </Button>
            <input
              ref={fileInput}
              hidden
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                void importBackup(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Import validates every section against the same defensive parsers
            the app uses on load. Unknown keys are ignored, and no corrupt value
            can crash the app. The page reloads after a successful import.
          </p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
          <SectionHeading
            title="Storage usage"
            sub={`${formatBytes(usage.total)} across ${ALL_STORAGE_KEYS.length} keys in this browser.`}
            className="mb-2"
          />
          <ul className="space-y-2.5">
            {usage.rows.map((row) => (
              <li key={row.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <code className="truncate">{row.key}</code>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatBytes(row.bytes)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(row.bytes / usage.max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
        <SectionHeading
          title="Clear data by section"
          sub="Each zone is independent and always confirms what will be lost."
          className="mb-2"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(CLEAR_ZONES) as ClearZone[]).map((zone) => (
            <div
              key={zone}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2.5">
              <span className="text-sm font-medium">
                {CLEAR_ZONES[zone].label}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setClearTarget(zone)}>
                <Trash2 size={14} aria-hidden="true" /> Clear
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )

  const creationsContent = creations.length ? (
    <div className="space-y-4">
      <p className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-xs leading-5 text-muted-foreground">
        Editing writes a new local copy through the API&apos;s echo endpoint
        because DummyJSON has no real writes. If that echo fails, Savorly keeps
        the local edit and tells you. Deleting is local-only and cannot be
        undone.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {creations.map(({ catalogId, recipe }) => (
          <Card
            key={catalogId}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={`/recipes/${recipeSlug(catalogId)}`}
                  className="font-heading text-lg leading-tight hover:text-primary">
                  {recipe.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recipe.cuisine} · {recipe.difficulty} ·{' '}
                  {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
                </p>
              </div>
              <Badge tone="sage" glyph="✎">
                Yours
              </Badge>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <ButtonLink
                variant="outline"
                size="sm"
                to={`/creations/${recipeSlug(catalogId)}/edit`}>
                <Pencil size={14} aria-hidden="true" />
                Edit
              </ButtonLink>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() =>
                  setDeleteTarget({ id: catalogId, name: recipe.name })
                }>
                <Trash2 size={14} aria-hidden="true" /> Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  ) : (
    <EmptyState
      glyph="✍️"
      title="No recipes of your own yet"
      body="Add one and it joins the catalogue with a stable mine-* id, scores alongside API recipes, and survives a reload."
      actions={
        <ButtonLink to="/creations/new">
          <Sparkles size={16} aria-hidden="true" />
          Add a recipe
        </ButtonLink>
      }
    />
  )

  const appearanceContent = (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
        <SectionHeading
          title="Theme"
          sub="System follows your device. The choice is saved before the page paints, so there is no flash."
          className="mb-2"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['light', 'Light', '☀️'],
              ['dark', 'Dark', '🌙'],
              ['system', 'System', '🖥️'],
            ] as const
          ).map(([value, label, glyph]) => (
            <Chip
              key={value}
              active={theme === value}
              onClick={() => {
                setTheme(value)
                toast.success(`Theme set to ${label.toLowerCase()}`)
              }}>
              <span aria-hidden="true">{glyph}</span>
              {label}
            </Chip>
          ))}
        </div>
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Moon size={14} aria-hidden="true" />
          Saved as an unquoted string at <code>{STORAGE_KEYS.theme}</code> so
          the bootstrap script can read it.
        </p>
      </Card>

      <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
        <SectionHeading
          title="What Savorly does not do"
          sub="A short, honest list."
          className="mb-2"
        />
        <ul className="space-y-2.5 text-sm">
          {[
            ['ShieldCheck', 'No accounts. There is nothing to sign up for.'],
            ['ShieldCheck', 'No tracking, analytics or advertising pixels.'],
            [
              'ShieldCheck',
              'No server writes. Your kitchen data stays in this browser.',
            ],
            [
              'ShieldCheck',
              'No diet guarantees. Allergen detection is keyword-based, not a medical claim.',
            ],
          ].map(([, text], index) => (
            <li key={index} className="flex items-start gap-2.5">
              <ShieldCheck
                size={16}
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="text-muted-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )

  const tabs = [
    {
      value: 'taste' as const,
      label: 'Taste profile',
      content: tasteContent,
    },
    {
      value: 'data' as const,
      label: 'Your data',
      count: ALL_STORAGE_KEYS.length,
      content: dataContent,
    },
    {
      value: 'creations' as const,
      label: 'My recipes',
      count: creations.length,
      content: creationsContent,
    },
    {
      value: 'appearance' as const,
      label: 'Appearance',
      content: appearanceContent,
    },
  ]

  return (
    <PageLayout className="space-y-8">
      <PageHeader
        eyebrow="YOUR SAVORLY"
        title="Your kitchen, your preferences."
        sub="A few details help us bring the right recipes closer. Everything below is stored in this browser only."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Bookmark size={19} />}
          value={favoriteCount}
          label="recipes saved"
          hint={plural(noteCount, 'note')}
        />
        <Stat
          icon={<ChefHat size={19} />}
          value={totalCooks}
          label="times cooked"
          hint={planned ? `${planned} planned this week` : 'Nothing planned'}
        />
        <Stat
          icon={<Utensils size={19} />}
          value={creations.length}
          label="recipes of your own"
          hint="Stable mine-* ids"
        />
        <Stat
          icon={<Leaf size={19} />}
          value={pantryItems.length}
          label="pantry items"
          hint={`${Object.keys(weeks).length} planned ${Object.keys(weeks).length === 1 ? 'week' : 'weeks'}`}
        />
      </div>

      <TabGroup
        label="Profile sections"
        value={tab}
        onValueChange={setTab}
        items={tabs}
      />

      <ConfirmDialog
        open={resetTaste}
        onOpenChange={setResetTaste}
        title="Reset your taste profile?"
        description="This clears your diets, allergens, avoid list, favourite cuisines and tags, goal, spice level, and limits. Saved recipes, notes, pantry items and plans stay."
        confirmLabel="Reset profile"
        destructive
        onConfirm={() => {
          resetProfile()
          toast.success('Taste profile reset')
        }}
      />

      <ConfirmDialog
        open={Boolean(clearTarget)}
        onOpenChange={(open) => !open && setClearTarget(null)}
        title={clearTarget ? CLEAR_ZONES[clearTarget].title : 'Clear data?'}
        description={clearTarget ? CLEAR_ZONES[clearTarget].loss : undefined}
        confirmLabel={
          clearTarget
            ? `Clear ${CLEAR_ZONES[clearTarget].label.toLowerCase()}`
            : 'Clear'
        }
        destructive
        onConfirm={clearZone}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? 'this recipe'}?`}
        description="This deletes the recipe from this device only. It cannot be undone, and the API keeps no copy to restore."
        confirmLabel="Delete recipe"
        destructive
        onConfirm={() => void confirmDelete()}
      />
    </PageLayout>
  )
}
