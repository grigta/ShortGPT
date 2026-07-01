import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-8 py-14 text-center',
        className,
      )}
    >
      {icon && <div className="mb-4 text-text-low">{icon}</div>}
      <p className="text-[15px] font-medium text-text-mid">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-[13px] text-text-low">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
