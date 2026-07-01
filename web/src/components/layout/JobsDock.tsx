import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { useJobsStore, selectActiveJobs } from '../../stores/jobs'
import { TallyDot } from '../ui/TallyDot'

const KIND_LABEL: Record<string, string> = {
  short: 'Shorts',
  video: 'Видео',
  translation: 'Перевод',
}

/** Плавающая капсула очереди рендеров — видна на всех экранах, пока есть активные job'ы. */
export function JobsDock() {
  const active = useJobsStore(useShallow(selectActiveJobs))
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // На самой сцене прогресса док избыточен
  if (location.pathname.startsWith('/jobs/') || active.length === 0) return null

  const current = active.find((j) => j.status === 'running') ?? active[0]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="fixed right-5 bottom-5 z-40 w-80 overflow-hidden rounded-lg border border-line bg-ink-900/95 shadow-card backdrop-blur"
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <TallyDot status={current.status} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-text-hi">
              {current.status === 'running'
                ? `Рендер ${current.step}/${current.total_steps}`
                : 'В очереди'}
              {active.length > 1 && ` · ещё ${active.length - 1}`}
            </span>
            <span className="block truncate font-mono text-[11px] text-text-mid">
              {current.step_label || KIND_LABEL[current.kind]}
            </span>
          </span>
          {expanded ? (
            <ChevronDown size={14} className="text-text-low" />
          ) : (
            <ChevronUp size={14} className="text-text-low" />
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.ul
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-line"
            >
              {active.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/jobs/${job.group_id ?? job.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-120 hover:bg-ink-800"
                  >
                    <TallyDot status={job.status} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] text-text-hi">
                        {KIND_LABEL[job.kind]}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-text-low">
                        {job.status === 'running'
                          ? `${job.step}/${job.total_steps} · ${job.step_label}`
                          : 'в очереди'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
