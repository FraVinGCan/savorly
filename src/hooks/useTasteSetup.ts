import { useMemo } from 'react'
import { pantryTokens } from '../domain/pantry'
import { hasPreferences } from '../domain/taste'
import { useKitchenStore } from '../stores/kitchen'
import { useProfileStore } from '../stores/profile'
import { useRecipes } from './useRecipes'
import type { EvaluationContext } from '../domain/scoring'
import type { RecipeId } from '../types/recipe'

export function useTasteSetup() {
  const profile = useProfileStore((state) => state.profile)
  const items = useKitchenStore((state) => state.pantry)
  const cooked = useKitchenStore((state) => state.cooked)
  const recipes = useRecipes()
  const personalised = hasPreferences(profile)
  const ctx = useMemo<EvaluationContext>(
    () => ({
      profile: personalised ? profile : null,
      pantryTokens: items.length ? pantryTokens(items) : null,
      cookedIds: new Set(Object.keys(cooked) as RecipeId[]),
    }),
    [profile, items, cooked, personalised],
  )
  return {
    ctx,
    personalised,
    catalogSize: recipes.catalog.length,
  }
}
