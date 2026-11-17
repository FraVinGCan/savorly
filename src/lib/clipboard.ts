/**
 * Clipboard access can fail (insecure origin, denied permission, embedded
 * webview). Return a boolean rather than swallowing the failure so every
 * caller can report success and failure separately.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Last-resort manual copy when the async clipboard API is unavailable. */
export function promptCopy(text: string, label: string) {
  window.prompt(label, text)
}
