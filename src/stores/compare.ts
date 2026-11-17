import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '../lib/storage'
import { isApiId, isMineId, type RecipeId } from '../types/recipe'

export const MAX_COMPARE = 4

export interface CompareState {
  ids: RecipeId[]
  add: (id: RecipeId) => boolean
  remove: (id: RecipeId) => void
  toggle: (id: RecipeId) => boolean
  clear: () => void
}

export interface CompareData {
  ids: RecipeId[]
}

export function validateCompare(value: unknown): CompareData {
  const source = value && typeof value === 'object' ? value : {}
  const ids = (source as { ids?: unknown }).ids
  const clean = Array.isArray(ids)
    ? [
        ...new Set(
          ids.filter(
            (id): id is RecipeId =>
              typeof id === 'string' && (isApiId(id) || isMineId(id)),
          ),
        ),
      ].slice(0, MAX_COMPARE)
    : []
  return { ids: clean }
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set) => ({
      ids: [],
      add: (id) => {
        let added = false
        set((state) => {
          if (state.ids.includes(id) || state.ids.length >= MAX_COMPARE)
            return state
          added = true
          return { ids: [...state.ids, id] }
        })
        return added
      },
      remove: (id) =>
        set((state) => ({ ids: state.ids.filter((entry) => entry !== id) })),
      toggle: (id) => {
        let added = false
        set((state) => {
          if (state.ids.includes(id))
            return { ids: state.ids.filter((entry) => entry !== id) }
          if (state.ids.length >= MAX_COMPARE) return state
          added = true
          return { ids: [...state.ids, id] }
        })
        return added
      },
      clear: () => set({ ids: [] }),
    }),
    {
      name: STORAGE_KEYS.compare,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): CompareData => ({ ids: state.ids }),
      merge: (persisted, current) => ({
        ...current,
        ...validateCompare(persisted),
      }),
    },
  ),
)

export const compareCount = (state: CompareState) => state.ids.length
export const compareIsFull = (state: CompareState) =>
  state.ids.length >= MAX_COMPARE
export const compareHas = (state: CompareState, id: RecipeId) =>
  state.ids.includes(id)
