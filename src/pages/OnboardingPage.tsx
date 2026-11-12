import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useProfileStore } from '../stores/profile'
import { PageLayout, PageTitle } from '../components/app-shared'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function Onboarding() {
  useDocumentTitle('Your taste')
  const update = useProfileStore((s) => s.update)
  const complete = useProfileStore((s) => s.complete)
  const [name, setName] = useState('')
  return (
    <PageLayout className="space-y-8">
      <PageTitle
        eyebrow="A FRESH START"
        title="Let's make this yours."
        sub="Tell us a little about what makes a meal feel right."
      />
      <Card className="max-w-[650px] gap-4 rounded-2xl p-6 shadow-none ring-1 ring-border [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-xs [&_label]:font-semibold [&_p]:text-xs [&_p]:text-muted-foreground">
        <label>
          What should we call you?
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              update({ displayName: e.target.value })
            }}
            placeholder="Your name"
          />
        </label>
        <p>What matters most? You can tune this any time in your profile.</p>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              'vegetarian',
              'vegan',
              'gluten-free',
              'dairy-free',
              'low-carb',
            ] as const
          ).map((diet) => (
            <Button
              variant="outline"
              size="sm"
              key={diet}
              onClick={() =>
                update({
                  diets: useProfileStore.getState().profile.diets.includes(diet)
                    ? useProfileStore
                        .getState()
                        .profile.diets.filter((d) => d !== diet)
                    : [...useProfileStore.getState().profile.diets, diet],
                })
              }>
              {useProfileStore.getState().profile.diets.includes(diet)
                ? '✓ '
                : ''}
              {diet}
            </Button>
          ))}
        </div>
        <Button
          onClick={() => {
            complete()
            location.href = '/foryou'
          }}>
          Show me my recipes <ArrowRight size={17} />
        </Button>
      </Card>
    </PageLayout>
  )
}
