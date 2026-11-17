import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogQueryOptions, tagsQueryOptions } from '../lib/queries'
import { useCreationsStore } from '../stores/creations'
import type { CatalogRecipe, Recipe, RecipeId } from '../types/recipe'

const emptyRecipes: Recipe[] = []

/**
 * The single catalogue merge path: API recipes plus local creations, mine
 * first. Every screen reads this instead of building its own catalog.
 */
export function useRecipes() {
  const { data: catalogData } = useQuery(catalogQueryOptions)
  const { data: tagData = [] } = useQuery(tagsQueryOptions)
  const creations = useCreationsStore((state) => state.creations)
  const apiRecipes = catalogData?.recipes ?? emptyRecipes
  const tags = tagData

  return useMemo(() => {
    const apiCatalog: CatalogRecipe[] = apiRecipes.map((recipe) => ({
      id: `api-${recipe.id}` as RecipeId,
      source: 'api',
      recipe,
    }))
    const creationCatalog: CatalogRecipe[] = creations.map((creation) => ({
      id: creation.catalogId,
      source: 'mine',
      recipe: creation.recipe,
    }))
    const catalog = [...creationCatalog, ...apiCatalog]
    const byId = new Map(catalog.map((item) => [item.id, item]))
    const sortedUnique = (values: string[]) =>
      [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b))
    return {
      catalog,
      apiRecipes,
      byId,
      get: (id: RecipeId) => byId.get(id),
      tags: sortedUnique(tags),
      cuisines: sortedUnique(catalog.map(({ recipe }) => recipe.cuisine)),
      meals: sortedUnique(catalog.flatMap(({ recipe }) => recipe.mealType)),
      creations: creations.map(({ recipe }) => recipe),
    }
  }, [apiRecipes, creations, tags])
}
