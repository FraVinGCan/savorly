import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Check } from 'lucide-react'
import { cn } from 'cn'

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
}: {
  value: number
  max?: number
  label?: string
  className?: string
}) {
  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      aria-label={label}
      className={cn('w-full', className)}>
      <ProgressPrimitive.Track className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <ProgressPrimitive.Indicator className="block h-full rounded-full bg-primary transition-[width] duration-300" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  className,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  className?: string
  disabled?: boolean
}) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-md border border-border bg-background transition-colors focus-visible:ring-2 focus-visible:ring-ring data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground',
        className,
      )}>
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5" aria-hidden="true" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
