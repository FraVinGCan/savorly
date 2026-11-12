import { useMemo } from 'react'
import { evaluateRecipe, type EvaluationContext } from '../domain/scoring'
import { useRecipes } from './useRecipes'

export function useScoreLookup(ctx: EvaluationContext) {
  const { catalog } = useRecipes()
  return useMemo(() => {
    const evaluations = new Map(
      catalog.map((item) => [item.id, evaluateRecipe(item, ctx)]),
    )
    const scores = new Map(
      [...evaluations].map(([id, evaluation]) => [id, evaluation.score]),
    )
    return {
      scores,
      evaluations,
      get: (id: string) =>
        evaluations.get(id as `api-${number}` | `mine-${string}`),
    }
  }, [catalog, ctx])
}
