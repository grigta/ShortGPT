import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Download, OctagonX, SettingsIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { TallyDot } from '../../components/ui/TallyDot'
import { toast } from '../../components/ui/Toast'
import { useJobGroup } from '../../hooks/useJobGroup'
import { jobsApi } from '../../lib/api/jobs'
import type { JobStatus } from '../../lib/api/types'
import { DevelopingFrame } from './DevelopingFrame'
import { FilmstripTimeline } from './FilmstripTimeline'
import { LiveLog } from './LiveLog'
import { UnitSlots } from './UnitSlots'

const KIND_TITLE: Record<string, string> = {
  short: 'SHORTS',
  video: 'ВИДЕО',
  translation: 'ПЕРЕВОД',
}

function groupStatus(statuses: JobStatus[]): JobStatus {
  if (statuses.includes('running')) return 'running'
  if (statuses.includes('queued')) return 'queued'
  if (statuses.includes('failed')) return 'failed'
  if (statuses.every((s) => s === 'cancelled')) return 'cancelled'
  return 'done'
}

function useElapsed(sinceIso: string | undefined, active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  if (!sinceIso) return ''
  const sec = Math.max(0, Math.floor((now - new Date(sinceIso).getTime()) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function JobScenePage() {
  const { groupId = '' } = useParams()
  const jobs = useJobGroup(groupId)
  const [pinned, setPinned] = useState<string | null>(null)

  const status = groupStatus(jobs.map((j) => j.status))
  const active = status === 'running' || status === 'queued'

  const shown = useMemo(() => {
    const byPin = pinned && jobs.find((j) => j.id === pinned)
    if (byPin) return byPin
    return (
      jobs.find((j) => j.status === 'running') ??
      jobs.find((j) => j.status === 'queued') ??
      jobs.find((j) => j.status === 'failed') ??
      jobs[jobs.length - 1]
    )
  }, [jobs, pinned])

  const elapsed = useElapsed(jobs[0]?.created_at, active)
  const doneCount = jobs.filter((j) => j.status === 'done').length
  const shownIndex = shown ? jobs.indexOf(shown) : 0

  const cancelAll = async () => {
    const targets = jobs.filter((j) => j.status === 'running' || j.status === 'queued')
    try {
      await Promise.all(targets.map((j) => jobsApi.cancel(j.id)))
      toast.ok('Отмена: очередь остановлена, текущий шаг доработает')
    } catch (e) {
      toast.err(e instanceof Error ? e.message : 'Не удалось отменить')
    }
  }

  if (!shown) {
    return (
      <div className="mx-auto max-w-6xl px-8 py-10">
        <p className="font-mono text-[13px] text-text-low">
          Задача не найдена — возможно, сервер перезапускался.{' '}
          <Link to="/" className="text-amber-400 hover:underline">
            В студию
          </Link>
        </p>
      </div>
    )
  }

  const keyError = /key|ключ|api/i.test(shown.error ?? '')

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col px-8 py-8">
      {/* Шапка сцены */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex items-center gap-4"
      >
        <Link
          to="/"
          className="rounded-sm p-1.5 text-text-low transition-colors duration-120 hover:bg-ink-900 hover:text-text-hi"
          title="В студию"
        >
          <ArrowLeft size={17} />
        </Link>
        <TallyDot status={status} className="size-2.5" />
        <h1 className="text-display text-[20px] font-semibold tracking-wide">
          {status === 'done'
            ? 'ГОТОВО'
            : status === 'failed'
              ? 'ОШИБКА'
              : status === 'cancelled'
                ? 'ОТМЕНЕНО'
                : `РЕНДЕР · ${KIND_TITLE[shown.kind] ?? ''}`}
          {jobs.length > 1 && (
            <span className="ml-3 text-[14px] font-normal text-text-mid">
              дубль {shownIndex + 1} из {jobs.length}
              {doneCount > 0 && ` · готово ${doneCount}`}
            </span>
          )}
        </h1>
        <div className="ml-auto flex items-center gap-3">
          {active && (
            <>
              <span className="font-mono text-[13px] text-text-mid tabular-nums">{elapsed}</span>
              <Button
                variant="ghost"
                size="sm"
                icon={<OctagonX size={14} />}
                onClick={cancelAll}
                title="Текущий шаг доработает до конца"
              >
                Отменить
              </Button>
            </>
          )}
        </div>
      </motion.header>

      {/* Сцена: плёнка | кадр | журнал */}
      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_320px] gap-8">
        <motion.aside
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.32, delay: 0.06 }}
          className="overflow-y-auto"
        >
          <FilmstripTimeline job={shown} />
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex min-h-0 flex-col items-center justify-center"
        >
          <DevelopingFrame job={shown} />
          <AnimatePresence>
            {shown.status === 'done' && shown.video_url && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mt-5 flex flex-col items-center gap-3"
              >
                <p className="text-display text-[15px] tracking-widest text-amber-400">
                  ДУБЛЬ {shownIndex + 1} ГОТОВ
                </p>
                <a href={shown.video_url} download>
                  <Button variant="primary" icon={<Download size={15} />}>
                    Скачать видео
                  </Button>
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          {shown.status === 'failed' && (
            <div className="mt-5 w-full max-w-md rounded-md border border-err/30 bg-err/5 p-4">
              <p className="text-[13px] leading-relaxed text-err">{shown.error}</p>
              <div className="mt-3 flex gap-2.5">
                {keyError && (
                  <Link to="/settings">
                    <Button size="sm" icon={<SettingsIcon size={13} />}>
                      К настройкам
                    </Button>
                  </Link>
                )}
                <Link to="/">
                  <Button size="sm" variant="ghost">
                    В студию
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <UnitSlots jobs={jobs} shownId={shown.id} onPick={setPinned} />
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.32, delay: 0.06 }}
          className="min-h-0"
        >
          <LiveLog lines={shown.log} />
        </motion.aside>
      </div>
    </div>
  )
}
