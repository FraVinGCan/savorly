import type { ReactNode } from 'react'
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cn } from 'cn'

export interface TabItem<T extends string> {
  value: T
  label: string
  count?: number
  content: ReactNode
}

interface TabGroupProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onValueChange: (value: T) => void
  label: string
  className?: string
}

/**
 * Base UI's tabs own roving focus and arrow-key activation. We provide the
 * visual strip, optional counts and the panels.
 */
export function TabGroup<T extends string>({
  items,
  value,
  onValueChange,
  label,
  className,
}: TabGroupProps<T>) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      className={className}>
      <TabsPrimitive.List
        aria-label={label}
        className="flex flex-wrap gap-2 border-b border-border pb-3">
        {items.map((item) => (
          <TabsPrimitive.Tab
            key={item.value}
            value={item.value}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[active]:border-primary data-[active]:bg-primary data-[active]:text-primary-foreground',
            )}>
            {item.label}
            {typeof item.count === 'number' && (
              <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {item.count}
              </span>
            )}
          </TabsPrimitive.Tab>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Panel
          key={item.value}
          value={item.value}
          className="mt-5 focus-visible:outline-none">
          {item.content}
        </TabsPrimitive.Panel>
      ))}
    </TabsPrimitive.Root>
  )
}
