import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  DEFAULT_PROFILE,
  hasPreferences,
  sanitizeProfile,
  type AllergenId,
  type DietId,
  type TasteProfile,
} from '../domain/taste'
import { STORAGE_KEYS, isRecord } from '../lib/storage'

export interface ProfileStore {
  profile: TasteProfile
  update: (patch: Partial<TasteProfile>) => void
  toggleDiet: (id: DietId) => void
  toggleAllergen: (id: AllergenId) => void
  toggleCuisine: (value: string) => void
  toggleTag: (value: string) => void
  addAvoidIngredient: (value: string) => void
  removeAvoidIngredient: (value: string) => void
  setGoal: (goal: TasteProfile['goal']) => void
  setSpice: (spice: TasteProfile['spice']) => void
  complete: () => void
  reset: () => void
}

export type ProfileData = { profile: TasteProfile }

export function validateProfileStore(value: unknown): ProfileData {
  return {
    profile: sanitizeProfile(isRecord(value) ? value.profile : undefined),
  }
}

const toggleValue = <T extends string>(values: T[], value: T): T[] =>
  values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value]

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: { ...DEFAULT_PROFILE },
      update: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      toggleDiet: (id) =>
        set((s) => ({
          profile: { ...s.profile, diets: toggleValue(s.profile.diets, id) },
        })),
      toggleAllergen: (id) =>
        set((s) => ({
          profile: {
            ...s.profile,
            allergens: toggleValue(s.profile.allergens, id),
          },
        })),
      toggleCuisine: (value) =>
        set((s) => ({
          profile: {
            ...s.profile,
            favoriteCuisines: toggleValue(s.profile.favoriteCuisines, value),
          },
        })),
      toggleTag: (value) =>
        set((s) => ({
          profile: {
            ...s.profile,
            favoriteTags: toggleValue(s.profile.favoriteTags, value),
          },
        })),
      addAvoidIngredient: (value) =>
        set((s) => ({
          profile: {
            ...s.profile,
            avoidIngredients: [
              ...new Set(
                [
                  ...s.profile.avoidIngredients,
                  value.trim().toLocaleLowerCase(),
                ].filter(Boolean),
              ),
            ],
          },
        })),
      removeAvoidIngredient: (value) =>
        set((s) => ({
          profile: {
            ...s.profile,
            avoidIngredients: s.profile.avoidIngredients.filter(
              (item) => item !== value,
            ),
          },
        })),
      setGoal: (goal) => set((s) => ({ profile: { ...s.profile, goal } })),
      setSpice: (spice) => set((s) => ({ profile: { ...s.profile, spice } })),
      complete: () =>
        set((s) => ({
          profile: { ...s.profile, createdAt: new Date().toISOString() },
        })),
      reset: () => set({ profile: { ...DEFAULT_PROFILE } }),
    }),
    {
      name: STORAGE_KEYS.profile,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): ProfileData => ({ profile: state.profile }),
      merge: (persisted, current) => ({
        ...current,
        ...validateProfileStore(persisted),
      }),
    },
  ),
)

export const isProfileComplete = (profile: TasteProfile) =>
  profile.createdAt !== null
export const isPersonalised = (profile: TasteProfile) => hasPreferences(profile)
