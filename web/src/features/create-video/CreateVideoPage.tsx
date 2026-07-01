import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Clapperboard, Sparkles, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Page } from '../../components/layout/Page'
import { PageHeader } from '../../components/layout/PageHeader'
import { VoicePicker } from '../../components/shared/VoicePicker'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input, Textarea } from '../../components/ui/Input'
import { toast } from '../../components/ui/Toast'
import { jobsApi } from '../../lib/api/jobs'
import { scriptApi } from '../../lib/api/script'
import { settingsApi } from '../../lib/api/settings'
import type { VoiceSpec } from '../../lib/api/types'
import { cn } from '../../lib/cn'

const WAIT_PHRASES = [
  'Придумываем закадровый текст…',
  'Сверяемся с хронометражем…',
  'Полируем формулировки…',
  'Почти готово…',
]

function WaitingPhrase() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % WAIT_PHRASES.length), 2400)
    return () => clearInterval(t)
  }, [])
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={i}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="text-[13px] text-text-mid"
      >
        {WAIT_PHRASES[i]}
      </motion.span>
    </AnimatePresence>
  )
}

export function CreateVideoPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [vertical, setVertical] = useState(false)
  const [voice, setVoice] = useState<VoiceSpec>({ engine: 'edge', language: 'English', gender: 'male' })
  const [description, setDescription] = useState('')
  const [script, setScript] = useState('')
  const [correction, setCorrection] = useState('')

  const { data: health } = useQuery({ queryKey: ['health'], queryFn: settingsApi.health })
  const missingKey = health && (!health.keys.OPENROUTER_API_KEY || !health.keys.PEXELS_API_KEY)

  const generate = useMutation({
    mutationFn: () => scriptApi.generate(description.trim(), voice.language),
    onSuccess: (res) => {
      setScript(res.script)
      setStep(2)
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Не удалось сгенерировать сценарий'),
  })

  const correct = useMutation({
    mutationFn: () => scriptApi.correct(script, correction.trim()),
    onSuccess: (res) => {
      setScript(res.script)
      setCorrection('')
      toast.ok('Сценарий обновлён')
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Не удалось поправить сценарий'),
  })

  const render = useMutation({
    mutationFn: () =>
      jobsApi.createVideo({ script, vertical, language: voice.language, voice }),
    onSuccess: (res) => navigate(`/jobs/${res.group_id}`),
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Не удалось запустить рендер'),
  })

  return (
    <Page>
      <PageHeader title="Видео из стоков" subtitle="Бриф → сценарий → рендер" />

      {/* индикатор шага */}
      <div className="mb-8 flex items-center gap-2 font-mono text-[12px]">
        {(['Бриф', 'Сценарий'] as const).map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-8 bg-line" />}
            <span
              className={cn(
                'rounded-full border px-3 py-1',
                step === i + 1
                  ? 'border-amber-500/50 text-amber-400'
                  : step > i + 1
                    ? 'border-line text-text-mid'
                    : 'border-line text-text-low',
              )}
            >
              {i + 1} · {label}
            </span>
          </span>
        ))}
      </div>

      {missingKey && (
        <p className="mb-6 rounded-md border border-err/30 bg-err/5 px-4 py-3 text-[13px] text-err">
          Для видео из стоков нужны ключи OpenRouter и Pexels — проверьте настройки.
        </p>
      )}

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="brief"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl space-y-8 pb-16"
          >
            <Field label="Ориентация">
              <div className="flex gap-3">
                {(
                  [
                    { v: true, label: '9:16 · вертикально', w: 'w-10', h: 'h-16' },
                    { v: false, label: '16:9 · горизонтально', w: 'w-16', h: 'h-10' },
                  ] as const
                ).map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setVertical(o.v)}
                    className={cn(
                      'flex flex-col items-center gap-2.5 rounded-md border px-6 py-4 transition-all duration-120',
                      vertical === o.v
                        ? 'border-amber-500/50 bg-ink-800 shadow-glow'
                        : 'border-line bg-ink-900 hover:border-line-strong',
                    )}
                  >
                    <span
                      className={cn(
                        'rounded-[3px] border',
                        o.w,
                        o.h,
                        vertical === o.v ? 'border-amber-500/70 bg-amber-500/10' : 'border-line-strong',
                      )}
                    />
                    <span className={cn('text-[12px]', vertical === o.v ? 'text-text-hi' : 'text-text-mid')}>
                      {o.label}
                    </span>
                  </button>
                ))}
              </div>
            </Field>

            <VoicePicker value={voice} onChange={setVoice} />

            <Field label="О чём видео" hint="Опишите содержание — сценарий напишет AI, стоки подберутся автоматически">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Видео о пяти самых глубоких местах мирового океана, тон — научпоп, до минуты…"
                className="min-h-32"
              />
            </Field>

            <div className="flex items-center gap-4">
              <Button
                variant="primary"
                icon={<Sparkles size={15} />}
                disabled={!description.trim() || !voice.language}
                loading={generate.isPending}
                onClick={() => generate.mutate()}
              >
                Сгенерировать сценарий
              </Button>
              {generate.isPending && <WaitingPhrase />}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="script"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl space-y-6 pb-16"
          >
            <Field label="Сценарий" hint="Можно править руками — в рендер уйдёт ровно этот текст">
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="min-h-56 leading-relaxed"
              />
            </Field>

            <Field label="Что поправить?">
              <div className="flex gap-2.5">
                <Input
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                  placeholder="Сделай короче и добавь интригу в начало…"
                  onKeyDown={(e) => e.key === 'Enter' && correction.trim() && correct.mutate()}
                />
                <Button
                  icon={<Wand2 size={14} />}
                  disabled={!correction.trim()}
                  loading={correct.isPending}
                  onClick={() => correct.mutate()}
                >
                  Исправить через AI
                </Button>
              </div>
            </Field>

            <div className="flex items-center justify-between border-t border-line pt-6">
              <Button variant="ghost" icon={<ArrowLeft size={14} />} onClick={() => setStep(1)}>
                К брифу
              </Button>
              <Button
                variant="primary"
                size="lg"
                icon={<Clapperboard size={16} />}
                disabled={!script.trim()}
                loading={render.isPending}
                onClick={() => render.mutate()}
              >
                Рендерить видео
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}
