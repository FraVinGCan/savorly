import { useRef, useState } from 'react'
import { STORAGE_KEYS } from '../lib/storage'
import { useKitchenStore } from '../stores/kitchen'
import { useProfileStore } from '../stores/profile'
import { ALLERGENS, DIETS } from '../domain/taste'
import { PageLayout, PageTitle } from '../components/app-shared'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import {
  NativeSelect,
  NativeSelectOption,
} from '../components/ui/native-select'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Profile() {
  useDocumentTitle('Profile')
  const profile = useProfileStore((s) => s.profile)
  const update = useProfileStore((s) => s.update)
  const kitchen = useKitchenStore()
  const [avoidInput, setAvoidInput] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const exportBackup = () => {
    const backup: Record<string, unknown> = {
      'savorly.version': 1,
      exportedAt: new Date().toISOString(),
    }
    for (const key of Object.values(STORAGE_KEYS)) {
      const raw = localStorage.getItem(key)
      try {
        backup[key] = raw === null ? null : JSON.parse(raw)
      } catch {
        backup[key] = raw
      }
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `savorly-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const importBackup = async (file?: File) => {
    if (!file) return
    try {
      const backup = JSON.parse(await file.text()) as Record<string, unknown>
      let restored = 0
      for (const key of Object.values(STORAGE_KEYS)) {
        if (!(key in backup)) continue
        const value = backup[key]
        if (value === null) localStorage.removeItem(key)
        else
          localStorage.setItem(
            key,
            key === STORAGE_KEYS.theme && typeof value === 'string'
              ? value
              : JSON.stringify(value),
          )
        restored++
      }
      window.alert(
        `${restored} Savorly sections restored. The page will reload now.`,
      )
      location.reload()
    } catch {
      window.alert('This file is not a valid Savorly backup.')
    }
  }
  return (
    <PageLayout className="space-y-8">
      <PageTitle
        eyebrow="YOUR SAVORLY"
        title="Your kitchen, your preferences."
        sub="A few details help us bring the right recipes closer."
      />
      <Card className="max-w-[650px] gap-4 rounded-2xl p-6 shadow-none ring-1 ring-border [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-xs [&_label]:font-semibold [&_p]:text-xs [&_p]:text-muted-foreground">
        <label>
          Your name
          <Input
            value={profile.displayName}
            onChange={(e) => update({ displayName: e.target.value })}
            placeholder="What should we call you?"
          />
        </label>
        <label>
          Cooking style
          <NativeSelect
            className="w-full rounded-xl bg-card"
            value={profile.goal}
            onChange={(e) =>
              update({ goal: e.target.value as typeof profile.goal })
            }>
            <NativeSelectOption value="balanced">Balanced</NativeSelectOption>
            <NativeSelectOption value="quick">Quick & easy</NativeSelectOption>
            <NativeSelectOption value="light">Light</NativeSelectOption>
            <NativeSelectOption value="comfort">
              Comfort food
            </NativeSelectOption>
          </NativeSelect>
        </label>
        <label>
          Maximum cooking time (minutes)
          <Input
            type="number"
            value={profile.maxTotalMinutes ?? ''}
            onChange={(e) =>
              update({
                maxTotalMinutes: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </label>
        <label>
          Maximum calories per serving
          <Input
            type="number"
            value={profile.maxCalories ?? ''}
            onChange={(event) =>
              update({
                maxCalories: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          />
        </label>
        <div>
          <h3>Diet preferences</h3>
          <div className="flex flex-wrap items-center gap-2">
            {DIETS.map((diet) => (
              <Button
                type="button"
                variant={profile.diets.includes(diet) ? 'secondary' : 'outline'}
                size="sm"
                key={diet}
                aria-pressed={profile.diets.includes(diet)}
                onClick={() =>
                  update({
                    diets: profile.diets.includes(diet)
                      ? profile.diets.filter((item) => item !== diet)
                      : [...profile.diets, diet],
                  })
                }>
                {diet}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <h3>Ingredients to avoid</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={avoidInput}
              onChange={(event) => setAvoidInput(event.target.value)}
              placeholder="e.g. mushrooms"
            />
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                const item = avoidInput.trim()
                if (item && !profile.avoidIngredients.includes(item))
                  update({
                    avoidIngredients: [...profile.avoidIngredients, item],
                  })
                setAvoidInput('')
              }}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profile.avoidIngredients.map((item) => (
              <Button
                variant="outline"
                size="sm"
                type="button"
                key={item}
                onClick={() =>
                  update({
                    avoidIngredients: profile.avoidIngredients.filter(
                      (entry) => entry !== item,
                    ),
                  })
                }>
                {item} ×
              </Button>
            ))}
          </div>
        </div>
        <div>
          <h3>Allergies and sensitivities</h3>
          <div className="flex flex-wrap items-center gap-2">
            {ALLERGENS.map((allergen) => (
              <Button
                type="button"
                variant={
                  profile.allergens.includes(allergen) ? 'secondary' : 'outline'
                }
                size="sm"
                key={allergen}
                aria-pressed={profile.allergens.includes(allergen)}
                onClick={() =>
                  update({
                    allergens: profile.allergens.includes(allergen)
                      ? profile.allergens.filter((item) => item !== allergen)
                      : [...profile.allergens, allergen],
                  })
                }>
                {allergen}
              </Button>
            ))}
          </div>
        </div>
        <p>Preferences are stored in this browser. No account or tracking.</p>
        <Button
          variant="outline"
          onClick={() => {
            update({ createdAt: new Date().toISOString() })
          }}>
          Save profile
        </Button>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportBackup}>
            Export your data
          </Button>
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            Import a backup
          </Button>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(event) => void importBackup(event.target.files?.[0])}
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            if (
              window.confirm(
                'This clears your Savorly preferences, pantry, saved recipes, notes, plans, and creations from this browser. Continue?',
              )
            ) {
              Object.values(STORAGE_KEYS).forEach((key) =>
                localStorage.removeItem(key),
              )
              location.reload()
            }
          }}>
          Clear Savorly data
        </Button>
        <p>
          {kitchen.pantry.length} pantry items ·{' '}
          {Object.keys(kitchen.favorites).length} saved
        </p>
      </Card>
    </PageLayout>
  )
}
