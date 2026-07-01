import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Clapperboard,
  Download,
  Film,
  Languages,
  Smartphone,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { Page } from '../../components/layout/Page'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { TallyDot } from '../../components/ui/TallyDot'
import { VideoPlayer } from '../../components/ui/VideoPlayer'
import { videosApi } from '../../lib/api/videos'
import { prettifyStepLabel } from '../../lib/steps'
import type { VideoFile } from '../../lib/api/types'
import { selectActiveJobs, useJobsStore } from '../../stores/jobs'

const KIND_LABEL: Record<string, string> = {
  short: 'Shorts',
  video: 'Видео из стоков',
  translation: 'Перевод',
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-4 font-mono text-[12px] tracking-widest text-text-low uppercase">
      {children}
    </h2>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const active = useJobsStore(useShallow(selectActiveJobs))
  const { data: videos } = useQuery({ queryKey: ['videos'], queryFn: videosApi.list })
  const [lightbox, setLightbox] = useState<VideoFile | null>(null)

  // активные группы: по карточке на group_id
  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof active>()
    for (const j of active) {
      const key = j.group_id ?? j.id
      byGroup.set(key, [...(byGroup.get(key) ?? []), j])
    }
    return [...byGroup.entries()]
  }, [active])

  return (
    <Page wide>
      {/* Хиро-фон: «жидкий обсидиан» (nano-banana), гаснет книзу */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] overflow-hidden">
        <img
          src="/bg-liquid.webp"
          alt=""
          className="size-full object-cover opacity-55"
          style={{
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,.95) 20%, transparent 92%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,.95) 20%, transparent 92%)',
          }}
        />
      </div>
      <PageHeader eyebrow="shortgpt studio" title="Студия" subtitle="Что в работе и что уже отснято" />

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="space-y-12 pb-16"
      >
        {groups.length > 0 && (
          <motion.section variants={item}>
            <SectionTitle>Сейчас в работе</SectionTitle>
            <div className="space-y-2.5">
              {groups.map(([groupId, jobs]) => {
                const running = jobs.find((j) => j.status === 'running') ?? jobs[0]
                const done = jobs.filter((j) => j.status === 'done').length
                return (
                  <button
                    key={groupId}
                    type="button"
                    onClick={() => navigate(`/jobs/${groupId}`)}
                    className="glass flex w-full items-center gap-4 rounded-md px-5 py-4 text-left transition-all duration-120 hover:border-amber-500/30"
                  >
                    <TallyDot status={running.status} className="size-2.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] text-text-hi">
                        {KIND_LABEL[running.kind]}
                        {jobs.length > 1 && (
                          <span className="text-text-low"> · {done}/{jobs.length} готово</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[12px] text-text-mid">
                        {running.status === 'running'
                          ? `${running.step}/${running.total_steps} · ${prettifyStepLabel(running.step_label)}`
                          : 'в очереди'}
                      </p>
                    </div>
                    {/* мини-таймлайн */}
                    {running.total_steps > 0 && (
                      <div className="hidden w-40 shrink-0 sm:block">
                        <div className="h-1 overflow-hidden rounded-full bg-ink-700">
                          <div
                            className="gradient-amber h-full rounded-full transition-[width] duration-700"
                            style={{ width: `${(running.step / running.total_steps) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <ArrowRight size={15} className="shrink-0 text-text-low" />
                  </button>
                )
              })}
            </div>
          </motion.section>
        )}

        <motion.section variants={item}>
          <SectionTitle>Быстрые действия</SectionTitle>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                to: '/create/short',
                icon: Smartphone,
                title: 'Shorts',
                text: 'Reddit-истории и факты, пачкой до 10 роликов',
              },
              {
                to: '/create/video',
                icon: Film,
                title: 'Видео из стоков',
                text: 'Описание → AI-сценарий → монтаж из стоков',
              },
              {
                to: '/translate',
                icon: Languages,
                title: 'Перевод',
                text: 'Дубляж ролика сразу на несколько языков',
              },
            ].map(({ to, icon: Icon, title, text }, i) => (
              <Link
                key={to}
                to={to}
                className="glass group relative overflow-hidden rounded-lg p-6 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-glow"
              >
                <span
                  aria-hidden
                  className="text-display pointer-events-none absolute -top-3 right-3 text-[64px] leading-none font-bold text-text-hi/5 transition-colors duration-300 group-hover:text-amber-500/10"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex size-10 items-center justify-center rounded-md border border-amber-500/25 bg-amber-500/10">
                  <Icon size={19} strokeWidth={1.7} className="text-amber-400" />
                </span>
                <h3 className="text-display mt-5 text-[17px] font-medium text-text-hi">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-text-low">{text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-text-low transition-all duration-200 group-hover:gap-2.5 group-hover:text-amber-400">
                  Начать <ArrowRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        </motion.section>

        <motion.section variants={item}>
          <SectionTitle>Последние рендеры</SectionTitle>
          {!videos?.length ? (
            <div className="relative overflow-hidden rounded-lg border border-line">
              <img
                src="/bg-studio.webp"
                alt=""
                aria-hidden
                className="absolute inset-0 size-full object-cover opacity-45"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/60 to-ink-950/30"
              />
              <div className="relative flex flex-col items-start gap-2 px-10 py-14">
                <Clapperboard size={24} className="mb-2 text-amber-400" />
                <p className="text-display text-[20px] font-medium text-text-hi">
                  Здесь появятся готовые видео
                </p>
                <p className="max-w-sm text-[13.5px] text-text-mid">
                  Начните с Shorts — это самый быстрый путь к первому ролику
                </p>
                <Link to="/create/short" className="mt-4">
                  <Button variant="primary">Создать short</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {videos.map((v) => (
                <button
                  key={v.filename}
                  type="button"
                  onClick={() => setLightbox(v)}
                  className="group relative aspect-9/16 w-36 shrink-0 overflow-hidden rounded-md border border-line bg-black transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-card"
                >
                  <video
                    src={v.url}
                    preload="metadata"
                    muted
                    loop
                    playsInline
                    className="size-full object-cover"
                    onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause()
                      e.currentTarget.currentTime = 0
                    }}
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-950/90 to-transparent px-2.5 pt-6 pb-2 text-left font-mono text-[10px] text-text-mid">
                    {v.filename}
                  </span>
                </button>
              ))}
            </div>
          )}
        </motion.section>
      </motion.div>

      <Modal
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        title={lightbox?.filename}
        className="max-w-sm"
      >
        {lightbox && (
          <div className="space-y-4">
            <VideoPlayer src={lightbox.url} vertical autoPlay />
            <a href={lightbox.url} download className="block">
              <Button variant="primary" className="w-full" icon={<Download size={15} />}>
                Скачать
              </Button>
            </a>
          </div>
        )}
      </Modal>
    </Page>
  )
}
