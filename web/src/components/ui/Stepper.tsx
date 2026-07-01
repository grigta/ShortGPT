import { Minus, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
}

export function Stepper({ value, onChange, min = 1, max = 10, className }: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center rounded-sm border border-line bg-ink-800',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Меньше"
        disabled={value <= min}
        onClick={() => set(value - 1)}
        className="flex h-full w-9 items-center justify-center text-text-mid transition-colors duration-120 hover:text-text-hi disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus size={14} />
      </button>
      <span className="w-10 text-center font-mono text-[14px] text-text-hi tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Больше"
        disabled={value >= max}
        onClick={() => set(value + 1)}
        className="flex h-full w-9 items-center justify-center text-text-mid transition-colors duration-120 hover:text-text-hi disabled:pointer-events-none disabled:opacity-30"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
