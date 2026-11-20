import { useMemo, useState } from 'react'

import { Plus, ShoppingBasket, Sparkles, Trash2 } from 'lucide-react'
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  PANTRY_SUGGESTIONS,
  classifyIngredient,
  displayIngredient,
  normalizeIngredient,
} from '../domain/ingredients'
import { evaluatePantry, pantryTokens } from '../domain/pantry'
import { rankRecipes } from '../domain/scoring'
import { usePantryStore } from '../stores/pantry'
import { toast } from '../stores/toast'
import { useRecipes } from '../hooks/useRecipes'
import { useTasteSetup } from '../hooks/useTasteSetup'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageHeader, PageLayout } from '../components/app-shared'
import { RecipeCard } from '../components/recipe-card'
import {
  Badge,
  ButtonLink,
  Chip,
  ConfirmDialog,
  EmptyState,
  SectionHeading,
} from '../components/primitives'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { TabGroup } from '../components/ui/tabs'

type PantryTab = 'now' | 'almost' | 'shopping'

export default function PantryPage() {
  useDocumentTitle('Pantry')
  const { catalog } = useRecipes()
  const { ctx } = useTasteSetup()
  const items = usePantryStore((state) => state.items)
  const add = usePantryStore((state) => state.add)
  const remove = usePantryStore((state) => state.remove)
  const toggle = usePantryStore((state) => state.toggle)
  const has = usePantryStore((state) => state.has)
  const clear = usePantryStore((state) => state.clear)
  const [value, setValue] = useState('')
  const [tab, setTab] = useState<PantryTab>('now')
  const [confirmClear, setConfirmClear] = useState(false)

  const tokens = useMemo(() => pantryTokens(items), [items])
  const ranked = useMemo(() => rankRecipes(catalog, ctx), [catalog, ctx])

  const withPantry = ranked.map((item) => ({
    item,
    pantry: evaluatePantry(item.recipe, tokens),
  }))
  const ready = withPantry.filter((row) => row.pantry.missing.length === 0)
  const almost = withPantry.filter(
    (row) => row.pantry.missing.length >= 1 && row.pantry.missing.length <= 2,
  )
  const worth = withPantry.filter(
    (row) => row.pantry.missing.length >= 3 && row.pantry.coverage >= 0.25,
  )

  const wanted = new Map<
    string,
    { key: string; label: string; count: number; unlock: number }
  >()
  for (const { pantry } of withPantry) {
    for (const missing of pantry.missing) {
      const key = normalizeIngredient(missing)
      if (!key) continue
      const row = wanted.get(key) ?? {
        key,
        label: displayIngredient(key),
        count: 0,
        unlock: 0,
      }
      row.count += 1
      if (pantry.missing.length === 1) row.unlock += 1
      wanted.set(key, row)
    }
  }
  const mostWanted = [...wanted.values()]
    .sort((a, b) => b.unlock - a.unlock || b.count - a.count)
    .slice(0, 8)

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: items
      .filter((item) => classifyIngredient(item) === category)
      .sort((a, b) => a.localeCompare(b)),
  })).filter((group) => group.items.length)

  const submit = () => {
    const entry = value.trim()
    if (!entry) return
    if (has(entry)) {
      toast.info('Already in your pantry', entry)
      setValue('')
      return
    }
    add(entry)
    toast.success('Added to pantry', entry)
    setValue('')
  }

  const addStaples = () => {
    let added = 0
    for (const staple of PANTRY_SUGGESTIONS.slice(0, 12)) {
      if (!has(staple)) {
        add(staple)
        added += 1
      }
    }
    toast.success(
      added ? `Added ${added} common staples` : 'Staples already covered',
    )
  }

  const grid = (rows: typeof withPantry) =>
    rows.length ? (
      <div className="grid gap-5 sm:grid-cols-2">
        {rows.map(({ item, pantry }) => (
          <RecipeCard
            key={item.id}
            item={item}
            evaluation={item.evaluation}
            actions={
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  tone={pantry.missing.length === 0 ? 'sage' : 'neutral'}
                  glyph={pantry.missing.length === 0 ? '✓' : '🧺'}>
                  {pantry.missing.length === 0
                    ? 'Everything on hand'
                    : `${Math.round(pantry.coverage * 100)}% on hand`}
                </Badge>
                {pantry.missing.length > 0 && (
                  <span className="min-w-0">
                    Needs {pantry.missing.slice(0, 3).join(', ')}
                    {pantry.missing.length > 3 ? '…' : ''}
                  </span>
                )}
              </div>
            }
          />
        ))}
      </div>
    ) : (
      <EmptyState
        glyph="🥕"
        title={
          tab === 'now'
            ? 'Nothing fully covered yet'
            : tab === 'almost'
              ? 'No near-misses'
              : 'Nothing to shop for here'
        }
        body="Add a few more staples and this list fills itself from your ranked catalogue."
        actions={<Button onClick={addStaples}>Add 12 common staples</Button>}
      />
    )

  return (
    <PageLayout className="space-y-8">
      <PageHeader
        eyebrow="YOUR KITCHEN"
        title="A little inventory goes a long way."
        sub="Keep track of what you have, then find something lovely to make."
        actions={
          items.length ? (
            <Button variant="outline" onClick={() => setConfirmClear(true)}>
              <Trash2 size={16} aria-hidden="true" /> Clear pantry
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Add an ingredient you have</span>
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
            }}
            placeholder="Add an ingredient you have"
          />
        </label>
        <Button onClick={submit}>
          <Plus size={17} aria-hidden="true" /> Add
        </Button>
      </div>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Common staples
          </h2>
          <span className="text-xs text-muted-foreground">
            Tap to toggle · {items.length} in your pantry
          </span>
        </div>
        <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-border bg-card p-3">
          {PANTRY_SUGGESTIONS.map((staple) => (
            <Chip
              key={staple}
              active={has(staple)}
              onClick={() => toggle(staple)}>
              {staple}
            </Chip>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
        <div className="space-y-6">
          <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
            <SectionHeading
              title="Inventory by aisle"
              sub={`${items.length} ${items.length === 1 ? 'item' : 'items'} grouped the way you shop.`}
            />
            {grouped.length ? (
              <div className="space-y-4">
                {grouped.map((group) => {
                  const meta = CATEGORY_META[group.category]
                  return (
                    <div key={group.category}>
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <span aria-hidden="true">{meta.glyph}</span>
                        {meta.label}
                        <span className="text-[10px] font-normal">
                          {group.items.length}
                        </span>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background py-1 pl-3 pr-1 text-xs">
                            {item}
                            <button
                              type="button"
                              aria-label={`Remove ${item} from pantry`}
                              className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => {
                                remove(item)
                                toast.info('Removed from pantry', item)
                              }}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                glyph="🧺"
                title="Your pantry is empty"
                body="Add an ingredient above, or start with 12 common staples."
                actions={
                  <Button onClick={addStaples}>Add 12 common staples</Button>
                }
              />
            )}
          </Card>

          <Card className="rounded-2xl border border-border bg-card p-5 shadow-none ring-1 ring-border/60">
            <SectionHeading
              title="Most wanted"
              sub="Missing ingredients that would unlock the most recipes."
            />
            {mostWanted.length ? (
              <ul className="space-y-2">
                {mostWanted.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">{row.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {row.unlock > 0
                          ? `unlocks ${row.unlock} recipe${row.unlock === 1 ? '' : 's'}`
                          : `used by ${row.count} recipes`}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        add(row.label)
                        toast.success('Added to pantry', row.label)
                      }}>
                      <Plus size={14} aria-hidden="true" /> Add
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing missing across your ranked recipes. Impressive pantry.
              </p>
            )}
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Matching is fuzzy: an ingredient is owned when any normalised
              token overlaps, so &ldquo;2 tbsp soy sauce&rdquo; matches a pantry
              entry of &ldquo;soy sauce&rdquo;.
            </p>
          </Card>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBasket size={18} aria-hidden="true" />
            <h2 className="font-heading text-2xl">What you can make</h2>
          </div>
          <TabGroup
            label="Pantry recipe lists"
            value={tab}
            onValueChange={setTab}
            items={[
              {
                value: 'now',
                label: 'Cook now',
                count: ready.length,
                content: grid(ready),
              },
              {
                value: 'almost',
                label: '1–2 missing',
                count: almost.length,
                content: grid(almost),
              },
              {
                value: 'shopping',
                label: 'Worth shopping for',
                count: worth.length,
                content: grid(worth),
              },
            ]}
          />
          {ranked.length === 0 && (
            <EmptyState
              className="mt-4"
              glyph="📚"
              title="No ranked recipes yet"
              body="Finish onboarding or check the catalogue connection to see pantry matches."
              actions={
                <ButtonLink variant="outline" to="/onboarding">
                  <Sparkles size={16} aria-hidden="true" />
                  Set your taste
                </ButtonLink>
              }
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear the whole pantry?"
        description="This removes every pantry item from this browser. Saved recipes, plans and notes are untouched."
        confirmLabel="Clear pantry"
        destructive
        onConfirm={() => {
          clear()
          toast.success('Pantry cleared')
        }}
      />
    </PageLayout>
  )
}
