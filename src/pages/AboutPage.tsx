import {
  BookOpenCheck,
  Database,
  Leaf,
  ListChecks,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Utensils,
} from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageHeader, PageLayout } from '../components/app-shared'
import { Badge, ButtonLink, SectionHeading } from '../components/primitives'
import { Card } from '../components/ui/card'

const PIPELINE = [
  {
    icon: Database,
    title: 'One quick load',
    body: 'Savorly loads the recipe collection once when you arrive, so browsing stays fast. Nothing refreshes in the background while you read.',
  },
  {
    icon: Utensils,
    title: 'Ingredients, understood',
    body: '“2 cups flour” and “flour” are treated as the same ingredient, so pantry checks and shopping lists stay sensible.',
  },
  {
    icon: ShieldCheck,
    title: 'Your rules come first',
    body: 'Your diets, allergens and avoid list are checked before anything is suggested. A recipe that clashes with your profile never rises to the top.',
  },
  {
    icon: ListChecks,
    title: 'Your pantry counts',
    body: 'Tell Savorly what you have and recipes that use more of it move up. Matching is generous enough to forgive the odd variation.',
  },
  {
    icon: BookOpenCheck,
    title: 'One tidy shopping list',
    body: 'Plan a few recipes and Savorly folds their ingredients into a single aisle-grouped list you can tick off as you shop.',
  },
  {
    icon: TrendingUp,
    title: 'It learns your kitchen',
    body: 'What you cook, save, rate and note gently shapes your suggestions over time. All of it stays on this device.',
  },
] as const

const GUARANTEES = [
  {
    title: 'A collection to browse',
    body: 'The shared catalogue is read-only. Your own recipes and edits stay with you on this device.',
  },
  {
    title: 'No accounts',
    body: 'There is no sign-up, no login, and no profile on a server. Refresh the page and everything is still here.',
  },
  {
    title: 'No tracking',
    body: 'No analytics, advertising pixels or third-party scripts. What you cook stays between you and this browser.',
  },
  {
    title: 'Honest matching',
    body: 'Allergen checks are a helpful filter based on listed ingredients, not a medical guarantee. Always check the recipe.',
  },
] as const

export default function About() {
  useDocumentTitle('About')
  const { catalog, cuisines, tags } = useRecipes()

  return (
    <PageLayout className="space-y-10">
      <PageHeader
        eyebrow="A SMALL PROMISE"
        title="Recipes, thoughtfully sorted."
        sub="A little more personal, a little less noisy — and honest about how your recipes are chosen.">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <b className="block font-heading text-3xl">{catalog.length}</b>
            <span className="text-xs text-muted-foreground">recipes</span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <b className="block font-heading text-3xl">{cuisines.length}</b>
            <span className="text-xs text-muted-foreground">cuisines</span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <b className="block font-heading text-3xl">{tags.length}</b>
            <span className="text-xs text-muted-foreground">tags</span>
          </div>
        </div>
      </PageHeader>

      <section>
        <SectionHeading
          eyebrow="HOW IT WORKS"
          title="Six steps, no mystery"
          sub="From your first visit to the recipe on your plate."
        />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((stage, index) => {
            const Icon = stage.icon
            return (
              <li key={stage.title}>
                <Card className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="font-heading text-3xl text-muted-foreground/40">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl">{stage.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {stage.body}
                  </p>
                </Card>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card className="flex flex-col justify-between gap-4 rounded-2xl border border-primary/25 bg-secondary/60 p-6 shadow-none">
          <div>
            <Badge tone="brand" glyph="⚖️">
              How matches work
            </Badge>
            <h2 className="mt-3 font-heading text-2xl">
              Great match, good match, worth a try.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Savorly weighs what it knows about your taste, time and pantry,
              then turns the total into a simple score out of 100. A recipe that
              conflicts with your profile is set aside, not just ranked low.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">Great match · 75+</Badge>
            <Badge tone="neutral">Good match · 60+</Badge>
            <Badge tone="neutral">Fair match · 45+</Badge>
            <Badge tone="neutral">Worth a try · below 45</Badge>
          </div>
          <ButtonLink variant="outline" to="/foryou">
            <Sparkles size={16} aria-hidden="true" />
            See your matches
          </ButtonLink>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-6 shadow-none ring-1 ring-border/60">
          <SectionHeading
            title="Four guarantees"
            sub="The boundaries are part of the product."
            className="mb-4"
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {GUARANTEES.map((item) => (
              <li key={item.title} className="flex gap-3">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Leaf size={16} className="text-primary" aria-hidden="true" />
          Built for the way you cook, not the way a feed wants you to scroll.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/onboarding">
            <Sparkles size={16} aria-hidden="true" />
            Set your taste
          </ButtonLink>
          <ButtonLink variant="outline" to="/recipes">
            Browse recipes
          </ButtonLink>
        </div>
      </div>
    </PageLayout>
  )
}
