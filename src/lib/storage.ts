export const STORAGE_KEYS = {
  theme: 'savorly.theme',
  profile: 'savorly.profile.v1',
  cookbook: 'savorly.cookbook.v1',
  pantry: 'savorly.pantry.v1',
  planner: 'savorly.planner.v1',
  creations: 'savorly.creations.v1',
  compare: 'savorly.compare.v1',
} as const
export const DATA_KEYS = Object.entries(STORAGE_KEYS)
  .filter(([key]) => key !== 'theme')
  .map(([, value]) => value)
