import { queryOptions } from '@tanstack/react-query'
import { fetchRecipes, fetchTags } from './api'

/**
 * The whole catalogue and tag list load once and never refetch. Every screen
 * reads them from this cache, so filtering, ranking and charts stay instant.
 */
export const catalogQueryOptions = queryOptions({
  queryKey: ['catalog'],
  queryFn: ({ signal }) => fetchRecipes(signal),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
})

export const tagsQueryOptions = queryOptions({
  queryKey: ['tags'],
  queryFn: ({ signal }) => fetchTags(signal),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
})
