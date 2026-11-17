import { Suspense, useEffect } from 'react'
import { Outlet, useNavigation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Leaf } from 'lucide-react'
import { apiError } from './lib/api'
import { catalogQueryOptions } from './lib/queries'
import { useCompareStore } from './stores/compare'
import { useCookbookStore } from './stores/cookbook'
import { useCreationsStore } from './stores/creations'
import { usePantryStore } from './stores/pantry'
import { usePlannerStore } from './stores/planner'
import { useProfileStore } from './stores/profile'
import { useThemeStore } from './stores/theme'
import { Shell } from './components/app-shared'
import { Alert, AlertDescription } from './components/ui/alert'
import { Button } from './components/ui/button'
import { Skeleton } from './components/ui/skeleton'

const rehydrateAll = () => {
  void useCookbookStore.persist.rehydrate()
  void usePantryStore.persist.rehydrate()
  void usePlannerStore.persist.rehydrate()
  void useCompareStore.persist.rehydrate()
  void useCreationsStore.persist.rehydrate()
  void useProfileStore.persist.rehydrate()
  void useThemeStore.persist.rehydrate()
}

export default function App() {
  // Every persisted store reads the same seven keys, so one listener keeps the
  // whole app in step with edits made in another tab.
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith('savorly.')) rehydrateAll()
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const navigation = useNavigation()
  const catalogQuery = useQuery(catalogQueryOptions)

  if (catalogQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
        <div className="flex flex-col items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
            <Leaf />
          </span>
          <b className="font-heading text-3xl">Savorly</b>
          <p className="text-sm text-muted-foreground">
            Finding a little inspiration…
          </p>
          <Skeleton className="h-1 w-40" />
        </div>
      </div>
    )
  }

  return (
    <>
      {catalogQuery.isError && (
        <Alert
          variant="destructive"
          className="relative z-[5] flex flex-wrap items-center justify-center gap-3 rounded-none border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <AlertDescription className="text-current">
            Could not load the recipe catalogue from DummyJSON.{' '}
            {apiError(catalogQuery.error)} Check your connection and try again.
            Your local kitchen data still works.
          </AlertDescription>
          <Button
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => void catalogQuery.refetch()}>
            Retry
          </Button>
        </Alert>
      )}
      <Shell>
        {navigation.state !== 'idle' && (
          <div
            className="fixed inset-x-0 top-0 z-[80] h-1 animate-pulse bg-primary print:hidden"
            role="progressbar"
            aria-label="Loading page"
            aria-valuetext="Loading"
          />
        )}
        <Suspense
          fallback={
            <main className="mx-auto min-h-[55vh] max-w-7xl px-5 py-14 sm:px-8">
              <div
                className="h-64 animate-pulse rounded-2xl bg-muted"
                aria-label="Loading page"
              />
            </main>
          }>
          <Outlet />
        </Suspense>
      </Shell>
    </>
  )
}
