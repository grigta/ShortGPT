import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'neutral' | 'amber' | 'ok' | 'err' | 'info'

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-700 text-text-mid',
  amber: 'bg-amber-500/15 text-amber-400',
  ok: 'bg-ok/15 text-ok',
  err: 'bg-err/15 text-err',
  info: 'bg-info/15 text-info',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
