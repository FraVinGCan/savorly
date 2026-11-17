export const STORAGE_KEYS = {
  theme: 'savorly.theme',
  profile: 'savorly.profile.v1',
  cookbook: 'savorly.cookbook.v1',
  pantry: 'savorly.pantry.v1',
  planner: 'savorly.planner.v1',
  creations: 'savorly.creations.v1',
  compare: 'savorly.compare.v1',
} as const

export const DATA_KEYS = [
  STORAGE_KEYS.profile,
  STORAGE_KEYS.cookbook,
  STORAGE_KEYS.pantry,
  STORAGE_KEYS.planner,
  STORAGE_KEYS.creations,
  STORAGE_KEYS.compare,
] as const

export const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS)

/** The bootstrap script in index.html reads the theme as an unquoted value. */
export const THEME_KEY = STORAGE_KEYS.theme

export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Private-mode browsers can throw on access; a missing value is a default.
    return null
  }
}

export function readJson(key: string): unknown {
  const raw = readRaw(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

/**
 * Bytes as the browser stores them (UTF-16), so the profile's usage panel
 * reflects the real quota pressure rather than the JSON character count.
 */
export function storageBytes(key: string): number {
  return (readRaw(key)?.length ?? 0) * 2
}

export function clearStorageKeys(keys: readonly string[]) {
  for (const key of keys) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Nothing to clear if storage is unavailable.
    }
  }
}

export function readDataKeys(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of ALL_STORAGE_KEYS) out[key] = readJson(key)
  return out
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** Reads the `state` slice of a zustand persist payload. */
export function persistedState(value: unknown): unknown {
  return isRecord(value) ? value.state : undefined
}
