import * as React from 'react'
import { cn } from 'cn'
import { ChevronDownIcon } from 'lucide-react'

type NativeSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  size?: 'sm' | 'default'
}

function NativeSelect({
  className,
  size = 'default',
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn(
        // The wrapper is the visual surface. The native select is transparent
        // and fills it, so caller overrides (height, radius, background) can't
        // leave a second coloured band behind the control.
        'group/native-select relative inline-flex h-9 w-fit items-center rounded-3xl border border-transparent bg-input/50 text-sm transition-[color,box-shadow,background-color] outline-none has-[select:disabled]:opacity-50 has-[select:focus-visible]:border-ring has-[select:focus-visible]:ring-3 has-[select:focus-visible]:ring-ring/30 has-[select[aria-invalid=true]]:border-destructive has-[select[aria-invalid=true]]:ring-3 has-[select[aria-invalid=true]]:ring-destructive/20 data-[size=sm]:h-8 dark:has-[select[aria-invalid=true]]:border-destructive/50 dark:has-[select[aria-invalid=true]]:ring-destructive/40',
        className,
      )}
      data-slot="native-select-wrapper"
      data-size={size}>
      <select
        data-slot="native-select"
        data-size={size}
        className="h-full w-full min-w-0 appearance-none rounded-[inherit] border-0 bg-transparent py-0 pr-8 pl-3 text-sm text-foreground outline-none select-none disabled:pointer-events-none disabled:cursor-not-allowed"
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<'option'>) {
  return (
    <option
      data-slot="native-select-option"
      className={cn('bg-[Canvas] text-[CanvasText]', className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<'optgroup'>) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn('bg-[Canvas] text-[CanvasText]', className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
