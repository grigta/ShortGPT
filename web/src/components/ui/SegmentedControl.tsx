import { motion } from 'framer-motion'
import { useId } from 'react'
import { cn } from '../../lib/cn'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const layoutId = useId()
  return (
    <div
      role="radiogroup"
      className={cn('inline-flex rounded-sm border border-line bg-ink-800 p-0.5', className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            'relative h-8 rounded-[6px] px-3.5 text-[13px] whitespace-nowrap transition-colors duration-120 select-none',
            'disabled:pointer-events-none disabled:opacity-40',
            value === opt.value ? 'text-text-hi' : 'text-text-mid hover:text-text-hi',
          )}
        >
          {value === opt.value && (
            <motion.span
              layoutId={layoutId}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="absolute inset-0 rounded-[6px] bg-ink-700 shadow-card"
            />
          )}
          <span className="relative">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
