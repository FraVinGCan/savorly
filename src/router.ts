import { createBrowserRouter } from 'react-router'
import App from './App'
import Home from './pages/HomePage'
import Browse from './pages/BrowsePage'
import RouteErrorPage from './pages/RouteErrorPage'

export const router = createBrowserRouter([
  {
    id: 'root',
    path: '/',
    Component: App,
    ErrorBoundary: RouteErrorPage,
    handle: { title: 'Savorly', hideInBreadcrumbs: true },
    children: [
      {
        index: true,
        Component: Home,
        handle: { title: 'Home', breadcrumb: 'Home' },
      },
      {
        path: 'recipes',
        Component: Browse,
        handle: { title: 'Recipes', breadcrumb: 'Recipes' },
      },
      {
        path: 'recipes/:id',
        lazy: async () => ({
          Component: (await import('./pages/RecipeDetailPage')).default,
        }),
        handle: {
          title: 'Recipe',
          breadcrumb: 'Recipe',
        },
      },
      {
        path: 'foryou',
        lazy: async () => ({
          Component: (await import('./pages/ForYouPage')).default,
        }),
        handle: { title: 'For you', breadcrumb: 'For you' },
      },
      {
        path: 'pantry',
        lazy: async () => ({
          Component: (await import('./pages/PantryPage')).default,
        }),
        handle: { title: 'Pantry', breadcrumb: 'Pantry' },
      },
      {
        path: 'planner',
        lazy: async () => ({
          Component: (await import('./pages/PlannerPage')).default,
        }),
        handle: { title: 'Planner', breadcrumb: 'Planner' },
      },
      {
        path: 'cookbook',
        lazy: async () => ({
          Component: (await import('./pages/CookbookPage')).default,
        }),
        handle: { title: 'Cookbook', breadcrumb: 'Cookbook' },
      },
      {
        path: 'compare',
        lazy: async () => ({
          Component: (await import('./pages/ComparePage')).default,
        }),
        handle: { title: 'Compare', breadcrumb: 'Compare' },
      },
      {
        path: 'insights',
        lazy: async () => ({
          Component: (await import('./pages/InsightsPage')).default,
        }),
        handle: { title: 'Insights', breadcrumb: 'Insights' },
      },
      {
        path: 'profile',
        lazy: async () => ({
          Component: (await import('./pages/ProfilePage')).default,
        }),
        handle: { title: 'Profile', breadcrumb: 'Profile' },
      },
      {
        path: 'onboarding',
        lazy: async () => ({
          Component: (await import('./pages/OnboardingPage')).default,
        }),
        handle: { title: 'Onboarding', breadcrumb: 'Onboarding' },
      },
      {
        path: 'creations/new',
        lazy: async () => ({
          Component: (await import('./pages/RecipeCreatorPage')).default,
        }),
        handle: { title: 'New recipe', breadcrumb: 'New recipe' },
      },
      {
        path: 'creations/:id/edit',
        lazy: async () => ({
          Component: (await import('./pages/RecipeCreatorPage')).default,
        }),
        handle: { title: 'Edit recipe', breadcrumb: 'Edit recipe' },
      },
      {
        path: 'about',
        lazy: async () => ({
          Component: (await import('./pages/AboutPage')).default,
        }),
        handle: { title: 'About', breadcrumb: 'About' },
      },
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('./pages/NotFoundPage')).default,
        }),
      },
    ],
  },
])
