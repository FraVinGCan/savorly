import { Heart, Leaf } from 'lucide-react'
import { useOutletContext } from 'react-router'
import type { CatalogRecipe } from '../types/recipe'
import { PageLayout, PageTitle } from '../components/app-shared'
import { Card } from '../components/ui/card'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function About() {
  useDocumentTitle('About')
  const catalog = useOutletContext<CatalogRecipe[]>()
  const cuisines = new Set(catalog.map((x) => x.recipe.cuisine))
  const tags = new Set(catalog.flatMap((x) => x.recipe.tags))
  return (
    <PageLayout className="space-y-8">
      <PageTitle
        eyebrow="A SMALL PROMISE"
        title="Recipes, thoughtfully sorted."
        sub="A little more personal, a little less noisy."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl bg-card p-6 text-card-foreground shadow-none ring-1 ring-border/70">
          <span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary">
            <Leaf />
          </span>
          <h2>One catalogue, then all yours.</h2>
          <p>
            We read the public recipe catalogue once, then use your local
            preferences, pantry, and favorites to shape what you see.
          </p>
        </Card>
        <Card className="rounded-2xl bg-card p-6 text-card-foreground shadow-none ring-1 ring-border/70">
          <span className="grid size-12 place-items-center rounded-xl bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100">
            <Heart />
          </span>
          <h2>Your data stays yours.</h2>
          <p>
            There are no accounts, no tracking, and no server writes. The things
            you save live in this browser.
          </p>
        </Card>
        <Card className="rounded-2xl bg-card p-6 text-card-foreground shadow-none ring-1 ring-border/70">
          <b>{catalog.length}</b>
          <span>recipes</span>
          <b>{cuisines.size}</b>
          <span>cuisines</span>
          <b>{tags.size}</b>
          <span>tags</span>
        </Card>
      </div>
    </PageLayout>
  )
}
