export const STORAGE_KEYS = {
  theme: 'foodwiki.theme',
  profile: 'foodwiki.profile.v1',
  cookbook: 'foodwiki.cookbook.v1',
  pantry: 'foodwiki.pantry.v1',
  planner: 'foodwiki.planner.v1',
  creations: 'foodwiki.creations.v1',
  compare: 'foodwiki.compare.v1',
} as const
export const DATA_KEYS = Object.entries(STORAGE_KEYS)
  .filter(([key]) => key !== 'theme')
  .map(([, value]) => value)
