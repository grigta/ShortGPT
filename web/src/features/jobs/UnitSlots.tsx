import { Check, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import type { JobState } from '../../stores/jobs'

interface UnitSlotsProps {
  jobs: JobState[]
  shownId: string
  onPick: (id: string) => void
  labels?: string[]
}

/** Ряд слотов-миниатюр под кадром: по слоту на ролик/язык группы. */
export function UnitSlots({ jobs, shownId, onPick, labels }: UnitSlotsProps) {
  if (jobs.length <= 1) return null
  return (
    <div className="mt-5 flex justify-center gap-2.5">
      {jobs.map((job, i) => (
        <button
          key={job.id}
          type="button"
          onClick={() => onPick(job.id)}
          title={labels?.[i] ?? `Дубль ${i + 1}`}
          className={cn(
            'relative flex aspect-9/16 w-11 items-center justify-center overflow-hidden rounded-[6px] border transition-all duration-120',
            job.id === shownId
              ? 'border-amber-500/70 shadow-glow'
              : 'border-line hover:border-line-strong',
            job.status === 'failed' && 'border-err/50',
          )}
        >
          {job.status === 'done' && job.video_url ? (
            <video src={job.video_url} preload="metadata" muted className="size-full object-cover" />
          ) : job.status === 'running' ? (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="size-1.5 rounded-full bg-amber-500"
            />
          ) : job.status === 'failed' ? (
            <X size={13} className="text-err" />
          ) : job.status === 'cancelled' ? (
            <X size={13} className="text-text-low" />
          ) : (
            <span className="size-1.5 rounded-full bg-text-low/40" />
          )}
          {job.status === 'done' && (
            <span className="absolute right-0.5 bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-ok/90 text-ink-950">
              <Check size={9} strokeWidth={3.5} />
            </span>
          )}
          <span className="absolute top-0.5 left-1 font-mono text-[9px] text-text-mid">
            {labels?.[i] ?? i + 1}
          </span>
        </button>
      ))}
    </div>
  )
}
