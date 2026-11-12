import { Suspense, useEffect, useMemo } from 'react'
import { Outlet, useNavigation } from 'react-router'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { Leaf } from 'lucide-react'
import { apiError, fetchRecipes, fetchTags } from './lib/api'
import { useKitchenStore } from './stores/kitchen'
import { useProfileStore } from './stores/profile'
import { useThemeStore } from './stores/theme'
import { Shell } from './components/app-shared'
import { Alert, AlertDescription } from './components/ui/alert'
import { Button } from './components/ui/button'
import { Skeleton } from './components/ui/skeleton'

export default function App() {
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (!event.key?.startsWith('foodwiki.')) return
      void useKitchenStore.persist.rehydrate()
      void useProfileStore.persist.rehydrate()
      void useThemeStore.persist.rehydrate()
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const navigation = useNavigation()

  const catalogQuery = useQuery(
    queryOptions({
      queryKey: ['catalog'],
      queryFn: ({ signal }) => fetchRecipes(signal),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    }),
  )
  useQuery(
    queryOptions({
      queryKey: ['tags'],
      queryFn: ({ signal }) => fetchTags(signal),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    }),
  )

  const creations = useKitchenStore((state) => state.creations)
  const apiCatalog = useMemo(
    () =>
      catalogQuery.data?.recipes.map((recipe) => ({
        id: `api-${recipe.id}` as const,
        source: 'api' as const,
        recipe,
      })) ?? [],
    [catalogQuery.data?.recipes],
  )
  const catalog = useMemo(
    () => [
      ...creations.map((creation) => ({
        id: creation.catalogId,
        source: 'mine' as const,
        recipe: creation.recipe,
      })),
      ...apiCatalog,
    ],
    [apiCatalog, creations],
  )

  if (catalogQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
        <div className="flex flex-col items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
            <Leaf />
          </span>
          <b className="font-heading text-3xl">foodwiki</b>
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
          className="relative z-[5] flex items-center justify-center gap-3 rounded-none border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <AlertDescription className="text-current">
            Could not load the recipe catalogue from DummyJSON.{' '}
            {apiError(catalogQuery.error)}
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
            className="fixed inset-x-0 top-0 z-[80] h-1 animate-pulse bg-primary"
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
          <Outlet context={catalog} />
        </Suspense>
      </Shell>
    </>
  )
}
