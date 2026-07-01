import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-text-mid">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[12px] text-err">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-text-low">{hint}</span>
      ) : null}
    </label>
  )
}
