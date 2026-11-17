import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  BROWSE_SORTS,
  type BrowseSort,
  type BrowseState,
} from '../domain/browse'

export interface RecipeFilterState extends Omit<
  BrowseState,
  'cuisines' | 'meals' | 'tags'
> {
  cuisines: string[]
  meals: string[]
  tags: string[]
  page: number
}

type ListKey = 'cuisine' | 'meal' | 'tag'

function readList(params: URLSearchParams, key: ListKey) {
  return params.getAll(key)
}

function readSort(value: string | null): BrowseSort {
  return BROWSE_SORTS.includes(value as BrowseSort)
    ? (value as BrowseSort)
    : 'recommended'
}

/**
 * All browse state lives in the URL: filters, sort and page. A filtered view
 * is shareable, bookmarkable and steppable with the back button.
 */
export function useRecipeFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<RecipeFilterState>(
    () => ({
      q: params.get('q') ?? '',
      cuisines: readList(params, 'cuisine'),
      meals: readList(params, 'meal'),
      tags: readList(params, 'tag'),
      difficulty: params.get('difficulty') ?? undefined,
      time: Number(params.get('time')) || undefined,
      calories: Number(params.get('calories')) || undefined,
      favorites: params.has('favorites'),
      cooked: params.has('cooked'),
      mine: params.has('mine'),
      sort: readSort(params.get('sort')),
      page: Math.max(1, Number(params.get('page')) || 1),
    }),
    [params],
  )

  const write = useCallback(
    (
      patch: Partial<
        Record<string, string | number | boolean | string[] | null>
      >,
      options: { replace?: boolean; history?: boolean } = {},
    ) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(patch)) {
        next.delete(key)
        if (Array.isArray(value)) {
          for (const entry of value) if (entry) next.append(key, entry)
        } else if (
          value !== null &&
          value !== undefined &&
          value !== '' &&
          value !== false
        ) {
          next.set(key, String(value))
        }
      }
      // Any filter change drops the page unless the patch sets one explicitly.
      if (!('page' in patch)) next.delete('page')
      setParams(next, {
        replace: options.history ? false : (options.replace ?? true),
      })
    },
    [params, setParams],
  )

  const toggleFacet = useCallback(
    (key: ListKey, value: string) => {
      const next = new URLSearchParams(params)
      const current = next.getAll(key)
      next.delete(key)
      const remaining = current.filter((entry) => entry !== value)
      for (const entry of remaining) next.append(key, entry)
      if (!current.includes(value)) next.append(key, value)
      next.delete('page')
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  return {
    filters,
    /** Applies a patch and replaces the history entry. */
    patch: write,
    /** Pushes a history entry — used by pagination so back steps pages. */
    navigate: (
      patch: Partial<
        Record<string, string | number | boolean | string[] | null>
      >,
    ) => write(patch, { history: true }),
    toggleFacet,
    reset: () => setParams(new URLSearchParams(), { replace: true }),
  }
}
