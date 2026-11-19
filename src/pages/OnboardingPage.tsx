import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react'
import {
  DIETS,
  ALLERGEN_META,
  DEFAULT_PROFILE,
  profileConflicts,
  type AllergenId,
  type TasteProfile,
} from '../domain/taste'
import {
  STEP_LABELS,
  STEP_SCHEMAS,
  type OnboardingDraft,
} from '../schemas/onboarding'
import { useProfileStore } from '../stores/profile'
import { toast } from '../stores/toast'
import { useRecipes } from '../hooks/useRecipes'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageLayout } from '../components/app-shared'
import {
  Badge,
  ButtonLink,
  Chip,
  ConfirmDialog,
  SectionHeading,
} from '../components/primitives'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Checkbox, ProgressBar } from '../components/ui/controls'
import { GOAL_LABELS, SPICE_LABELS } from '../lib/format'

const STEP_COPY = [
  {
    eyebrow: 'STEP 1 · HELLO',
    title: 'Let’s make this yours.',
    sub: 'A name for the greeting. Nothing is sent anywhere.',
  },
  {
    eyebrow: 'STEP 2 · DIETS',
    title: 'How do you eat?',
    sub: 'Pick every way of eating that matters. Savorly filters with the same engine everywhere.',
  },
  {
    eyebrow: 'STEP 3 · ALLERGIES',
    title: 'What should stay off your plate?',
    sub: 'Allergen detection is keyword-based — honest matching, never a medical guarantee.',
  },
  {
    eyebrow: 'STEP 4 · TASTE',
    title: 'What feels right?',
    sub: 'Cooking style and heat tolerance shape the ranking, not the filter.',
  },
  {
    eyebrow: 'STEP 5 · LIMITS',
    title: 'How much time and energy?',
    sub: 'Set a ceiling, or leave it at Any. You can tune everything later in your profile.',
  },
] as const

const defaultDraft = (profile: TasteProfile): OnboardingDraft => ({
  displayName: profile.displayName,
  diets: profile.diets,
  allergens: profile.allergens,
  avoidIngredients: profile.avoidIngredients,
  goal: profile.goal,
  spice: profile.spice,
  maxTotalMinutes: profile.maxTotalMinutes ?? 0,
  maxCalories: profile.maxCalories ?? 0,
})

const normaliseDraft = (values: OnboardingDraft) => ({
  ...values,
  displayName: values.displayName.trim(),
  avoidIngredients: [
    ...new Set(
      values.avoidIngredients
        .map((item) => item.trim().toLocaleLowerCase())
        .filter(Boolean),
    ),
  ],
  maxTotalMinutes: values.maxTotalMinutes || null,
  maxCalories: values.maxCalories || null,
})

export default function Onboarding() {
  useDocumentTitle('Your taste')
  const navigate = useNavigate()
  const { catalog } = useRecipes()
  const profile = useProfileStore((state) => state.profile)
  const update = useProfileStore((state) => state.update)
  const complete = useProfileStore((state) => state.complete)
  const resetProfile = useProfileStore((state) => state.reset)
  const [step, setStep] = useState(0)
  const [avoidInput, setAvoidInput] = useState('')
  const [startOver, setStartOver] = useState(false)

  const {
    register,
    control,
    setValue,
    getValues,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<OnboardingDraft>({
    defaultValues: defaultDraft(profile),
    mode: 'onChange',
  })

  // Accumulate into the profile store as the user types so the live
  // eligibility count reflects the draft, not the last saved step.
  const values = useWatch({ control })
  useEffect(() => {
    const draft = normaliseDraft({
      ...defaultDraft(profile),
      ...values,
    } as OnboardingDraft)
    // Stop the store update from feeding back into this effect.
    if (JSON.stringify({ ...profile, ...draft }) === JSON.stringify(profile))
      return
    update(draft)
  }, [values, update, profile])

  const draftProfile = useMemo<TasteProfile>(
    () => ({
      ...profile,
      ...normaliseDraft({ ...defaultDraft(profile), ...values }),
      createdAt: profile.createdAt ?? new Date().toISOString(),
    }),
    [profile, values],
  )
  const eligible = useMemo(
    () =>
      catalog.filter(
        (item) => profileConflicts(item.recipe, draftProfile).length === 0,
      ).length,
    [catalog, draftProfile],
  )

  const copy = STEP_COPY[step]!
  const isLast = step === STEP_LABELS.length - 1
  const currentValues = getValues()

  const next = () => {
    const schema = STEP_SCHEMAS[step]!
    const result = schema.safeParse(getValues())
    if (!result.success) {
      clearErrors()
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') as keyof OnboardingDraft
        setError(field, { type: 'validation', message: issue.message })
      }
      return
    }
    clearErrors()
    if (isLast) {
      const final = normaliseDraft(getValues())
      update(final)
      complete()
      toast.success(
        'Your taste is set',
        `${eligible} of ${catalog.length} recipes fit your profile right now.`,
      )
      navigate('/foryou')
      return
    }
    setStep((current) => current + 1)
  }

  const addAvoid = () => {
    const entry = avoidInput.trim().toLocaleLowerCase()
    if (!entry) return
    const current = getValues('avoidIngredients')
    if (current.includes(entry)) {
      toast.info('Already on your avoid list', entry)
      setAvoidInput('')
      return
    }
    setValue('avoidIngredients', [...current, entry], {
      shouldDirty: true,
      shouldValidate: true,
    })
    setAvoidInput('')
  }

  const stepFields = [
    <label key="name" className="flex flex-col gap-2 text-xs font-semibold">
      What should we call you?
      <Input
        {...register('displayName')}
        placeholder="Your name"
        autoFocus
        aria-invalid={Boolean(errors.displayName)}
        aria-describedby={errors.displayName ? 'name-error' : undefined}
      />
      {errors.displayName && (
        <span id="name-error" role="alert" className="text-xs text-destructive">
          {errors.displayName.message}
        </span>
      )}
    </label>,

    <div key="diets" className="space-y-2">
      {DIETS.map((diet) => (
        <label
          key={diet}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5 text-sm hover:bg-muted">
          <Checkbox
            checked={values.diets?.includes(diet) ?? false}
            onCheckedChange={() => {
              const current = getValues('diets')
              setValue(
                'diets',
                current.includes(diet)
                  ? current.filter((entry) => entry !== diet)
                  : [...current, diet],
                { shouldDirty: true, shouldValidate: true },
              )
            }}
            label={diet}
          />
          <span className="capitalize">{diet}</span>
        </label>
      ))}
    </div>,

    <div key="allergies" className="space-y-5">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Allergies and sensitivities
        </h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ALLERGEN_META) as AllergenId[]).map((allergen) => (
            <Chip
              key={allergen}
              active={values.allergens?.includes(allergen) ?? false}
              onClick={() => {
                const current = getValues('allergens')
                setValue(
                  'allergens',
                  current.includes(allergen)
                    ? current.filter((entry) => entry !== allergen)
                    : [...current, allergen],
                  { shouldDirty: true, shouldValidate: true },
                )
              }}>
              <span aria-hidden="true">{ALLERGEN_META[allergen].glyph}</span>
              {ALLERGEN_META[allergen].label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ingredients to never show
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={avoidInput}
            onChange={(event) => setAvoidInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addAvoid()
              }
            }}
            placeholder="e.g. mushrooms"
            aria-label="Ingredient to avoid"
          />
          <Button type="button" variant="outline" onClick={addAvoid}>
            Add
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(values.avoidIngredients ?? []).map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background py-1 pl-3 pr-1 text-xs">
              {item}
              <button
                type="button"
                aria-label={`Remove ${item} from avoid list`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() =>
                  setValue(
                    'avoidIngredients',
                    getValues('avoidIngredients').filter(
                      (entry) => entry !== item,
                    ),
                    { shouldDirty: true, shouldValidate: true },
                  )
                }>
                ×
              </button>
            </span>
          ))}
          {!(values.avoidIngredients ?? []).length && (
            <span className="text-xs text-muted-foreground">
              Nothing on the avoid list.
            </span>
          )}
        </div>
      </div>
    </div>,

    <div key="taste" className="space-y-5">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cooking style
        </h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(GOAL_LABELS) as TasteProfile['goal'][]).map((goal) => (
            <Chip
              key={goal}
              active={currentValues.goal === goal}
              onClick={() =>
                setValue('goal', goal, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }>
              {GOAL_LABELS[goal]}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Heat tolerance
        </h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SPICE_LABELS) as TasteProfile['spice'][]).map(
            (spice) => (
              <Chip
                key={spice}
                active={currentValues.spice === spice}
                onClick={() =>
                  setValue('spice', spice, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }>
                {SPICE_LABELS[spice]}
              </Chip>
            ),
          )}
        </div>
      </div>
    </div>,

    <div key="limits" className="space-y-5">
      <label className="block text-xs font-semibold">
        Maximum total time
        <input
          type="range"
          min={0}
          max={120}
          step={5}
          value={currentValues.maxTotalMinutes}
          onChange={(event) =>
            setValue('maxTotalMinutes', Number(event.target.value), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          className="mt-2 w-full accent-primary"
          aria-label="Maximum total cooking time in minutes, zero means any"
        />
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          {currentValues.maxTotalMinutes
            ? `${currentValues.maxTotalMinutes} minutes`
            : 'Any length'}
        </span>
        {errors.maxTotalMinutes && (
          <span role="alert" className="text-xs text-destructive">
            {errors.maxTotalMinutes.message}
          </span>
        )}
      </label>
      <label className="block text-xs font-semibold">
        Maximum calories per serving
        <input
          type="range"
          min={0}
          max={1000}
          step={25}
          value={currentValues.maxCalories}
          onChange={(event) =>
            setValue('maxCalories', Number(event.target.value), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          className="mt-2 w-full accent-primary"
          aria-label="Maximum calories per serving, zero means any"
        />
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          {currentValues.maxCalories
            ? `${currentValues.maxCalories} kcal`
            : 'Any calories'}
        </span>
        {errors.maxCalories && (
          <span role="alert" className="text-xs text-destructive">
            {errors.maxCalories.message}
          </span>
        )}
      </label>
    </div>,
  ]

  return (
    <PageLayout className="space-y-8">
      <header className="mx-auto max-w-2xl text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          <Sparkles size={14} aria-hidden="true" />
          {copy.eyebrow}
        </div>
        <h1 className="font-heading text-4xl leading-[1.05] tracking-tight sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
          {copy.sub}
        </p>
      </header>

      <div className="mx-auto max-w-2xl space-y-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {STEP_LABELS.length} · {STEP_LABELS[step]}
          </span>
          <span>{Math.round(((step + 1) / STEP_LABELS.length) * 100)}%</span>
        </div>
        <ProgressBar
          value={step + 1}
          max={STEP_LABELS.length}
          label={`Step ${step + 1} of ${STEP_LABELS.length}`}
        />
        <ol className="flex flex-wrap gap-2 pt-1">
          {STEP_LABELS.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                disabled={index > step}
                onClick={() => index <= step && setStep(index)}
                aria-current={index === step ? 'step' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  index === step
                    ? 'border-primary bg-primary text-primary-foreground'
                    : index < step
                      ? 'border-border bg-secondary text-foreground'
                      : 'border-border bg-background text-muted-foreground opacity-60'
                }`}>
                {index < step ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  <span className="tabular-nums">{index + 1}</span>
                )}
                {label}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <Card className="mx-auto max-w-2xl gap-5 rounded-3xl border border-border bg-card p-6 shadow-none ring-1 ring-border/60">
        <SectionHeading
          title={`${eligible} of ${catalog.length} recipes now fit your profile`}
          sub="The count updates live from the same conflict engine used by For You."
          className="mb-0"
        />
        <div className="flex flex-wrap gap-2">
          {(values.diets ?? []).map((diet) => (
            <Badge key={diet} tone="sage" glyph="🌿">
              {diet}
            </Badge>
          ))}
          {(values.allergens ?? []).map((allergen) => (
            <Badge
              key={allergen}
              tone="amber"
              glyph={ALLERGEN_META[allergen].glyph}>
              no {ALLERGEN_META[allergen].label.toLowerCase()}
            </Badge>
          ))}
          {(values.avoidIngredients ?? []).map((item) => (
            <Badge key={item} tone="red" glyph="✕">
              avoid {item}
            </Badge>
          ))}
          {values.goal && (
            <Badge tone="neutral" glyph="🎯">
              {GOAL_LABELS[values.goal]}
            </Badge>
          )}
          {values.spice && (
            <Badge tone="neutral" glyph="🌶️">
              {SPICE_LABELS[values.spice]}
            </Badge>
          )}
        </div>

        <div className="border-t border-border pt-5">{stepFields[step]}</div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}>
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </Button>
            {profile.createdAt && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStartOver(true)}>
                <RotateCcw size={15} aria-hidden="true" /> Start over
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step === 0 && (
              <ButtonLink variant="ghost" to="/recipes">
                Skip for now
              </ButtonLink>
            )}
            <Button type="button" onClick={next}>
              {isLast ? 'Show me my recipes' : 'Next'}
              <ArrowRight size={17} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={startOver}
        onOpenChange={setStartOver}
        title="Start your taste over?"
        description="This clears your current answers and taste profile on this browser. Saved recipes, notes, plans and pantry items stay."
        confirmLabel="Start over"
        destructive
        onConfirm={() => {
          resetProfile()
          reset(defaultDraft(DEFAULT_PROFILE))
          setAvoidInput('')
          setStep(0)
          toast.success('Starting fresh')
        }}
      />
    </PageLayout>
  )
}
