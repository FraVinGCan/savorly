import axios from 'axios'
import type { Author, Recipe, RecipeListResponse } from '../types/recipe'
import { normalise } from '../types/recipe'
export const api = axios.create({
  baseURL: 'https://dummyjson.com',
  timeout: 15000,
  headers: { Accept: 'application/json' },
})
export function apiError(error: unknown) {
  if (axios.isCancel(error)) return 'The request was cancelled.'
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'The request took too long.'
    if (error.response)
      return `The service returned an error (${error.response.status}).`
    return 'Could not reach the recipe service.'
  }
  return 'Something went wrong while loading recipes.'
}
export async function fetchRecipes(signal?: AbortSignal) {
  const { data } = await api.get<RecipeListResponse>('/recipes?limit=0', {
    signal,
  })
  return { ...data, recipes: data.recipes.map(normalise) }
}
export async function fetchTags(signal?: AbortSignal) {
  const { data } = await api.get<string[]>('/recipes/tags', { signal })
  return data
}
export async function fetchAuthor(id: number, signal?: AbortSignal) {
  const { data } = await api.get<Author>(`/users/${id}`, { signal })
  return data
}
export async function fetchRecipe(id: number, signal?: AbortSignal) {
  const { data } = await api.get<Recipe>(`/recipes/${id}`, { signal })
  return normalise(data)
}
export async function fetchRecipesByTag(tag: string, signal?: AbortSignal) {
  const { data } = await api.get<RecipeListResponse>(
    `/recipes/tag/${encodeURIComponent(tag)}`,
    { signal },
  )
  return { ...data, recipes: data.recipes.map(normalise) }
}
export async function searchRecipes(query: string, signal?: AbortSignal) {
  const { data } = await api.get<RecipeListResponse>('/recipes/search', {
    params: { q: query },
    signal,
  })
  return { ...data, recipes: data.recipes.map(normalise) }
}
export async function createRecipe(input: Partial<Recipe>) {
  const { data } = await api.post<Recipe>('/recipes/add', input)
  return normalise(data)
}
export async function updateRecipe(id: number, input: Partial<Recipe>) {
  const { data } = await api.put<Recipe>(`/recipes/${id}`, input)
  return normalise(data)
}
export async function deleteRecipe(id: number) {
  const { data } = await api.delete<{ id: number; isDeleted: boolean }>(
    `/recipes/${id}`,
  )
  return data
}
export type RecipeApi = Recipe
