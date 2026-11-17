import type { ReactElement, ReactNode } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { cn } from 'cn'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  trigger?: ReactElement
  className?: string
}

/**
 * Base UI supplies the hard parts: Tab trapping, Escape and backdrop dismissal,
 * body scroll lock and focus restoration. We only style the surface.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger render={trigger} />}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[90] bg-foreground/35 backdrop-blur-[2px] transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Viewport className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto p-4">
          <DialogPrimitive.Popup
            className={cn(
              'relative w-full max-w-lg rounded-3xl bg-card p-6 text-card-foreground shadow-2xl ring-1 ring-foreground/10 transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
              className,
            )}>
            <DialogPrimitive.Title className="font-heading text-2xl">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            )}
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <X className="size-4" aria-hidden="true" />
            </DialogPrimitive.Close>
            <div className="mt-5 space-y-4">{children}</div>
            {footer && (
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                {footer}
              </div>
            )}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { DialogPrimitive }
