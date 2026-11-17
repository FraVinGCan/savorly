import { matchKeys, normalizeIngredient } from './ingredients'
import type { Recipe } from '../types/recipe'

export const DIETS = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'gluten-free',
  'dairy-free',
  'low-carb',
] as const
export type DietId = (typeof DIETS)[number]
export const ALLERGENS = [
  'meat',
  'poultry',
  'fish',
  'shellfish',
  'dairy',
  'egg',
  'gluten',
  'nuts',
  'sesame',
  'soy',
  'alcohol',
] as const
export type AllergenId = (typeof ALLERGENS)[number]
export const ALLERGEN_META: Record<
  AllergenId,
  { label: string; glyph: string }
> = {
  meat: { label: 'Meat', glyph: '🥩' },
  poultry: { label: 'Poultry', glyph: '🍗' },
  fish: { label: 'Fish', glyph: '🐟' },
  shellfish: { label: 'Shellfish', glyph: '🦐' },
  dairy: { label: 'Dairy', glyph: '🥛' },
  egg: { label: 'Egg', glyph: '🥚' },
  gluten: { label: 'Gluten', glyph: '🌾' },
  nuts: { label: 'Nuts', glyph: '🥜' },
  sesame: { label: 'Sesame', glyph: '🌱' },
  soy: { label: 'Soy', glyph: '🫘' },
  alcohol: { label: 'Alcohol', glyph: '🍷' },
}
export interface TasteProfile {
  version: 1
  displayName: string
  diets: DietId[]
  allergens: AllergenId[]
  avoidIngredients: string[]
  maxTotalMinutes: number | null
  maxCalories: number | null
  favoriteCuisines: string[]
  favoriteTags: string[]
  goal: 'balanced' | 'light' | 'comfort' | 'quick'
  spice: 'none' | 'mild' | 'medium' | 'hot'
  createdAt: string | null
}
export const DEFAULT_PROFILE: TasteProfile = {
  version: 1,
  displayName: '',
  diets: [],
  allergens: [],
  avoidIngredients: [],
  maxTotalMinutes: null,
  maxCalories: null,
  favoriteCuisines: [],
  favoriteTags: [],
  goal: 'balanced',
  spice: 'medium',
  createdAt: null,
}
const patterns: Record<AllergenId, RegExp> = {
  meat: /\b(?:beef|pork|lamb|bacon|ham|sausage|meat)\b/,
  poultry: /\b(?:chicken|turkey|duck|poultry)\b/,
  fish: /\b(?:fish|salmon|tuna|cod|anchovy|sardine)\b/,
  shellfish: /\b(?:shrimp|prawn|crab|lobster|shellfish|oyster|mussel)\b/,
  dairy: /\b(?:milk|cheese|butter|cream|yogurt|yoghurt|whey|casein)\b/,
  egg: /\beggs?\b/,
  gluten: /\b(?:wheat|barley|rye|gluten|bread|flour|pasta|noodle)\b/,
  nuts: /\b(?:almond|cashew|walnut|pecan|pistachio|hazelnut|peanut)\b/,
  sesame: /\bsesame\b/,
  soy: /\b(?:soy|soya|tofu|tempeh|edamame)\b/,
  alcohol: /\b(?:wine|beer|vodka|rum|sake|sherry|mirin|alcohol)\b/,
}
export function detectAllergens(raw: string): AllergenId[] {
  const key = normalizeIngredient(raw)
  const exceptions =
    /\b(?:rice paper|corn tortilla|rice noodle|cornmeal|tamari|quinoa|nori|buckwheat|potato starch)\b/.test(
      key,
    )
  const milkPlant = /\b(?:oat|almond|soy|coconut|rice) milk\b/.test(key)
  return ALLERGENS.filter(
    (id) =>
      !(id === 'dairy' && milkPlant) &&
      !(id === 'gluten' && exceptions) &&
      patterns[id].test(key),
  )
}
const blocked: Record<DietId, AllergenId[]> = {
  vegetarian: ['meat', 'poultry', 'fish', 'shellfish'],
  vegan: ['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'egg'],
  pescatarian: ['meat', 'poultry'],
  'gluten-free': ['gluten'],
  'dairy-free': ['dairy'],
  'low-carb': [],
}
const carbs =
  /\b(?:rice|pasta|noodle|bread|flour|potato|corn|sugar|honey|oat|bean|lentil|tortilla|starch|quinoa|couscous|cereal)\b/

export interface ProfileConflict {
  id: string
  label: string
  glyph: string
  kind: 'diet' | 'allergen' | 'custom'
}

const conflictMemo = new WeakMap<object, Map<string, ProfileConflict[]>>()

export function profileConflicts(
  recipe: Pick<Recipe, 'ingredients'> | string[],
  profile: Pick<TasteProfile, 'diets' | 'allergens' | 'avoidIngredients'>,
): ProfileConflict[] {
  const ingredients = Array.isArray(recipe) ? recipe : recipe.ingredients
  const signature = JSON.stringify([
    profile.diets,
    profile.allergens,
    profile.avoidIngredients,
  ])
  const cache = Array.isArray(recipe) ? undefined : conflictMemo.get(recipe)
  const cached = cache?.get(signature)
  if (cached) return cached
  const found = new Map<string, ProfileConflict>()
  const avoid = profile.avoidIngredients.flatMap(matchKeys)
  const add = (
    id: string,
    label: string,
    kind: ProfileConflict['kind'],
    glyph: string,
  ) => {
    if (!found.has(id)) found.set(id, { id, label, kind, glyph })
  }
  for (const raw of ingredients) {
    const key = normalizeIngredient(raw)
    const allergens = detectAllergens(key)
    const dietBlocked = new Set<AllergenId>()
    for (const diet of profile.diets) {
      for (const id of blocked[diet]) {
        if (allergens.includes(id)) {
          dietBlocked.add(id)
          add(`diet:${diet}`, `Does not fit ${diet}`, 'diet', '⚠️')
        }
      }
    }
    for (const id of profile.allergens) {
      if (allergens.includes(id) && !dietBlocked.has(id))
        add(
          `allergen:${id}`,
          `Contains ${ALLERGEN_META[id].label.toLowerCase()}`,
          'allergen',
          ALLERGEN_META[id].glyph,
        )
    }
    for (const diet of profile.diets) {
      if (diet === 'vegan' && /\bhoney\b/.test(key))
        add(`diet:${diet}`, 'Does not fit vegan', 'diet', '⚠️')
      if (diet === 'low-carb' && carbs.test(key))
        add(`diet:${diet}`, 'Does not fit low-carb', 'diet', '⚠️')
    }
    if (avoid.some((token) => matchKeys(key).includes(token)))
      add(`custom:${key}`, `Avoid ${key}`, 'custom', '✕')
  }
  const result = [...found.values()]
  if (!Array.isArray(recipe)) {
    const entries = cache ?? new Map<string, ProfileConflict[]>()
    entries.set(signature, result)
    conflictMemo.set(recipe, entries)
  }
  return result
}
export function allergenBadges(
  recipe: Pick<Recipe, 'ingredients'>,
): { id: AllergenId; label: string; glyph: string }[] {
  const detected = new Set(recipe.ingredients.flatMap(detectAllergens))
  return ALLERGENS.filter((id) => detected.has(id)).map((id) => ({
    id,
    ...ALLERGEN_META[id],
  }))
}
/**
 * Whitelists ids, coerces numbers and falls back to defaults. Shared by the
 * profile store, the importer and onboarding so no corrupt payload can crash
 * the app.
 */
export function sanitizeProfile(value: unknown): TasteProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { ...DEFAULT_PROFILE }
  const source = value as Record<string, unknown>
  const valid = (xs: unknown, allowed: readonly string[]) =>
    Array.isArray(xs)
      ? xs.filter(
          (x): x is string => typeof x === 'string' && allowed.includes(x),
        )
      : []
  const strings = (xs: unknown) =>
    Array.isArray(xs)
      ? xs
          .filter((x): x is string => typeof x === 'string')
          .map((x) => x.trim())
          .filter(Boolean)
      : []
  const number = (input: unknown) => {
    if (input === null || input === undefined || input === '') return null
    const parsed = Number(input)
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null
  }
  return {
    version: 1,
    displayName:
      typeof source.displayName === 'string'
        ? source.displayName.trim().slice(0, 80)
        : '',
    diets: valid(source.diets, DIETS) as DietId[],
    allergens: valid(source.allergens, ALLERGENS) as AllergenId[],
    avoidIngredients: strings(source.avoidIngredients),
    maxTotalMinutes: number(source.maxTotalMinutes),
    maxCalories: number(source.maxCalories),
    favoriteCuisines: strings(source.favoriteCuisines),
    favoriteTags: strings(source.favoriteTags),
    goal: ['balanced', 'light', 'comfort', 'quick'].includes(
      String(source.goal),
    )
      ? (source.goal as TasteProfile['goal'])
      : DEFAULT_PROFILE.goal,
    spice: ['none', 'mild', 'medium', 'hot'].includes(String(source.spice))
      ? (source.spice as TasteProfile['spice'])
      : DEFAULT_PROFILE.spice,
    createdAt:
      typeof source.createdAt === 'string' &&
      !Number.isNaN(Date.parse(source.createdAt))
        ? source.createdAt
        : null,
  }
}

export function parseProfile(raw: string): TasteProfile {
  try {
    return sanitizeProfile(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}
export const hasPreferences = (profile: TasteProfile) =>
  !!profile.createdAt &&
  !!(
    profile.diets.length ||
    profile.allergens.length ||
    profile.avoidIngredients.length ||
    profile.maxTotalMinutes ||
    profile.maxCalories ||
    profile.favoriteCuisines.length ||
    profile.favoriteTags.length
  )
export const eligible = (
  recipe: Pick<Recipe, 'ingredients'>,
  profile: TasteProfile,
) => profileConflicts(recipe.ingredients, profile).length === 0
