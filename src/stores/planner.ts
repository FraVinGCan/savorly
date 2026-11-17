import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { STORAGE_KEYS, isRecord } from '../lib/storage'
import { isApiId, isMineId, type RecipeId } from '../types/recipe'

export const WEEK_LENGTH = 7

export interface PlannerState {
  weeks: Record<string, Record<string, RecipeId[]>>
  checked: string[]
  /** Cross-tab merges ignore a payload older than the local plan. */
  savedAt: number
  assign: (week: string, day: number, id: RecipeId) => void
  unassign: (week: string, day: number, id: RecipeId) => void
  clearWeek: (week: string) => void
  clearChecked: (week?: string) => void
  toggleCheck: (key: string) => void
  reset: () => void
}

export interface PlannerData {
  weeks: Record<string, Record<string, RecipeId[]>>
  checked: string[]
  savedAt: number
}

const isRecipeId = (value: string) => isApiId(value) || isMineId(value)
const DAYS = new Set(['0', '1', '2', '3', '4', '5', '6'])

export function validatePlanner(value: unknown): PlannerData {
  const source = isRecord(value) ? value : {}
  const weeks: Record<string, Record<string, RecipeId[]>> = {}
  if (isRecord(source.weeks))
    for (const [week, days] of Object.entries(source.weeks)) {
      if (!isRecord(days)) continue
      const clean: Record<string, RecipeId[]> = {}
      for (const [day, ids] of Object.entries(days)) {
        if (!DAYS.has(day) || !Array.isArray(ids)) continue
        const unique = [
          ...new Set(
            ids.filter(
              (id): id is RecipeId => typeof id === 'string' && isRecipeId(id),
            ),
          ),
        ]
        if (unique.length) clean[day] = unique
      }
      if (Object.keys(clean).length) weeks[week] = clean
    }
  const checked = Array.isArray(source.checked)
    ? [
        ...new Set(
          source.checked.filter(
            (key): key is string =>
              typeof key === 'string' && /^\d{4}-\d{2}-\d{2}::.+/.test(key),
          ),
        ),
      ]
    : []
  return {
    weeks,
    checked,
    savedAt: Number.isFinite(source.savedAt) ? Number(source.savedAt) : 0,
  }
}

const withSavedAt = (
  state: Pick<PlannerData, 'weeks' | 'checked'>,
): PlannerData => ({ ...state, savedAt: Date.now() })

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set) => ({
      weeks: {},
      checked: [],
      savedAt: 0,
      assign: (week, day, id) =>
        set((state) => {
          const current = state.weeks[week]?.[String(day)] ?? []
          if (current.includes(id)) return state
          const days = {
            ...state.weeks[week],
            [String(day)]: [...current, id],
          }
          return withSavedAt({
            weeks: { ...state.weeks, [week]: days },
            checked: state.checked,
          })
        }),
      unassign: (week, day, id) =>
        set((state) => {
          const current = state.weeks[week]?.[String(day)] ?? []
          const next = current.filter((entry) => entry !== id)
          const days = { ...state.weeks[week], [String(day)]: next }
          if (!next.length) delete days[String(day)]
          const weeks = { ...state.weeks }
          if (Object.keys(days).length) weeks[week] = days
          else delete weeks[week]
          return withSavedAt({ weeks, checked: state.checked })
        }),
      clearWeek: (week) =>
        set((state) => {
          const weeks = { ...state.weeks }
          delete weeks[week]
          return withSavedAt({
            weeks,
            checked: state.checked.filter(
              (key) => !key.startsWith(`${week}::`),
            ),
          })
        }),
      clearChecked: (week) =>
        set((state) =>
          withSavedAt({
            weeks: state.weeks,
            checked: week
              ? state.checked.filter((key) => !key.startsWith(`${week}::`))
              : [],
          }),
        ),
      toggleCheck: (key) =>
        set((state) =>
          withSavedAt({
            weeks: state.weeks,
            checked: state.checked.includes(key)
              ? state.checked.filter((item) => item !== key)
              : [...state.checked, key],
          }),
        ),
      reset: () => set(withSavedAt({ weeks: {}, checked: [] })),
    }),
    {
      name: STORAGE_KEYS.planner,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PlannerData => ({
        weeks: state.weeks,
        checked: state.checked,
        savedAt: state.savedAt,
      }),
      // Plans merge rather than replace: a storage event from a tab that has
      // not seen our latest edit must not resurrect deleted slots.
      merge: (persisted, current) => {
        const next = validatePlanner(persisted)
        return next.savedAt >= current.savedAt
          ? { ...current, ...next }
          : current
      },
    },
  ),
)

export const checkKey = (week: string, ingredientKey: string) =>
  `${week}::${ingredientKey}`

export function recipesFor(
  state: PlannerState,
  week: string,
  day: number,
): RecipeId[] {
  return state.weeks[week]?.[String(day)] ?? []
}

/** Monday → Sunday slots for a week. */
export function slotsFor(state: PlannerState, week: string): RecipeId[][] {
  return Array.from({ length: WEEK_LENGTH }, (_, day) =>
    recipesFor(state, week, day),
  )
}

export const countFor = (state: PlannerState, week: string) =>
  slotsFor(state, week).reduce((sum, day) => sum + day.length, 0)

export const isChecked = (
  state: PlannerState,
  week: string,
  ingredientKey: string,
) => state.checked.includes(checkKey(week, ingredientKey))

export const checkedCountFor = (state: PlannerState, week: string) =>
  state.checked.filter((key) => key.startsWith(`${week}::`)).length
