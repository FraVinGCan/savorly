import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore, type ToastItem } from '../../stores/toast'
import { cn } from 'cn'

const tones = {
  success: {
    icon: CheckCircle2,
    ring: 'ring-emerald-600/20 dark:ring-emerald-400/25',
    iconClass: 'text-emerald-700 dark:text-emerald-300',
  },
  error: {
    icon: AlertTriangle,
    ring: 'ring-destructive/25',
    iconClass: 'text-destructive',
  },
  info: {
    icon: Info,
    ring: 'ring-primary/20',
    iconClass: 'text-primary',
  },
} as const

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((state) => state.dismiss)
  useEffect(() => {
    // Each toast owns its timer so unmounting the viewport clears them all.
    const timer = window.setTimeout(() => dismiss(toast.id), 3800)
    return () => window.clearTimeout(timer)
  }, [toast.id, dismiss])
  const tone = tones[toast.tone]
  const Icon = tone.icon
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-card p-3.5 text-sm text-card-foreground shadow-xl ring-1',
        tone.ring,
      )}
      role={toast.tone === 'error' ? 'alert' : 'status'}>
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', tone.iconClass)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => dismiss(toast.id)}>
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts)
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[110] flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      aria-label="Notifications"
      aria-live="polite">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  )
}
