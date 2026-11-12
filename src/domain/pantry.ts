import { matchKeys, normalizeIngredient } from './ingredients'
import type { Recipe } from '../types/recipe'
export type PantryTokens = Set<string>
export const pantryTokens = (items: string[]): PantryTokens =>
  new Set(items.flatMap(matchKeys))
export function evaluatePantry(recipe: Recipe, tokens: PantryTokens) {
  const have = recipe.ingredients.filter((item) =>
    matchKeys(item).some((key) => tokens.has(key)),
  )
  const missing = recipe.ingredients.filter(
    (item) => !matchKeys(item).some((key) => tokens.has(key)),
  )
  return {
    have,
    missing,
    coverage: recipe.ingredients.length
      ? have.length / recipe.ingredients.length
      : 0,
  }
}
export const canCookNow = (recipe: Recipe, tokens: PantryTokens) =>
  tokens.size > 0 && evaluatePantry(recipe, tokens).missing.length === 0
export const dedupePantry = (items: string[]) => {
  const entries = new Map<string, string>()
  for (const item of items) {
    const display = item.trim().toLocaleLowerCase()
    const key = normalizeIngredient(display)
    if (key && !entries.has(key)) entries.set(key, display)
  }
  return [...entries.values()]
}
