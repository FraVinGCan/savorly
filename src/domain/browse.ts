import type { CatalogRecipe } from '../types/recipe'
import type { RecipeId } from '../types/recipe'
export interface BrowseState {
  q?: string
  cuisines?: string[]
  meals?: string[]
  tags?: string[]
  difficulty?: string
  time?: number
  calories?: number
  favorites?: boolean
  cooked?: boolean
  mine?: boolean
  sort?: string
}
export const BROWSE_SORTS = [
  'recommended',
  'name-asc',
  'name-desc',
  'rating-desc',
  'rating-asc',
  'time-asc',
  'time-desc',
  'calories-asc',
  'calories-desc',
] as const
export type BrowseSort = (typeof BROWSE_SORTS)[number]

export function catalogFacets(catalog: CatalogRecipe[]) {
  const cuisines = new Set<string>()
  const meals = new Set<string>()
  const tags = new Set<string>()
  for (const { recipe } of catalog) {
    cuisines.add(recipe.cuisine)
    recipe.mealType.forEach((meal) => meals.add(meal))
    recipe.tags.forEach((tag) => tags.add(tag))
  }
  const sorted = (values: Set<string>) =>
    [...values].filter(Boolean).sort((a, b) => a.localeCompare(b))
  return {
    cuisines: sorted(cuisines),
    meals: sorted(meals),
    tags: sorted(tags),
  }
}
export function applyBrowse(
  catalog: CatalogRecipe[],
  state: BrowseState,
  extras: {
    favorites?: Set<RecipeId>
    cooked?: Set<RecipeId>
    scores?: Map<RecipeId, number>
  } = {},
) {
  const q = state.q?.trim().toLowerCase()
  const out = catalog
    .filter(({ id, source, recipe: r }) => {
      const text = [r.name, r.cuisine, ...r.tags, ...r.ingredients]
        .join(' ')
        .toLowerCase()
      return (
        (!q || text.includes(q)) &&
        (!state.cuisines?.length || state.cuisines.includes(r.cuisine)) &&
        (!state.meals?.length ||
          state.meals.some((x) => r.mealType.includes(x))) &&
        (!state.tags?.length || state.tags.some((x) => r.tags.includes(x))) &&
        (!state.difficulty || r.difficulty === state.difficulty) &&
        (!state.time || r.prepTimeMinutes + r.cookTimeMinutes <= state.time) &&
        (!state.calories || r.caloriesPerServing <= state.calories) &&
        (!state.favorites || extras.favorites?.has(id)) &&
        (!state.cooked || extras.cooked?.has(id)) &&
        (!state.mine || source === 'mine')
      )
    })
    .slice()
  const sort = state.sort ?? 'recommended'
  out.sort((a, b) => {
    switch (sort) {
      case 'name':
      case 'name-asc':
        return a.recipe.name.localeCompare(b.recipe.name)
      case 'name-desc':
        return b.recipe.name.localeCompare(a.recipe.name)
      case 'rating':
      case 'rating-desc':
        return b.recipe.rating - a.recipe.rating
      case 'rating-asc':
        return a.recipe.rating - b.recipe.rating
      case 'time':
      case 'time-asc':
        return (
          a.recipe.prepTimeMinutes +
          a.recipe.cookTimeMinutes -
          (b.recipe.prepTimeMinutes + b.recipe.cookTimeMinutes)
        )
      case 'time-desc':
        return (
          b.recipe.prepTimeMinutes +
          b.recipe.cookTimeMinutes -
          (a.recipe.prepTimeMinutes + a.recipe.cookTimeMinutes)
        )
      case 'calories':
      case 'calories-asc':
        return a.recipe.caloriesPerServing - b.recipe.caloriesPerServing
      case 'calories-desc':
        return b.recipe.caloriesPerServing - a.recipe.caloriesPerServing
      default:
        return (
          (extras.scores?.get(b.id) ?? 0) - (extras.scores?.get(a.id) ?? 0) ||
          b.recipe.rating - a.recipe.rating
        )
    }
  })
  return out
}
export const PAGE_SIZE = 12
export const activeFilterCount = (s: BrowseState) =>
  Number(!!s.q?.trim()) +
  Number(!!s.cuisines?.length) +
  Number(!!s.meals?.length) +
  Number(!!s.tags?.length) +
  Number(!!s.difficulty) +
  Number(!!s.time) +
  Number(!!s.calories) +
  Number(!!s.favorites) +
  Number(!!s.cooked) +
  Number(!!s.mine)
