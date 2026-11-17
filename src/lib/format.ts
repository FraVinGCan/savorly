export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const titleCase = (value: string) =>
  value ? value[0]!.toUpperCase() + value.slice(1) : value

export const percent = (ratio: number) =>
  `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`

export const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0

export const median = (values: number[]) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/** Human label for the goal enum, shared by profile, onboarding and scoring. */
export const GOAL_LABELS = {
  balanced: 'Balanced',
  light: 'Light',
  comfort: 'Comfort',
  quick: 'Quick & easy',
} as const

export const SPICE_LABELS = {
  none: 'No heat',
  mild: 'Mild',
  medium: 'Medium',
  hot: 'Hot',
} as const
