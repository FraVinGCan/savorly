import { useMemo } from 'react'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchRecipes, fetchTags } from '../lib/api'
import { useKitchenStore } from '../stores/kitchen'
import type { CatalogRecipe, Recipe, RecipeId } from '../types/recipe'

const emptyRecipes: Recipe[] = []

export function useRecipes() {
  const { data: catalogData } = useQuery(
    queryOptions({
      queryKey: ['catalog'],
      queryFn: ({ signal }) => fetchRecipes(signal),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    }),
  )
  const { data: tagData = [] } = useQuery(
    queryOptions({
      queryKey: ['tags'],
      queryFn: ({ signal }) => fetchTags(signal),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    }),
  )
  const creations = useKitchenStore((state) => state.creations)
  const apiRecipes = catalogData?.recipes ?? emptyRecipes
  const tags = tagData
  return useMemo(() => {
    const apiCatalog: CatalogRecipe[] = apiRecipes.map((recipe) => ({
      id: `api-${recipe.id}` as RecipeId,
      source: 'api',
      recipe,
    }))
    const catalog: CatalogRecipe[] = [
      ...creations.map((creation) => ({
        id: creation.catalogId,
        source: 'mine' as const,
        recipe: creation.recipe,
      })),
      ...apiCatalog,
    ]
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
