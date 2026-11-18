import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Shuffle } from 'lucide-react'
import {
  eligibleCount,
  evaluateRecipe,
  excludedRecipes,
  rankRecipes,
  scoreTier,
} from '../domain/scoring'
import { profileConflicts } from '../domain/taste'
import { useCookbookStore } from '../stores/cookbook'
import { useProfileStore } from '../stores/profile'
import { toast } from '../stores/toast'
import { useRecipes } from '../hooks/useRecipes'
import { useTasteSetup } from '../hooks/useTasteSetup'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageHeader, PageLayout, RecipeCard } from '../components/app-shared'
import {
  Badge,
  ButtonLink,
  EmptyState,
  ScorePill,
} from '../components/primitives'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { TabGroup } from '../components/ui/tabs'
import { GOAL_LABELS, SPICE_LABELS } from '../lib/format'
import type { CatalogRecipe } from '../types/recipe'
import { recipeSlug } from '../types/recipe'

type RecommendationTab = 'top' | 'quick' | 'pantry' | 'off-menu'

export default function ForYouPage() {
  useDocumentTitle('For you')
  const { catalog } = useRecipes()
  const profile = useProfileStore((state) => state.profile)
  const logCook = useCookbookStore((state) => state.logCook)
  const { ctx, personalised } = useTasteSetup()
  const [tab, setTab] = useState<RecommendationTab>('top')
  const [surprise, setSurprise] = useState<CatalogRecipe | null>(null)
  const [spinning, setSpinning] = useState(false)

  if (!personalised)
    return (
      <PageLayout className="space-y-8">
        <PageHeader
          eyebrow="YOUR PERSONAL PICKS"
          title="Made to fit you."
          sub="A little less scrolling, a little more cooking."
        />
        <EmptyState
          glyph="🌱"
          title="Your picks start with your taste"
          body="Set your dietary needs, spice comfort, and time budget in five short steps. Until then, browse the whole catalogue by rating."
          actions={
            <>
              <ButtonLink to="/onboarding">
                Set up your taste <ArrowRight size={17} />
              </ButtonLink>
              <ButtonLink variant="outline" to="/recipes">
                Browse recipes
              </ButtonLink>
            </>
          }
        />
      </PageLayout>
    )

  const ranked = rankRecipes(catalog, ctx)
  const excluded = excludedRecipes(catalog, ctx)
  const eligible = eligibleCount(catalog, ctx)
  const quick = ranked.filter(
    (item) => item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes < 30,
  )
  const mostlyOnHand = ranked.filter(
    (item) => (item.evaluation.pantry?.coverage ?? 0) >= 0.6,
  )
  const top = ranked.slice(0, 12)

  const pickSurprise = () => {
    setSpinning(true)
    window.setTimeout(() => {
      setSurprise(top[Math.floor(Math.random() * top.length)] ?? null)
      setSpinning(false)
    }, 350)
  }

  const tabs = [
    { value: 'top' as const, label: 'Top matches', count: ranked.length },
    { value: 'quick' as const, label: 'Under 30 min', count: quick.length },
    {
      value: 'pantry' as const,
      label: 'Mostly on hand',
      count: mostlyOnHand.length,
    },
    {
      value: 'off-menu' as const,
      label: 'Off-menu',
      count: excluded.length,
    },
  ]

  const grid = (items: typeof ranked) =>
    items.length ? (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <RecipeCard key={item.id} item={item} evaluation={item.evaluation} />
        ))}
      </div>
    ) : (
      <EmptyState
        glyph="🧺"
        title="No recipes in this list yet"
        body="Add a few pantry staples or widen your profile limits to see more ideas."
        actions={
          <ButtonLink variant="outline" to="/pantry">
            Fill your pantry
          </ButtonLink>
        }
      />
    )

  return (
    <PageLayout className="space-y-8">
      <PageHeader
        eyebrow="YOUR PERSONAL PICKS"
        title="Made to fit you."
        sub={`${eligible} of ${catalog.length} recipes clear your profile.`}
      />

      <div className="flex flex-wrap items-center gap-2">
        {profile.diets.map((diet) => (
          <Badge key={diet} tone="sage" glyph="🌿">
            {diet}
          </Badge>
        ))}
        {profile.allergens.map((allergen) => (
          <Badge key={allergen} tone="amber" glyph="⚠️">
            no {allergen}
          </Badge>
        ))}
        {profile.avoidIngredients.slice(0, 4).map((item) => (
          <Badge key={item} tone="red" glyph="✕">
            avoid {item}
          </Badge>
        ))}
        <Badge tone="neutral" glyph="🎯">
          {GOAL_LABELS[profile.goal]}
        </Badge>
        <Badge tone="neutral" glyph="🌶️">
          {SPICE_LABELS[profile.spice]}
        </Badge>
        {profile.maxTotalMinutes && (
          <Badge tone="neutral" glyph="⏱">
            ≤ {profile.maxTotalMinutes} min
          </Badge>
        )}
        {profile.maxCalories && (
          <Badge tone="neutral" glyph="🔥">
            ≤ {profile.maxCalories} kcal
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Ranked by your profile, pantry and cooking history — every score shows
          its reasons.
        </p>
        <Button variant="outline" disabled={spinning} onClick={pickSurprise}>
          <Shuffle
            size={15}
            aria-hidden="true"
            className={spinning ? 'animate-spin' : undefined}
          />
          {spinning ? 'Choosing…' : 'Surprise me'}
        </Button>
      </div>

      {surprise && (
        <Card className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-secondary/70 p-5 shadow-none">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Tonight&apos;s idea
            </span>
            <h2 className="mt-1 font-heading text-2xl">
              <Link
                to={`/recipes/${recipeSlug(surprise.id)}`}
                className="hover:text-primary">
                {surprise.recipe.name}
              </Link>
            </h2>
            <p className="text-xs text-muted-foreground">
              {surprise.recipe.cuisine} ·{' '}
              {surprise.recipe.prepTimeMinutes +
                surprise.recipe.cookTimeMinutes}{' '}
              min · {surprise.recipe.rating.toFixed(1)} ★
            </p>
          </div>
          <div className="flex gap-2">
            <ButtonLink to={`/recipes/${recipeSlug(surprise.id)}`}>
              Open recipe
            </ButtonLink>
            <Button variant="ghost" onClick={() => setSurprise(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      <TabGroup
        label="Recommendation lists"
        value={tab}
        onValueChange={setTab}
        items={tabs.map((item) => ({
          ...item,
          content:
            item.value === 'top' ? (
              <div className="space-y-6">
                {ranked.length > 0 && (
                  <div className="grid gap-3 lg:grid-cols-3">
                    {ranked.slice(0, 3).map((item, index) => (
                      <Card
                        key={item.id}
                        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-none ring-1 ring-border/70">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                              #{index + 1} · {scoreTier(item.evaluation.score)}
                            </span>
                            <Link
                              to={`/recipes/${recipeSlug(item.id)}`}
                              className="mt-1 block font-heading text-xl leading-tight hover:text-primary">
                              {item.recipe.name}
                            </Link>
                          </div>
                          <ScorePill score={item.evaluation.score} />
                        </div>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {item.evaluation.reasons.slice(0, 3).map((reason) => (
                            <li key={reason.id}>
                              {reason.weight > 0 ? '+' : ''}
                              {Math.round(reason.weight)} · {reason.label}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    ))}
                  </div>
                )}
                {grid(top)}
              </div>
            ) : item.value === 'quick' ? (
              grid(quick)
            ) : item.value === 'pantry' ? (
              grid(mostlyOnHand)
            ) : excluded.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {excluded.map((item) => (
                  <div key={item.id} className="space-y-3">
                    <RecipeCard
                      item={item}
                      evaluation={evaluateRecipe(item, ctx)}
                    />
                    <div className="flex flex-wrap gap-2">
                      {profileConflicts(item.recipe, profile).map((reason) => (
                        <Badge key={reason.id} tone="red" glyph={reason.glyph}>
                          {reason.label}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        logCook(item.id)
                        toast.success('Logged as cooked', item.recipe.name)
                      }}>
                      Still cook it
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                glyph="✅"
                title="Nothing is off-menu"
                body="Every recipe currently clears your profile. That is a good problem to have."
              />
            ),
        }))}
      />
    </PageLayout>
  )
}
