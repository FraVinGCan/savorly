import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createRecipe, deleteRecipe, updateRecipe } from '../lib/api'
import { STORAGE_KEYS } from '../lib/storage'
import {
  isMineId,
  normalise,
  type Recipe,
  type RecipeId,
  type StoredCreation,
} from '../types/recipe'

export interface CreationWrite {
  synced: boolean
  error?: unknown
}

export interface CreationAddResult extends CreationWrite {
  id: RecipeId
}

export interface CreationsState {
  creations: StoredCreation[]
  addCreation: (input: Partial<Recipe>) => Promise<CreationAddResult>
  updateCreation: (
    id: RecipeId,
    input: Partial<Recipe>,
  ) => Promise<CreationWrite>
  deleteCreation: (id: RecipeId) => Promise<CreationWrite>
  /** Drops the local copy without touching the API — the write-failure fallback. */
  forgetCreation: (id: RecipeId) => void
  reset: () => void
}

export interface CreationsData {
  creations: StoredCreation[]
}

export function validateCreations(value: unknown): CreationsData {
  const source = value && typeof value === 'object' ? value : {}
  const creations = (source as { creations?: unknown }).creations
  if (!Array.isArray(creations)) return { creations: [] }
  const seen = new Set<string>()
  const clean: StoredCreation[] = []
  for (const entry of creations) {
    if (!entry || typeof entry !== 'object') continue
    const { catalogId, recipe } = entry as Partial<StoredCreation>
    if (typeof catalogId !== 'string' || !isMineId(catalogId)) continue
    if (!recipe || typeof recipe !== 'object' || seen.has(catalogId)) continue
    seen.add(catalogId)
    clean.push({ catalogId, recipe: normalise(recipe) })
  }
  return { creations: clean }
}

export const useCreationsStore = create<CreationsState>()(
  persist(
    (set, get) => ({
      creations: [],
      addCreation: async (input) => {
        let echo: Partial<Recipe> = input
        let synced = true
        let error: unknown
        try {
          // DummyJSON echoes the posted fields; normalise fills the rest.
          echo = await createRecipe(input)
        } catch (cause) {
          synced = false
          error = cause
        }
        const catalogId = `mine-${crypto.randomUUID()}` as RecipeId
        const recipe = normalise({ ...input, ...echo })
        set((state) => ({
          creations: [{ catalogId, recipe }, ...state.creations],
        }))
        return { id: catalogId, synced, error }
      },
      updateCreation: async (id, input) => {
        const entry = get().creations.find((item) => item.catalogId === id)
        if (!entry) return { synced: false }
        let echo: Partial<Recipe> = input
        let synced = true
        let error: unknown
        try {
          echo = await updateRecipe(entry.recipe.id, {
            ...entry.recipe,
            ...input,
          })
        } catch (cause) {
          synced = false
          error = cause
        }
        set((state) => ({
          creations: state.creations.map((item) =>
            item.catalogId === id
              ? {
                  ...item,
                  recipe: normalise({
                    ...item.recipe,
                    ...input,
                    ...echo,
                    id: item.recipe.id,
                  }),
                }
              : item,
          ),
        }))
        return { synced, error }
      },
      deleteCreation: async (id) => {
        const entry = get().creations.find((item) => item.catalogId === id)
        let synced = true
        let error: unknown
        if (entry && entry.recipe.id > 0) {
          try {
            await deleteRecipe(entry.recipe.id)
          } catch (cause) {
            // The API stores nothing, so a failed echo still means a local drop.
            synced = false
            error = cause
          }
        }
        set((state) => ({
          creations: state.creations.filter((item) => item.catalogId !== id),
        }))
        return { synced, error }
      },
      forgetCreation: (id) =>
        set((state) => ({
          creations: state.creations.filter((item) => item.catalogId !== id),
        })),
      reset: () => set({ creations: [] }),
    }),
    {
      name: STORAGE_KEYS.creations,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): CreationsData => ({ creations: state.creations }),
      merge: (persisted, current) => ({
        ...current,
        ...validateCreations(persisted),
      }),
    },
  ),
)

export const creationFor = (state: CreationsState, id: RecipeId) =>
  state.creations.find((entry) => entry.catalogId === id)
