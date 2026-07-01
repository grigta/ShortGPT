import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'gradient-amber btn-shine text-amber-ink font-semibold shadow-[0_6px_24px_rgba(246,166,35,.22)] hover:shadow-glow active:scale-[.98] disabled:hover:shadow-none',
  secondary:
    'glass text-text-hi hover:border-line-strong hover:bg-ink-700/70 active:scale-[.98]',
  ghost: 'text-text-mid hover:bg-ink-800/70 hover:text-text-hi active:scale-[.98]',
  danger:
    'bg-err/10 text-err border border-err/30 hover:bg-err/20 hover:border-err/50 active:scale-[.98]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-sm',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-sm',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-md',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap transition-all duration-120 select-none',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
