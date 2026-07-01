import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface RadioCardOption<T extends string> {
  value: T
  title: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
}

interface RadioCardGroupProps<T extends string> {
  options: RadioCardOption<T>[]
  value: T | null
  onChange: (value: T) => void
  columns?: 2 | 3
  className?: string
}

export function RadioCardGroup<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
  className,
}: RadioCardGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn('grid gap-2.5', columns === 2 ? 'grid-cols-2' : 'grid-cols-3', className)}
    >
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'group rounded-md border p-4 text-left transition-all duration-120 select-none',
              'disabled:pointer-events-none disabled:opacity-40',
              active
                ? 'border-amber-500/50 bg-ink-800 shadow-glow'
                : 'border-line bg-ink-900 hover:border-line-strong hover:bg-ink-800',
            )}
          >
            <span className="flex items-center gap-2.5">
              {opt.icon && (
                <span className={cn('shrink-0', active ? 'text-amber-400' : 'text-text-mid')}>
                  {opt.icon}
                </span>
              )}
              <span
                className={cn(
                  'text-[14px] font-medium',
                  active ? 'text-text-hi' : 'text-text-mid group-hover:text-text-hi',
                )}
              >
                {opt.title}
              </span>
            </span>
            {opt.description && (
              <span className="mt-1.5 block text-[12px] leading-relaxed text-text-low">
                {opt.description}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
