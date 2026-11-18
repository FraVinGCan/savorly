export interface Recipe {
  id: number
  name: string
  ingredients: string[]
  instructions: string[]
  prepTimeMinutes: number
  cookTimeMinutes: number
  servings: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  cuisine: string
  caloriesPerServing: number
  tags: string[]
  mealType: string[]
  userId: number
  image: string
  rating: number
  reviewCount: number
}

export type RecipeId = `api-${number}` | `mine-${string}`
export type CatalogRecipe = {
  id: RecipeId
  source: 'api' | 'mine'
  recipe: Recipe
}
export type StoredCreation = { catalogId: RecipeId; recipe: Recipe }
export interface RecipeListResponse {
  recipes: Recipe[]
  total: number
  skip: number
  limit: number
}
export interface Author {
  id: number
  firstName: string
  lastName: string
  image?: string
}

export const apiId = (recipe: Recipe): RecipeId => `api-${recipe.id}`
export const isApiId = (id: string): id is `api-${number}` =>
  /^api-\d+$/.test(id)
export const isMineId = (id: string): id is `mine-${string}` =>
  id.startsWith('mine-')
export const numericId = (id: RecipeId): number =>
  Number(id.replace(/^api-/, '')) || 0

/** Public URL slug: the recipe number for the catalogue, the UUID for creations. */
export const recipeSlug = (id: RecipeId): string =>
  id.startsWith('api-') ? id.slice(4) : id.slice(5)

/** Resolves a route slug to a catalogue id, accepting older prefixed links. */
export const recipeIdFromSlug = (
  slug: string | undefined,
): RecipeId | undefined => {
  if (!slug) return undefined
  if (isApiId(slug) || isMineId(slug)) return slug as RecipeId
  return (/^\d+$/.test(slug) ? `api-${slug}` : `mine-${slug}`) as RecipeId
}

const imagePalette = [
  'f2e8d5',
  'dce7d0',
  'e9e5f3',
  'f4e2e5',
  'e1eee9',
  'f7e7d7',
  'e5edf6',
  'f4e9c9',
]
function generatedImage(name: string): string {
  let hash = 31
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  const background = imagePalette[Math.abs(hash) % imagePalette.length]!
  return `https://dummyjson.com/image/800/600?backgroundColor=${background}&text=${encodeURIComponent(name)}`
}

export function normalise(input: Partial<Recipe>): Recipe {
  return {
    id: Number(input.id) || 0,
    name:
      typeof input.name === 'string' && input.name.trim()
        ? input.name.trim()
        : 'Untitled recipe',
    ingredients: Array.isArray(input.ingredients)
      ? input.ingredients.filter((v): v is string => typeof v === 'string')
      : [],
    instructions: Array.isArray(input.instructions)
      ? input.instructions.filter((v): v is string => typeof v === 'string')
      : [],
    prepTimeMinutes: Math.max(0, Number(input.prepTimeMinutes) || 0),
    cookTimeMinutes: Math.max(0, Number(input.cookTimeMinutes) || 0),
    servings: Math.max(1, Number(input.servings) || 1),
    difficulty:
      input.difficulty === 'Easy' || input.difficulty === 'Hard'
        ? input.difficulty
        : 'Medium',
    cuisine:
      typeof input.cuisine === 'string' && input.cuisine.trim()
        ? input.cuisine.trim()
        : 'Home cooking',
    caloriesPerServing: Math.max(0, Number(input.caloriesPerServing) || 0),
    tags: Array.isArray(input.tags)
      ? input.tags.filter((v): v is string => typeof v === 'string')
      : [],
    mealType: Array.isArray(input.mealType)
      ? input.mealType.filter((v): v is string => typeof v === 'string')
      : [],
    userId: Number(input.userId) || 0,
    image:
      typeof input.image === 'string' && input.image
        ? input.image
        : generatedImage(
            typeof input.name === 'string' && input.name.trim()
              ? input.name.trim()
              : 'Home cooking',
          ),
    rating: Math.max(0, Number(input.rating) || 0),
    reviewCount: Math.max(0, Number(input.reviewCount) || 0),
  }
}
