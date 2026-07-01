import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('mx-auto px-8 py-10', wide ? 'max-w-7xl' : 'max-w-5xl')}>
      {children}
    </div>
  )
}
