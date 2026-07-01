import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { VideoPlayer } from '../../components/ui/VideoPlayer'
import { prettifyStepLabel } from '../../lib/steps'
import { cn } from '../../lib/cn'
import type { JobState } from '../../stores/jobs'

/**
 * «Проявка»: кадр 9:16 проявляется по мере прохождения шагов —
 * зерно и blur спадают с прогрессом, поверх ходит янтарная scan-линия.
 * Готовый job флипается в настоящий видеоплеер.
 */
export function DevelopingFrame({ job }: { job: JobState }) {
  const progress = job.total_steps > 0 ? Math.min(1, job.step / job.total_steps) : 0
  const done = job.status === 'done' && !!job.video_url

  return (
    <div className="relative mx-auto w-full max-w-70">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="video"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* вспышка «проявилось» */}
            <motion.div
              aria-hidden
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 z-10 rounded-md bg-amber-400/60"
            />
            <VideoPlayer src={job.video_url!} vertical />
          </motion.div>
        ) : (
          <motion.div
            key="latent"
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.32 }}
            style={{ '--progress': progress } as CSSProperties}
            className={cn(
              'relative aspect-9/16 w-full overflow-hidden rounded-md border bg-ink-900 shadow-card',
              job.status === 'failed'
                ? 'border-err/60 shadow-glow-err'
                : job.status === 'running'
                  ? 'border-amber-500/40 shadow-[0_0_0_1px_rgba(246,166,35,.2),0_0_48px_rgba(246,166,35,.14)]'
                  : 'border-line',
            )}
          >
            {/* латентное изображение: проявляется с прогрессом */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 90% at 50% 30%, rgba(246,166,35,.28), rgba(246,166,35,.05) 55%, transparent 80%)',
                filter: 'blur(calc((1 - var(--progress)) * 24px))',
                opacity: 'calc(0.25 + var(--progress) * 0.75)',
                transition: 'filter .7s cubic-bezier(.22,1,.36,1), opacity .7s',
              }}
            />
            {/* локальное зерно: спадает от 0.6 до 0.03 */}
            <div
              aria-hidden
              className="noise absolute inset-0"
              style={{
                opacity: 'calc(0.6 - var(--progress) * 0.57)',
                transition: 'opacity .7s',
              }}
            />
            {/* scan-линия — только пока рендерится */}
            {job.status === 'running' && (
              <div
                aria-hidden
                className="animate-scanline absolute inset-x-0 top-0 h-[10%]"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent, rgba(246,166,35,.18), transparent)',
                }}
              />
            )}
            {/* счётчик шагов в центре кадра */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="text-display text-[56px] font-semibold text-text-hi tabular-nums">
                {job.status === 'queued' ? '—' : `${job.step}/${job.total_steps}`}
              </span>
              <span className="font-mono text-[12px] text-text-mid">
                {job.status === 'queued'
                  ? 'в очереди'
                  : job.status === 'failed'
                    ? 'ошибка рендера'
                    : job.status === 'cancelled'
                      ? 'отменено'
                      : prettifyStepLabel(job.step_label)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
