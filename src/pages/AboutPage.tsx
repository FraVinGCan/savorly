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
import { MAX_RAW } from '../domain/scoring'
import { useRecipes } from '../hooks/useRecipes'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageHeader, PageLayout } from '../components/app-shared'
import { Badge, ButtonLink, SectionHeading } from '../components/primitives'
import { Card } from '../components/ui/card'

const PIPELINE = [
  {
    icon: Database,
    title: 'One fetch',
    body: 'Savorly reads the public DummyJSON catalogue once and the tag list once. There are no search requests per keystroke and no background polling.',
  },
  {
    icon: Utensils,
    title: 'Normalise ingredients',
    body: 'Every free-prose ingredient becomes a stable key — accents folded, parentheticals dropped, quantities and noise words removed — so “2 cups flour” and “flour” are the same staple.',
  },
  {
    icon: ShieldCheck,
    title: 'Eligibility, then ranking',
    body: 'Your diets, allergens and avoid list run first as hard blocks. Only recipes that clear them are ranked, so an off-menu recipe can never outscore a safe one.',
  },
  {
    icon: ListChecks,
    title: 'Pantry feeds ranking',
    body: 'Pantry matching is fuzzy by design: an ingredient is owned when any normalised token overlaps. Coverage adds to the score without pretending quantities exist.',
  },
  {
    icon: BookOpenCheck,
    title: 'Plans merge into one list',
    body: 'The planner rebuilds one de-duplicated, aisle-grouped shopping list from every planned recipe on each render. Ticking an item is stored per week.',
  },
  {
    icon: TrendingUp,
    title: 'Activity reshapes what you see',
    body: 'Cooks, favourites, ratings and notes stay local and feed back into the ranking, the cookbook, and the insights — never into an account or a server.',
  },
] as const

const GUARANTEES = [
  {
    title: 'A read-only API',
    body: 'The catalogue is fetched, never edited. Creation and edit actions use the API only as a normaliser, then keep the real record on this device.',
  },
  {
    title: 'No accounts',
    body: 'There is no sign-up, no login, and no profile on a server. Refreshing the page is the only session you need.',
  },
  {
    title: 'No tracking',
    body: 'No analytics, advertising pixels, or third-party scripts. Your kitchen data does not leave this browser.',
  },
  {
    title: 'Honest matching',
    body: 'Allergen detection is keyword-based. It is a helpful filter, not a medical guarantee, and the app says so plainly wherever it matters.',
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
        sub="A little more personal, a little less noisy — and honest about how the sorting works.">
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
          eyebrow="THE PIPELINE"
          title="Six stages, one honest path"
          sub="From a single fetch to the recipe you actually cook."
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
              Scoring constant
            </Badge>
            <h2 className="mt-3 font-heading text-2xl">
              Every score starts from {MAX_RAW}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Reasons carry positive or negative weights. Savorly sums them and
              maps the total onto 0–100 with <code>{MAX_RAW}</code> as the
              ceiling. A profile conflict is a hard zero, not a low score.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">Great match · 75+</Badge>
            <Badge tone="neutral">Good match · 60+</Badge>
            <Badge tone="neutral">Fair match · 45+</Badge>
            <Badge tone="neutral">Long shot · below 45</Badge>
          </div>
          <ButtonLink variant="outline" to="/foryou">
            <Sparkles size={16} aria-hidden="true" />
            See your scores
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
