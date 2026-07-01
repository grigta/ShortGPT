import type { JobStatus } from '../../lib/api/types'
import { cn } from '../../lib/cn'

const COLORS: Record<JobStatus, string> = {
  running: 'text-amber-500 bg-amber-500',
  queued: 'text-text-low bg-text-low',
  done: 'text-ok bg-ok',
  failed: 'text-err bg-err',
  cancelled: 'text-text-low bg-text-low',
}

interface TallyDotProps {
  status: JobStatus
  className?: string
}

/** Tally-индикатор статуса: янтарный пульс = рендерится, зелёный = готово, красный = ошибка. */
export function TallyDot({ status, className }: TallyDotProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        COLORS[status],
        status === 'running' && 'animate-tally',
        className,
      )}
    />
  )
}
