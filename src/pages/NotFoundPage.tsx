import { Link } from 'react-router'
import { useKitchenStore } from '../stores/kitchen'
import { PageLayout } from '../components/app-shared'
import { Button } from '../components/ui/button'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Not found')
  const compareCount = useKitchenStore((state) => state.compare.length)
  return (
    <PageLayout className="flex min-h-[55vh] flex-col items-start justify-center gap-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
        404 · PAGE NOT FOUND
      </div>
      <h1 className="font-heading text-4xl">This page took a wrong turn.</h1>
      <p className="text-sm text-muted-foreground">
        Let’s get you back to something delicious.
      </p>
      <Button render={<Link to="/recipes" />}>Explore recipes</Button>
      <Link to="/compare">Your compare tray ({compareCount})</Link>
    </PageLayout>
  )
}
