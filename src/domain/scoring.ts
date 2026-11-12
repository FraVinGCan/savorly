import type { CatalogRecipe, Recipe, RecipeId } from '../types/recipe'
import { eligible, profileConflicts, type TasteProfile } from './taste'
import { evaluatePantry, type PantryTokens } from './pantry'

export const MAX_RAW = 132
export interface EvaluationContext {
  profile: TasteProfile | null
  pantryTokens: PantryTokens | null
  cookedIds: Set<RecipeId>
}
export interface ScoreReason {
  id: string
  label: string
  weight: number
  tone: 'positive' | 'negative' | 'neutral'
}
export interface RecipeEvaluation {
  id: RecipeId
  score: number
  eligible: boolean
  reasons: ScoreReason[]
  conflicts: string[]
  pantry: ReturnType<typeof evaluatePantry> | null
  personalized: boolean
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))
const heatWords =
  /\b(?:chili|chilli|jalapeno|cayenne|harissa|gochujang|hot sauce|curry powder|garam masala|sriracha|hot pepper|chile)\b/i

export function evaluateRecipe(
  item: CatalogRecipe,
  ctx: EvaluationContext,
): RecipeEvaluation
export function evaluateRecipe(
  recipe: Recipe,
  ctx: EvaluationContext,
  catalogId: RecipeId,
): RecipeEvaluation
export function evaluateRecipe(
  input: CatalogRecipe | Recipe,
  ctx: EvaluationContext,
  catalogId?: RecipeId,
): RecipeEvaluation {
  const item: CatalogRecipe =
    'recipe' in input
      ? input
      : {
          id: catalogId ?? `api-${input.id}`,
          source: catalogId?.startsWith('mine-') ? 'mine' : 'api',
          recipe: input,
        }
  const { recipe } = item
  const profile = ctx.profile
  const personalized = !!profile?.createdAt
  const pantry = ctx.pantryTokens?.size
    ? evaluatePantry(recipe, ctx.pantryTokens)
    : null

  if (!personalized || !profile) {
    const score = clamp(Math.round(35 + recipe.rating * 13), 0, 100)
    return {
      id: item.id,
      score,
      eligible: true,
      conflicts: [],
      pantry,
      personalized: false,
      reasons: [
        {
          id: 'rating',
          label: `Rated ${recipe.rating.toFixed(1)} by cooks`,
          weight: score,
          tone: 'neutral',
        },
      ],
    }
  }

  const conflicts = profileConflicts(recipe, profile)
  if (conflicts.length) {
    return {
      id: item.id,
      score: 0,
      eligible: false,
      conflicts: conflicts.map((conflict) => conflict.label),
      pantry,
      personalized: true,
      reasons: [],
    }
  }

  const reasons: ScoreReason[] = []
  const add = (id: string, label: string, weight: number) => {
    if (!weight) return
    reasons.push({
      id,
      label,
      weight,
      tone: weight > 0 ? 'positive' : 'negative',
    })
  }
  const minutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes
  if (profile.favoriteCuisines.includes(recipe.cuisine))
    add('cuisine', `You like ${recipe.cuisine}`, 22)
  const tagHits = recipe.tags.filter((tag) =>
    profile.favoriteTags.includes(tag),
  )
  if (tagHits.length)
    add(
      'tags',
      `Matches ${tagHits.slice(0, 2).join(', ')}`,
      Math.min(36, tagHits.length * 12),
    )

  if (profile.maxTotalMinutes) {
    const ratio = minutes / profile.maxTotalMinutes
    add(
      'time',
      ratio <= 1 ? 'Fits your time budget' : 'Over your time budget',
      ratio <= 1
        ? clamp(18 * (1 - ratio), 0, 18)
        : -clamp((ratio - 1) * 24, 0, 20),
    )
  }
  if (profile.maxCalories) {
    const ratio = recipe.caloriesPerServing / profile.maxCalories
    add(
      'calories',
      ratio <= 1 ? 'Fits your calorie limit' : 'Over your calorie limit',
      ratio <= 1
        ? clamp(14 * (1 - ratio), 0, 14)
        : -clamp((ratio - 1) * 18, 0, 16),
    )
  }

  const dinner =
    recipe.mealType.some((meal) => /dinner|lunch|main course/i.test(meal)) ||
    recipe.tags.includes('Main course')
  if (profile.goal === 'light' && recipe.caloriesPerServing <= 250)
    add('goal', 'A light choice', 18)
  if (profile.goal === 'comfort' && dinner)
    add('goal', 'A comforting main meal', 18)
  if (profile.goal === 'quick' && minutes <= 30)
    add('goal', 'Quick to make', 18)
  if (profile.goal === 'balanced') add('goal', 'Fits your balanced goal', 6)

  const spicy = heatWords.test(
    [...recipe.tags, ...recipe.ingredients].join(' '),
  )
  if (spicy) {
    if (profile.spice === 'none') add('spice', 'May be too spicy for you', -22)
    if (profile.spice === 'mild') add('spice', 'Has some heat', -8)
    if (profile.spice === 'hot')
      add('spice', 'A good fit for your heat preference', 10)
  }
  if (pantry && recipe.ingredients.length) {
    const weight = pantry.coverage * 20
    add(
      'pantry',
      `Uses ${pantry.have.length} of ${recipe.ingredients.length} things you have`,
      weight,
    )
  }
  add('rating', 'Community rating', (recipe.rating - 4) * 12)
  if (recipe.reviewCount >= 4)
    add(
      'reviews',
      `${recipe.reviewCount} community reviews`,
      Math.min(recipe.reviewCount, 12) * 0.5,
    )
  if (!ctx.cookedIds.has(item.id)) add('novelty', 'Something new to try', 8)

  const raw = reasons.reduce((sum, reason) => sum + reason.weight, 0)
  reasons.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
  return {
    id: item.id,
    score: clamp(Math.round((raw / MAX_RAW) * 100), 0, 100),
    eligible: true,
    conflicts: [],
    pantry,
    personalized: true,
    reasons,
  }
}

export const scoreTier = (score: number) =>
  score >= 75
    ? 'Great match'
    : score >= 60
      ? 'Good match'
      : score >= 45
        ? 'Fair match'
        : 'Long shot'

export function rankRecipes(
  catalog: CatalogRecipe[],
  ctx: EvaluationContext,
  limit?: number,
) {
  return catalog
    .map((item) => ({ item, evaluation: evaluateRecipe(item, ctx) }))
    .filter((row) => row.evaluation.eligible)
    .sort(
      (a, b) =>
        b.evaluation.score - a.evaluation.score ||
        b.item.recipe.rating - a.item.recipe.rating,
    )
    .slice(0, limit)
    .map((row) => ({ ...row.item, evaluation: row.evaluation }))
}

export const excludedRecipes = (
  catalog: CatalogRecipe[],
  ctx: EvaluationContext,
) =>
  catalog
    .filter((item) => ctx.profile && !eligible(item.recipe, ctx.profile))
    .sort((a, b) => a.recipe.name.localeCompare(b.recipe.name))

export const eligibleCount = (
  catalog: CatalogRecipe[],
  ctx: EvaluationContext,
) =>
  catalog.filter(
    (item) =>
      !ctx.profile ||
      !ctx.profile.createdAt ||
      eligible(item.recipe, ctx.profile),
  ).length
