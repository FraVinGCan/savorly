import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Check, ChevronDown, Copy, Star } from 'lucide-react'
import { cn } from 'cn'
import { Button } from './ui/button'
import { buttonVariants, type ButtonVariantProps } from './ui/button-variants'
import { Dialog } from './ui/dialog'
import { scoreTier } from '../domain/scoring'

export type BadgeTone = 'neutral' | 'brand' | 'sage' | 'amber' | 'red' | 'dark'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'border-border bg-muted text-foreground',
  brand: 'border-transparent bg-primary text-primary-foreground',
  sage: 'border-transparent bg-secondary text-secondary-foreground',
  amber:
    'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
  red: 'border-destructive/25 bg-destructive/10 text-destructive',
  dark: 'border-transparent bg-foreground text-background',
}

export function Badge({
  tone = 'neutral',
  glyph,
  icon,
  children,
  className,
}: {
  tone?: BadgeTone
  glyph?: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
        badgeTones[tone],
        className,
      )}>
      {glyph && <span aria-hidden="true">{glyph}</span>}
      {icon}
      {children}
    </span>
  )
}

export function Chip({
  active,
  onClick,
  children,
  className,
  count,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  count?: number
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}>
      {children}
      {typeof count === 'number' && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
            active ? 'bg-primary-foreground/20' : 'bg-foreground/10',
          )}>
          {count}
        </span>
      )}
    </button>
  )
}

/** An accordion panel whose header opens and closes its whole content group. */
export function AccordionSection({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string
  /** Active-filter count shown in the header while the panel is closed. */
  badge?: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 rounded text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex items-center gap-2">
          {title}
          {typeof badge === 'number' && badge > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground tabular-nums">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={cn('shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      <div id={id} hidden={!open} className="mt-2 flex flex-wrap gap-2">
        {children}
      </div>
    </section>
  )
}

type ButtonLinkProps = ButtonVariantProps & {
  className?: string
  children?: ReactNode
  /** In-app destination. Mutually exclusive with `href`. */
  to?: string
  /** Plain anchor destination for full reloads and in-page hashes. */
  href?: string
} & Omit<ComponentProps<'a'>, 'href' | 'className' | 'children'>

/**
 * Button-styled navigation. Base UI's Button enforces button semantics, so a
 * link that should look like a button is styled with `buttonVariants` instead
 * of being rendered through Button's `render` prop.
 */
export function ButtonLink({
  variant,
  size,
  className,
  children,
  to,
  href,
  ...props
}: ButtonLinkProps) {
  const classes = cn(buttonVariants({ variant, size, className }))
  if (to) {
    return (
      <Link to={to} data-slot="button" className={classes} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} data-slot="button" className={classes} {...props}>
      {children}
    </a>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  sub?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-5 flex flex-wrap items-end justify-between gap-4',
        className,
      )}>
      <div>
        {eyebrow && (
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary"
            />
            {eyebrow}
          </div>
        )}
        <h2 className="font-heading text-2xl sm:text-3xl">{title}</h2>
        {sub && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {sub}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

export function Stat({
  icon,
  value,
  label,
  hint,
  href,
}: {
  icon?: ReactNode
  value: ReactNode
  label: string
  hint?: string
  href?: string
}) {
  const body = (
    <>
      {icon && (
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          {icon}
        </span>
      )}
      <span className="min-w-0">
        <b className="block text-xl leading-tight">{value}</b>
        <small className="block text-xs text-muted-foreground">{label}</small>
        {hint && (
          <small className="mt-1 block text-[11px] leading-4 text-muted-foreground">
            {hint}
          </small>
        )}
      </span>
    </>
  )
  const classes =
    'flex h-full w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-none ring-1 ring-border/60'
  if (href)
    return (
      <a
        href={href}
        className={cn(
          classes,
          'transition-transform hover:-translate-y-0.5 hover:shadow-md',
        )}>
        {body}
      </a>
    )
  return <div className={classes}>{body}</div>
}

export function EmptyState({
  glyph,
  title,
  body,
  actions,
  className,
}: {
  glyph?: string
  title: string
  body?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card px-6 py-10 text-center',
        className,
      )}>
      {glyph && (
        <span className="text-3xl" aria-hidden="true">
          {glyph}
        </span>
      )}
      <h3 className="font-heading text-2xl">{title}</h3>
      {body && (
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          {body}
        </p>
      )}
      {actions && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}

const ringTone = (score: number) =>
  score >= 75
    ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 60
      ? 'text-primary'
      : score >= 45
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground'

export function ScoreRing({
  score,
  eligible = true,
  size = 92,
  label = 'Match score',
}: {
  score: number
  eligible?: boolean
  size?: number
  label?: string
}) {
  if (!eligible)
    return (
      <Badge tone="red" className="px-3 py-1.5 text-xs">
        Off-menu
      </Badge>
    )
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference
  return (
    <div
      className={cn('relative shrink-0', ringTone(score))}
      style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={`${label}: ${score} out of 100`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="opacity-15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span className="text-center leading-none">
          <b className="block font-heading text-2xl text-foreground">{score}</b>
          <small className="mt-0.5 block text-[9px] uppercase tracking-wider text-muted-foreground">
            match
          </small>
        </span>
      </span>
    </div>
  )
}

export function ScorePill({
  score,
  eligible = true,
}: {
  score: number
  eligible?: boolean
}) {
  if (!eligible)
    return (
      <Badge tone="red" className="text-[10px]">
        Off-menu
      </Badge>
    )
  return (
    <Badge tone={score >= 60 ? 'brand' : 'neutral'} className="text-[10px]">
      {score} · {scoreTier(score)}
    </Badge>
  )
}

export function Rating({
  value,
  onChange,
  className,
  label = 'Your rating',
}: {
  value: number
  onChange?: (value: number) => void
  className?: string
  label?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value
  const stars = [1, 2, 3, 4, 5]
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role={onChange ? 'radiogroup' : 'img'}
      aria-label={onChange ? label : `${label}: ${value} of 5`}>
      {stars.map((star) => {
        const fill = Math.min(1, Math.max(0, shown - star + 1))
        const content = (
          <span className="relative inline-block size-5">
            <Star
              className="absolute inset-0 size-5 text-muted-foreground/40"
              aria-hidden="true"
            />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
              aria-hidden="true">
              <Star className="size-5 fill-amber-500 text-amber-500" />
            </span>
          </span>
        )
        return onChange ? (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            className="rounded focus-visible:ring-2 focus-visible:ring-ring"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(null)}
            onClick={() => onChange(star)}>
            {content}
          </button>
        ) : (
          <span key={star}>{content}</span>
        )
      })}
    </span>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  children?: ReactNode
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}>
            {confirmLabel}
          </Button>
        </>
      }>
      {children}
    </Dialog>
  )
}

/** Accessible replacement for the old `window.prompt` copy fallback. */
export function CopyFallbackDialog({
  open,
  onOpenChange,
  value,
  title = 'Copy this link',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  title?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setCopied(false)
        onOpenChange(next)
      }}
      title={title}
      description="Your browser blocked automatic copying. Select the link below and copy it manually."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => void copy()}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Try copy'}
          </Button>
        </>
      }>
      <input
        readOnly
        autoFocus
        value={value}
        aria-label="Link to copy"
        className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-xs"
        onFocus={(event) => event.currentTarget.select()}
      />
    </Dialog>
  )
}
