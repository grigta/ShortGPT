import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { prettifyStepLabel } from '../../lib/steps'
import { cn } from '../../lib/cn'
import type { JobState } from '../../stores/jobs'

/** Вертикальная таймлиния шагов, стилизованная под перфорацию киноплёнки. */
export function FilmstripTimeline({ job }: { job: JobState }) {
  if (job.total_steps <= 0) {
    return (
      <p className="font-mono text-[12px] text-text-low">
        {job.status === 'queued' ? 'Ожидает своей очереди…' : '…'}
      </p>
    )
  }

  const steps = Array.from({ length: job.total_steps }, (_, i) => i + 1)

  return (
    <ol className="relative flex flex-col gap-1">
      {/* рельса плёнки */}
      <span aria-hidden className="absolute top-2 bottom-2 left-[7px] w-px bg-line" />
      {steps.map((n) => {
        const passed = n < job.step || job.status === 'done'
        const current = n === job.step && job.status === 'running'
        const label = job.step_labels[n] ? prettifyStepLabel(job.step_labels[n]) : `Шаг ${n}`
        return (
          <li key={n} className="relative flex items-center gap-3 py-1 pl-0">
            {/* перфорация */}
            <span
              className={cn(
                'z-10 flex h-4 w-[15px] shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-700',
                passed
                  ? 'border-amber-500/60 bg-amber-500/20 text-amber-400'
                  : current
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-line bg-ink-900',
              )}
            >
              {passed && <Check size={9} strokeWidth={3} />}
              {current && (
                <motion.span
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="size-1.5 rounded-full bg-amber-500"
                />
              )}
            </span>
            <motion.span
              initial={passed || current ? { opacity: 0, x: -6 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                'truncate text-[12.5px]',
                current
                  ? 'font-medium text-text-hi'
                  : passed
                    ? 'text-text-mid'
                    : 'text-text-low/60',
              )}
            >
              {passed || current ? label : '·'}
            </motion.span>
          </li>
        )
      })}
    </ol>
  )
}
