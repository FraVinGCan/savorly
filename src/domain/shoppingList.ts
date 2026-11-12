import {
  CATEGORY_ORDER,
  classifyIngredient,
  displayIngredient,
  normalizeIngredient,
} from './ingredients'

export interface PlannedIngredients {
  recipeId: string
  recipeName: string
  ingredients: string[]
}
export interface ShoppingItem {
  key: string
  label: string
  recipes: string[]
  category: string
}
export interface ShoppingSection {
  category: string
  items: ShoppingItem[]
}
export function buildShoppingList(entries: PlannedIngredients[]) {
  const merged = new Map<string, ShoppingItem>()
  for (const entry of entries)
    for (const raw of entry.ingredients) {
      const key = normalizeIngredient(raw)
      if (!key) continue
      const item = merged.get(key) ?? {
        key,
        label: displayIngredient(key),
        recipes: [],
        category: classifyIngredient(key),
      }
      if (!item.recipes.includes(entry.recipeName))
        item.recipes.push(entry.recipeName)
      merged.set(key, item)
    }
  const sections = CATEGORY_ORDER.map((category) => ({
    category,
    items: [...merged.values()]
      .filter((item) => item.category === category)
      .sort(
        (a, b) =>
          b.recipes.length - a.recipes.length || a.label.localeCompare(b.label),
      ),
  })).filter((section) => section.items.length)
  return {
    sections,
    itemCount: merged.size,
    recipeCount: new Set(entries.map((entry) => entry.recipeId)).size,
  }
}
