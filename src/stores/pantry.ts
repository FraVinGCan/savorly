import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { dedupePantry, pantryTokens, type PantryTokens } from '../domain/pantry'
import { normalizeIngredient } from '../domain/ingredients'
import { STORAGE_KEYS } from '../lib/storage'

export interface PantryState {
  items: string[]
  add: (item: string) => void
  remove: (item: string) => void
  toggle: (item: string) => void
  has: (item: string) => boolean
  clear: () => void
}

export interface PantryData {
  items: string[]
}

export function validatePantry(value: unknown): PantryData {
  const source = value && typeof value === 'object' ? value : {}
  const items = (source as { items?: unknown }).items
  return {
    items: Array.isArray(items)
      ? dedupePantry(
          items.filter((item): item is string => typeof item === 'string'),
        )
      : [],
  }
}

export const usePantryStore = create<PantryState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((state) => ({ items: dedupePantry([...state.items, item]) })),
      remove: (item) =>
        set((state) => {
          const key = normalizeIngredient(item)
          return {
            items: state.items.filter(
              (entry) => normalizeIngredient(entry) !== key,
            ),
          }
        }),
      toggle: (item) => {
        const { has, add, remove } = get()
        if (has(item)) remove(item)
        else add(item)
      },
      // Matching is by normalised key so "Eggs" and "eggs" are one staple.
      has: (item) => {
        const key = normalizeIngredient(item)
        return get().items.some((entry) => normalizeIngredient(entry) === key)
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: STORAGE_KEYS.pantry,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PantryData => ({ items: state.items }),
      merge: (persisted, current) => ({
        ...current,
        ...validatePantry(persisted),
      }),
    },
  ),
)

export const pantryTokensFor = (state: PantryState): PantryTokens =>
  pantryTokens(state.items)
