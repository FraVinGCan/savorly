import { useMemo } from 'react'
import { pantryTokens } from '../domain/pantry'
import { hasPreferences } from '../domain/taste'
import { useCookbookStore } from '../stores/cookbook'
import { usePantryStore } from '../stores/pantry'
import { useProfileStore } from '../stores/profile'
import { useRecipes } from './useRecipes'
import type { EvaluationContext } from '../domain/scoring'
import type { RecipeId } from '../types/recipe'

/**
 * One shared personalisation context so every surface explains itself the
 * same way and hard blocks can never disagree.
 */
export function useTasteSetup() {
  const profile = useProfileStore((state) => state.profile)
  const items = usePantryStore((state) => state.items)
  const cooked = useCookbookStore((state) => state.cooked)
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
    recipes,
  }
}
