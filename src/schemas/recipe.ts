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

export type MealType = (typeof MEAL_TYPES)[number]

export const RecipeDraftSchema = z.object({
  name: z.string().trim().min(1, 'Add a recipe name.'),
  cuisine: z.string().trim().min(1, 'Add a cuisine.'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  prepTimeMinutes: z
    .number()
    .min(0, 'Prep time cannot be negative.')
    .max(1440, 'Keep prep time under a day.'),
  cookTimeMinutes: z
    .number()
    .min(0, 'Cook time cannot be negative.')
    .max(1440, 'Keep cook time under a day.'),
  servings: z
    .number()
    .min(1, 'Serve at least one person.')
    .max(100, 'Keep servings to 100 or fewer.'),
  caloriesPerServing: z
    .number()
    .min(0, 'Calories cannot be negative.')
    .max(10000, 'Keep calories to 10,000 or fewer.'),
  image: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^https?:\/\//i.test(value),
      'Use an http(s) image URL, or leave it blank.',
    ),
  ingredients: z
    .array(z.string().trim().min(1, 'Ingredients cannot be blank.'))
    .min(1, 'Add at least one ingredient.'),
  instructions: z
    .array(z.string().trim().min(1, 'Instructions cannot be blank.'))
    .min(1, 'Add at least one instruction.'),
  tagsText: z.string(),
  meals: z.array(z.enum(MEAL_TYPES)).min(1, 'Choose at least one meal type.'),
})

export type RecipeDraft = z.infer<typeof RecipeDraftSchema>
