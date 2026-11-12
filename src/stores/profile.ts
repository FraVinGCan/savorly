import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  DEFAULT_PROFILE,
  parseProfile,
  type AllergenId,
  type DietId,
  type TasteProfile,
} from '../domain/taste'
interface ProfileStore {
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
export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: { ...DEFAULT_PROFILE },
      update: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      toggleDiet: (id) =>
        set((s) => ({
          profile: {
            ...s.profile,
            diets: s.profile.diets.includes(id)
              ? s.profile.diets.filter((value) => value !== id)
              : [...s.profile.diets, id],
          },
        })),
      toggleAllergen: (id) =>
        set((s) => ({
          profile: {
            ...s.profile,
            allergens: s.profile.allergens.includes(id)
              ? s.profile.allergens.filter((value) => value !== id)
              : [...s.profile.allergens, id],
          },
        })),
      toggleCuisine: (value) =>
        set((s) => ({
          profile: {
            ...s.profile,
            favoriteCuisines: s.profile.favoriteCuisines.includes(value)
              ? s.profile.favoriteCuisines.filter((item) => item !== value)
              : [...s.profile.favoriteCuisines, value],
          },
        })),
      toggleTag: (value) =>
        set((s) => ({
          profile: {
            ...s.profile,
            favoriteTags: s.profile.favoriteTags.includes(value)
              ? s.profile.favoriteTags.filter((item) => item !== value)
              : [...s.profile.favoriteTags, value],
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
      name: 'savorly.profile.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ profile: s.profile }),
      merge: (persisted, current) => {
        const value = persisted as { profile?: unknown }
        return {
          ...current,
          profile: parseProfile(JSON.stringify(value?.profile ?? {})),
        }
      },
    },
  ),
)
