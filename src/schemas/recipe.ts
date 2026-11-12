import { z } from 'zod'

export const MEAL_TYPES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Appetizer',
  'Dessert',
  'Beverage',
] as const
export const RecipeDraftSchema = z.object({
  name: z.string().trim().min(1, 'Add a recipe name.'),
  cuisine: z.string().trim().min(1, 'Add a cuisine.'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  prepTimeMinutes: z.number().min(0),
  cookTimeMinutes: z.number().min(0),
  servings: z.number().min(1),
  caloriesPerServing: z.number().min(0),
  image: z.string(),
  ingredients: z
    .array(z.string().trim().min(1))
    .min(1, 'Add at least one ingredient.'),
  instructions: z
    .array(z.string().trim().min(1))
    .min(1, 'Add at least one instruction.'),
  tagsText: z.string(),
  mealsText: z.string().refine(
    (value) =>
      value
        .split(',')
        .map((meal) => meal.trim())
        .filter(Boolean)
        .every((meal) =>
          MEAL_TYPES.includes(meal as (typeof MEAL_TYPES)[number]),
        ),
    'Choose meal types from the supported list.',
  ),
})
export type RecipeDraft = z.infer<typeof RecipeDraftSchema>
