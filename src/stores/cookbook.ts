import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { STORAGE_KEYS, isRecord } from '../lib/storage'
import { isApiId, isMineId, type RecipeId } from '../types/recipe'

export interface CookEntry {
  count: number
  lastCooked: string | null
  history: string[]
}

export interface CookbookState {
  favorites: Record<string, string>
  notes: Record<string, string>
  ratings: Record<string, number>
  cooked: Record<string, CookEntry>
  toggleFavorite: (id: RecipeId) => void
  setNote: (id: RecipeId, note: string) => void
  rate: (id: RecipeId, value: number) => void
  logCook: (id: RecipeId) => void
  forget: (id: RecipeId) => void
  reset: () => void
}

export type CookbookData = Pick<
  CookbookState,
  'favorites' | 'notes' | 'ratings' | 'cooked'
>

const isRecipeId = (value: string) => isApiId(value) || isMineId(value)

const validIso = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))

export const EMPTY_COOK_ENTRY: CookEntry = {
  count: 0,
  lastCooked: null,
  history: [],
}

/** A corrupt or partial payload degrades to an empty cookbook, never a crash. */
export function validateCookbook(value: unknown): CookbookData {
  const source = isRecord(value) ? value : {}
  const favorites: Record<string, string> = {}
  if (isRecord(source.favorites))
    for (const [id, at] of Object.entries(source.favorites))
      if (isRecipeId(id) && validIso(at)) favorites[id] = at

  const notes: Record<string, string> = {}
  if (isRecord(source.notes))
    for (const [id, note] of Object.entries(source.notes))
      if (isRecipeId(id) && typeof note === 'string' && note.trim())
        notes[id] = note

  const ratings: Record<string, number> = {}
  if (isRecord(source.ratings))
    for (const [id, rating] of Object.entries(source.ratings)) {
      const parsed = Math.round(Number(rating))
      if (
        isRecipeId(id) &&
        Number.isFinite(parsed) &&
        parsed >= 1 &&
        parsed <= 5
      )
        ratings[id] = parsed
    }

  const cooked: Record<string, CookEntry> = {}
  if (isRecord(source.cooked))
    for (const [id, entry] of Object.entries(source.cooked)) {
      if (!isRecipeId(id) || !isRecord(entry)) continue
      const count = Math.max(0, Math.round(Number(entry.count) || 0))
      const history = Array.isArray(entry.history)
        ? entry.history.filter(validIso).sort((a, b) => b.localeCompare(a))
        : []
      const lastCooked = validIso(entry.lastCooked)
        ? entry.lastCooked
        : (history[0] ?? null)
      if (count || history.length) cooked[id] = { count, lastCooked, history }
    }

  return { favorites, notes, ratings, cooked }
}

export const useCookbookStore = create<CookbookState>()(
  persist(
    (set) => ({
      favorites: {},
      notes: {},
      ratings: {},
      cooked: {},
      toggleFavorite: (id) =>
        set((state) => {
          const favorites = { ...state.favorites }
          if (favorites[id]) delete favorites[id]
          else favorites[id] = new Date().toISOString()
          return { favorites }
        }),
      setNote: (id, note) =>
        set((state) => {
          const notes = { ...state.notes }
          if (note.trim()) notes[id] = note
          else delete notes[id]
          return { notes }
        }),
      rate: (id, value) =>
        set((state) => {
          const ratings = { ...state.ratings }
          const clamped = Math.min(5, Math.max(1, Math.round(value)))
          ratings[id] = clamped
          return { ratings }
        }),
      logCook: (id) =>
        set((state) => {
          const previous = state.cooked[id] ?? EMPTY_COOK_ENTRY
          const now = new Date().toISOString()
          return {
            cooked: {
              ...state.cooked,
              [id]: {
                count: previous.count + 1,
                lastCooked: now,
                history: [now, ...previous.history],
              },
            },
          }
        }),
      forget: (id) =>
        set((state) => {
          const favorites = { ...state.favorites }
          const notes = { ...state.notes }
          const ratings = { ...state.ratings }
          const cooked = { ...state.cooked }
          delete favorites[id]
          delete notes[id]
          delete ratings[id]
          delete cooked[id]
          return { favorites, notes, ratings, cooked }
        }),
      reset: () => set({ favorites: {}, notes: {}, ratings: {}, cooked: {} }),
    }),
    {
      name: STORAGE_KEYS.cookbook,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): CookbookData => ({
        favorites: state.favorites,
        notes: state.notes,
        ratings: state.ratings,
        cooked: state.cooked,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...validateCookbook(persisted),
      }),
    },
  ),
)

export const favoriteIds = (state: CookbookState): Set<RecipeId> =>
  new Set(Object.keys(state.favorites) as RecipeId[])
export const cookedIds = (state: CookbookState): Set<RecipeId> =>
  new Set(Object.keys(state.cooked) as RecipeId[])
/** Every logged cook, newest first, across all recipes. */
export const cookDates = (state: CookbookState): string[] =>
  Object.values(state.cooked)
    .flatMap((entry) => entry.history)
    .sort((a, b) => b.localeCompare(a))
export const isFavorite = (state: CookbookState, id: RecipeId) =>
  Boolean(state.favorites[id])
export const noteFor = (state: CookbookState, id: RecipeId) =>
  state.notes[id] ?? ''
export const ratingFor = (state: CookbookState, id: RecipeId) =>
  state.ratings[id] ?? null
export const cookEntry = (state: CookbookState, id: RecipeId): CookEntry =>
  state.cooked[id] ?? EMPTY_COOK_ENTRY
export const totalCooks = (state: CookbookState) =>
  Object.values(state.cooked).reduce((sum, entry) => sum + entry.count, 0)
