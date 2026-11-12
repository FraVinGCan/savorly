import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { RecipeId, StoredCreation } from '../types/recipe'
import { normalise } from '../types/recipe'
import { dedupePantry } from '../domain/pantry'
import { STORAGE_KEYS } from '../lib/storage'
export interface KitchenState {
  pantry: string[]
  favorites: Record<string, string>
  cooked: Record<
    string,
    { count: number; lastCooked: string | null; history: string[] }
  >
  notes: Record<string, string>
  ratings: Record<string, number>
  compare: RecipeId[]
  creations: StoredCreation[]
  weeks: Record<string, Record<number, RecipeId[]>>
  checked: string[]
  setPantry: (items: string[]) => void
  addPantryItem: (item: string) => void
  removePantryItem: (item: string) => void
  hasPantryItem: (item: string) => boolean
  toggleFavorite: (id: RecipeId) => void
  logCook: (id: RecipeId) => void
  setNote: (id: RecipeId, note: string) => void
  rate: (id: RecipeId, value: number) => void
  toggleCompare: (id: RecipeId) => void
  clearCompare: () => void
  assign: (week: string, day: number, id: RecipeId) => void
  unassign: (week: string, day: number, id: RecipeId) => void
  clearWeek: (week: string) => void
  toggleCheck: (key: string) => void
  clearChecked: () => void
  addCreation: (recipe: Partial<ReturnType<typeof normalise>>) => RecipeId
  updateCreation: (
    id: RecipeId,
    recipe: Partial<ReturnType<typeof normalise>>,
  ) => void
  removeCreation: (id: RecipeId) => void
  forget: (id: RecipeId) => void
  reset: () => void
}
type PersistedKitchen = Pick<
  KitchenState,
  | 'pantry'
  | 'favorites'
  | 'cooked'
  | 'notes'
  | 'ratings'
  | 'compare'
  | 'creations'
  | 'weeks'
  | 'checked'
>
const kitchenStorage = {
  getItem: () => {
    const read = (key: string) => {
      try {
        const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          !('state' in value)
        )
          return {}
        const state = (value as { state?: unknown }).state
        return state && typeof state === 'object' && !Array.isArray(state)
          ? (state as Record<string, unknown>)
          : {}
      } catch {
        return {}
      }
    }
    const cookbook = read(STORAGE_KEYS.cookbook)
    const pantry = read(STORAGE_KEYS.pantry)
    const creations = read(STORAGE_KEYS.creations)
    const compare = read(STORAGE_KEYS.compare)
    const planner = read(STORAGE_KEYS.planner)
    const state: Partial<PersistedKitchen> = {
      ...cookbook,
      pantry: Array.isArray(pantry.pantry) ? pantry.pantry : [],
      creations: Array.isArray(creations.creations)
        ? creations.creations
            .filter((entry: unknown): entry is StoredCreation => {
              if (!entry || typeof entry !== 'object') return false
              const value = entry as Record<string, unknown>
              return (
                typeof value.catalogId === 'string' &&
                !!value.recipe &&
                typeof value.recipe === 'object'
              )
            })
            .map((entry: StoredCreation) => ({
              ...entry,
              recipe: normalise(entry.recipe),
            }))
        : [],
      compare: Array.isArray(compare.compare) ? compare.compare : [],
      weeks:
        planner.weeks && typeof planner.weeks === 'object'
          ? (planner.weeks as PersistedKitchen['weeks'])
          : {},
      checked: Array.isArray(planner.checked) ? planner.checked : [],
    }
    return JSON.stringify({ state })
  },
  setItem: (_name: string, value: string) => {
    const state = (JSON.parse(value) as { state: PersistedKitchen }).state
    localStorage.setItem(
      STORAGE_KEYS.cookbook,
      JSON.stringify({
        state: {
          favorites: state.favorites,
          cooked: state.cooked,
          notes: state.notes,
          ratings: state.ratings,
        },
        version: 1,
      }),
    )
    localStorage.setItem(
      STORAGE_KEYS.pantry,
      JSON.stringify({ state: { pantry: state.pantry }, version: 1 }),
    )
    localStorage.setItem(
      STORAGE_KEYS.planner,
      JSON.stringify({
        state: { weeks: state.weeks, checked: state.checked },
        version: 1,
      }),
    )
    localStorage.setItem(
      STORAGE_KEYS.creations,
      JSON.stringify({ state: { creations: state.creations }, version: 1 }),
    )
    localStorage.setItem(
      STORAGE_KEYS.compare,
      JSON.stringify({ state: { compare: state.compare }, version: 1 }),
    )
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name)
    for (const key of [
      STORAGE_KEYS.cookbook,
      STORAGE_KEYS.pantry,
      STORAGE_KEYS.planner,
      STORAGE_KEYS.creations,
      STORAGE_KEYS.compare,
    ])
      localStorage.removeItem(key)
  },
}
export const useKitchenStore = create<KitchenState>()(
  persist(
    (set, get) => ({
      pantry: [],
      favorites: {},
      cooked: {},
      notes: {},
      ratings: {},
      compare: [],
      creations: [],
      weeks: {},
      checked: [],
      setPantry: (items) => set({ pantry: dedupePantry(items) }),
      addPantryItem: (item) =>
        set((s) => ({ pantry: dedupePantry([...s.pantry, item]) })),
      removePantryItem: (item) =>
        set((s) => ({ pantry: s.pantry.filter((value) => value !== item) })),
      hasPantryItem: (item) =>
        get().pantry.some((value) => dedupePantry([value, item]).length === 1),
      toggleFavorite: (id) =>
        set((s) => {
          const favorites = { ...s.favorites }
          if (favorites[id]) delete favorites[id]
          else favorites[id] = new Date().toISOString()
          return { favorites }
        }),
      logCook: (id) =>
        set((s) => {
          const old = s.cooked[id] ?? {
            count: 0,
            lastCooked: null,
            history: [],
          }
          const now = new Date().toISOString()
          return {
            cooked: {
              ...s.cooked,
              [id]: {
                count: old.count + 1,
                lastCooked: now,
                history: [now, ...old.history],
              },
            },
          }
        }),
      setNote: (id, note) =>
        set((s) => {
          const notes = { ...s.notes }
          if (note.trim()) notes[id] = note
          else delete notes[id]
          return { notes }
        }),
      rate: (id, value) =>
        set((s) => ({
          ratings: {
            ...s.ratings,
            [id]: Math.min(5, Math.max(1, Math.round(value))),
          },
        })),
      toggleCompare: (id) =>
        set((s) => ({
          compare: s.compare.includes(id)
            ? s.compare.filter((v) => v !== id)
            : s.compare.length < 4
              ? [...s.compare, id]
              : s.compare,
        })),
      clearCompare: () => set({ compare: [] }),
      assign: (week, day, id) =>
        set((s) => ({
          weeks: { ...s.weeks, [week]: { ...s.weeks[week], [day]: [id] } },
        })),
      unassign: (week, day, id) =>
        set((s) => ({
          weeks: {
            ...s.weeks,
            [week]: {
              ...s.weeks[week],
              [day]: (s.weeks[week]?.[day] ?? []).filter(
                (recipeId) => recipeId !== id,
              ),
            },
          },
        })),
      clearWeek: (week) =>
        set((s) => {
          const weeks = { ...s.weeks }
          delete weeks[week]
          return {
            weeks,
            checked: s.checked.filter((key) => !key.startsWith(`${week}::`)),
          }
        }),
      toggleCheck: (key) =>
        set((s) => ({
          checked: s.checked.includes(key)
            ? s.checked.filter((item) => item !== key)
            : [...s.checked, key],
        })),
      clearChecked: () => set({ checked: [] }),
      addCreation: (input) => {
        const recipe = normalise(input)
        const id = `mine-${crypto.randomUUID()}` as RecipeId
        set((s) => ({ creations: [{ catalogId: id, recipe }, ...s.creations] }))
        return id
      },
      updateCreation: (id, input) =>
        set((s) => ({
          creations: s.creations.map((entry) =>
            entry.catalogId === id
              ? { ...entry, recipe: normalise({ ...entry.recipe, ...input }) }
              : entry,
          ),
        })),
      removeCreation: (id) =>
        set((s) => ({
          creations: s.creations.filter((x) => x.catalogId !== id),
        })),
      forget: (id) =>
        set((s) => {
          const favorites = { ...s.favorites }
          const cooked = { ...s.cooked }
          const notes = { ...s.notes }
          const ratings = { ...s.ratings }
          delete favorites[id]
          delete cooked[id]
          delete notes[id]
          delete ratings[id]
          return { favorites, cooked, notes, ratings }
        }),
      reset: () =>
        set({
          pantry: [],
          favorites: {},
          cooked: {},
          notes: {},
          ratings: {},
          compare: [],
          creations: [],
          weeks: {},
          checked: [],
        }),
    }),
    {
      name: 'foodwiki.kitchen.v1',
      storage: createJSONStorage(() => kitchenStorage),
    },
  ),
)

export const favoriteIds = (state: KitchenState) =>
  new Set(Object.keys(state.favorites) as RecipeId[])
export const cookedIds = (state: KitchenState) =>
  new Set(Object.keys(state.cooked) as RecipeId[])
export const cookDates = (state: KitchenState) =>
  Object.values(state.cooked)
    .flatMap((entry) => entry.history)
    .sort((a, b) => b.localeCompare(a))
export const isFavorite = (state: KitchenState, id: RecipeId) =>
  !!state.favorites[id]
export const noteFor = (state: KitchenState, id: RecipeId) =>
  state.notes[id] ?? ''
export const ratingFor = (state: KitchenState, id: RecipeId) =>
  state.ratings[id] ?? null
export const cookEntry = (state: KitchenState, id: RecipeId) =>
  state.cooked[id] ?? { count: 0, lastCooked: null, history: [] }
