import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { ArrowRight, Shuffle } from 'lucide-react'
import { PageLayout, PageTitle, RecipeCard } from '../components/app-shared'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { evaluatePantry, pantryTokens } from '../domain/pantry'
import { eligibleCount, rankRecipes } from '../domain/scoring'
import { hasPreferences, profileConflicts } from '../domain/taste'
import { useKitchenStore } from '../stores/kitchen'
import { useProfileStore } from '../stores/profile'
import type { CatalogRecipe, RecipeId } from '../types/recipe'

type RecommendationTab = 'top' | 'quick' | 'pantry' | 'off-menu'
const tabs: { id: RecommendationTab; label: string }[] = [
  { id: 'top', label: 'Top matches' },
  { id: 'quick', label: 'Under 30 min' },
  { id: 'pantry', label: 'Mostly on hand' },
  { id: 'off-menu', label: 'Off-menu' },
]
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function ForYouPage() {
  useDocumentTitle('For you')
  const catalog = useOutletContext<CatalogRecipe[]>()
  const profile = useProfileStore((state) => state.profile)
  const kitchen = useKitchenStore()
  const [tab, setTab] = useState<RecommendationTab>('top')
  const [surprise, setSurprise] = useState<CatalogRecipe | null>(null)
  const personalized = hasPreferences(profile)
  const tokens = pantryTokens(kitchen.pantry)
  const ranked = rankRecipes(catalog, {
    profile: personalized ? profile : null,
    pantryTokens: tokens,
    cookedIds: new Set(Object.keys(kitchen.cooked) as RecipeId[]),
  })
  const excluded = catalog.filter(
    (item) => personalized && profileConflicts(item.recipe, profile).length > 0,
  )
  const visible =
    tab === 'quick'
      ? ranked.filter(
          (item) =>
            item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes < 30,
        )
      : tab === 'pantry'
        ? ranked.filter(
            (item) => evaluatePantry(item.recipe, tokens).coverage >= 0.6,
          )
        : ranked
  return (
    <PageLayout className="space-y-8">
      <PageTitle
        eyebrow="YOUR PERSONAL PICKS"
        title="Made to fit you."
        sub="A little less scrolling, a little more cooking."
      />
      <p className="my-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          <b>
            {eligibleCount(catalog, {
              profile: personalized ? profile : null,
              pantryTokens: tokens,
              cookedIds: new Set(),
            })}
          </b>{' '}
          of {catalog.length} recipes fit your profile.
        </span>
      </p>
      {!personalized && (
        <div className="my-8 flex flex-col gap-5 rounded-2xl border border-border bg-secondary/60 p-6 sm:flex-row sm:items-center">
          <div>
            <h2>Let's get to know your taste.</h2>
            <p>
              Set your dietary needs and cooking style to make these picks
              yours.
            </p>
          </div>
          <Button render={<Link to="/onboarding" />}>
            Set up profile <ArrowRight size={17} />
          </Button>
        </div>
      )}
      <div className="my-5 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Recommendation lists">
          {tabs.map((item) => (
            <Button
              variant={tab === item.id ? 'secondary' : 'outline'}
              size="sm"
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}>
              {item.label}
              {item.id === 'off-menu' ? ` ${excluded.length}` : ''}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const picks = ranked.slice(0, 12)
            setSurprise(picks[Math.floor(Math.random() * picks.length)] ?? null)
          }}>
          <Shuffle size={15} /> Surprise me
        </Button>
      </div>
      {surprise && (
        <div className="my-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary p-5">
          <span>Tonight's idea</span>
          <Link to={`/recipes/${surprise.id}`}>{surprise.recipe.name}</Link>
          <Button variant="ghost" onClick={() => setSurprise(null)}>
            Dismiss
          </Button>
        </div>
      )}
      {tab === 'off-menu' ? (
        excluded.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {excluded.map((item) => (
              <Card
                className="space-y-4 rounded-2xl border border-border bg-card p-4"
                key={item.id}>
                <RecipeCard item={item} />
                <div className="flex flex-wrap items-center gap-2">
                  {profileConflicts(item.recipe, profile).map((reason) => (
                    <span
                      className="rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground"
                      key={reason.id}>
                      {reason.glyph} {reason.label}
                    </span>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => kitchen.logCook(item.id)}>
                  Still cook it
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Nothing is off-menu for your current profile.
          </p>
        )
      ) : visible.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.slice(0, 12).map((item) => (
            <RecipeCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          No recipes fit this list yet. Add pantry staples or adjust your
          profile.
        </p>
      )}
    </PageLayout>
  )
}
