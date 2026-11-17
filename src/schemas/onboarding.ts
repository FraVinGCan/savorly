import { z } from 'zod'
import { ALLERGENS, DIETS } from '../domain/taste'

export const GOAL_VALUES = ['balanced', 'light', 'comfort', 'quick'] as const
export const SPICE_VALUES = ['none', 'mild', 'medium', 'hot'] as const

export const HelloStepSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Add a name so the greeting feels like yours.')
    .max(80, 'Keep your name under 80 characters.'),
})

export const DietsStepSchema = z.object({
  diets: z.array(z.enum(DIETS)),
})

export const AllergiesStepSchema = z.object({
  allergens: z.array(z.enum(ALLERGENS)),
  avoidIngredients: z
    .array(z.string().trim().min(1, 'Ingredients cannot be blank.'))
    .max(50, 'Keep the avoid list to 50 ingredients or fewer.'),
})

export const TasteStepSchema = z.object({
  goal: z.enum(GOAL_VALUES),
  spice: z.enum(SPICE_VALUES),
})

export const LimitsStepSchema = z.object({
  maxTotalMinutes: z
    .number()
    .int()
    .min(0, 'Time cannot be negative.')
    .max(1440, 'A day is the limit.'),
  maxCalories: z
    .number()
    .int()
    .min(0, 'Calories cannot be negative.')
    .max(5000, 'Keep calories to 5000 or fewer.'),
})

export const OnboardingSchema = z.object({
  ...HelloStepSchema.shape,
  ...DietsStepSchema.shape,
  ...AllergiesStepSchema.shape,
  ...TasteStepSchema.shape,
  ...LimitsStepSchema.shape,
})

export type OnboardingDraft = z.infer<typeof OnboardingSchema>

export const STEP_SCHEMAS = [
  HelloStepSchema,
  DietsStepSchema,
  AllergiesStepSchema,
  TasteStepSchema,
  LimitsStepSchema,
] as const

export const STEP_LABELS = [
  'Hello',
  'Diets',
  'Allergies',
  'Taste',
  'Limits',
] as const
