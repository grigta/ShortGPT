import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, FlaskConical, MessageSquareText, Pencil, Rocket } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { PageHeader } from '../../components/layout/PageHeader'
import { AssetSelectRow } from '../../components/shared/AssetSelectRow'
import { VoicePicker } from '../../components/shared/VoicePicker'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { RadioCardGroup } from '../../components/ui/RadioCardGroup'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Stepper } from '../../components/ui/Stepper'
import { Toggle } from '../../components/ui/Toggle'
import { toast } from '../../components/ui/Toast'
import { jobsApi } from '../../lib/api/jobs'
import { settingsApi } from '../../lib/api/settings'
import type { ShortJobCreate, VoiceSpec } from '../../lib/api/types'

type Preset = 'reddit' | 'historical_facts' | 'scientific_facts' | 'custom'

// как на бэкенде (backend/schemas.py WATERMARK_RE): буквы/цифры/пробел/-/_, 3–25 символов
const WATERMARK_RE = /^[A-Za-z0-9а-яА-ЯёЁ _-]{3,25}$/

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <motion.section
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      <h2 className="mb-4 flex items-baseline gap-2.5">
        <span className="font-mono text-[11px] text-amber-500/70">{String(n).padStart(2, '0')}</span>
        <span className="font-mono text-[12px] tracking-widest text-text-low uppercase">{title}</span>
      </h2>
      <div className="mb-10">{children}</div>
    </motion.section>
  )
}

export function CreateShortPage() {
  const navigate = useNavigate()
  const [preset, setPreset] = useState<Preset>('reddit')
  const [customSubject, setCustomSubject] = useState('')
  const [numShorts, setNumShorts] = useState(1)
  const [voice, setVoice] = useState<VoiceSpec>({ engine: 'edge', language: 'English', gender: 'male' })
  const [imagesEnabled, setImagesEnabled] = useState(true)
  const [numImages, setNumImages] = useState<'5' | '10' | '25'>('10')
  const [imageSource, setImageSource] = useState<'generate' | 'search'>('generate')
  const [watermarkEnabled, setWatermarkEnabled] = useState(false)
  const [watermark, setWatermark] = useState('')
  const [bgVideo, setBgVideo] = useState<string | null>(null)
  const [bgMusic, setBgMusic] = useState<string | null>(null)

  const { data: health } = useQuery({ queryKey: ['health'], queryFn: settingsApi.health })

  const isFacts = preset !== 'reddit'

  const blockReason = useMemo(() => {
    if (health && !health.keys.OPENROUTER_API_KEY) return 'Добавьте ключ OpenRouter в настройках'
    if (preset === 'custom' && !customSubject.trim()) return 'Укажите тему фактов'
    if (!voice.language) return 'Выберите язык озвучки'
    if (voice.engine === 'elevenlabs' && !voice.voice_name) return 'Выберите голос ElevenLabs'
    if (watermarkEnabled && !WATERMARK_RE.test(watermark))
      return 'Водяной знак: 3–25 символов — буквы, цифры, пробел, - и _'
    if (!isFacts && !bgVideo) return 'Выберите фоновое видео'
    if (!isFacts && !bgMusic) return 'Выберите фоновую музыку'
    if (isFacts && !bgVideo && !imagesEnabled)
      return 'Без фонового видео включите AI-изображения'
    return null
  }, [health, preset, isFacts, customSubject, voice, watermarkEnabled, watermark, bgVideo, bgMusic, imagesEnabled])

  const launch = useMutation({
    mutationFn: () => {
      const body: ShortJobCreate = {
        short_type: preset === 'reddit' ? 'reddit' : 'facts',
        facts_subject:
          preset === 'reddit'
            ? undefined
            : preset === 'historical_facts'
              ? 'historical facts'
              : preset === 'scientific_facts'
                ? 'scientific facts'
                : customSubject.trim(),
        num_shorts: numShorts,
        background_video: bgVideo ?? '',
        background_music: bgMusic ?? '',
        num_images: imagesEnabled ? Number(numImages) : undefined,
        image_source: imageSource,
        watermark: watermarkEnabled ? watermark : undefined,
        language: voice.language,
        voice,
      }
      return jobsApi.createShorts(body)
    },
    onSuccess: (res) => navigate(`/jobs/${res.group_id}`),
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Не удалось запустить рендер'),
  })

  const presetLabel: Record<Preset, string> = {
    reddit: 'Reddit-история',
    historical_facts: 'Исторические факты',
    scientific_facts: 'Научные факты',
    custom: customSubject.trim() ? `Факты: ${customSubject.trim()}` : 'Факты: своя тема',
  }

  return (
    <div className="mx-auto max-w-7xl px-8 py-10">
      <PageHeader title="Shorts" subtitle="Вертикальные ролики с озвучкой и субтитрами — пачкой" />

      <div className="flex gap-10 pb-16">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          className="min-w-0 max-w-2xl flex-1"
        >
          <Section n={1} title="Что снимаем">
            <RadioCardGroup
              options={[
                { value: 'reddit', title: 'Reddit-история', description: 'Вопрос + история в стиле тредов', icon: <MessageSquareText size={16} /> },
                { value: 'historical_facts', title: 'Исторические факты', description: 'AI-подборка неожиданных фактов', icon: <BookOpen size={16} /> },
                { value: 'scientific_facts', title: 'Научные факты', description: 'Наука коротко и цепляюще', icon: <FlaskConical size={16} /> },
                { value: 'custom', title: 'Своя тема', description: 'Факты по любой теме на ваш вкус', icon: <Pencil size={16} /> },
              ]}
              value={preset}
              onChange={(v) => setPreset(v)}
            />
            {preset === 'custom' && (
              <Field label="Тема фактов" className="mt-4 max-w-md">
                <Input
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Космос, древний Рим, психология денег…"
                />
              </Field>
            )}
            <Field label="Количество роликов" className="mt-4">
              <Stepper value={numShorts} onChange={setNumShorts} min={1} max={10} />
            </Field>
          </Section>

          <Section n={2} title="Голос">
            <VoicePicker value={voice} onChange={setVoice} />
          </Section>

          <Section n={3} title="Визуал">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-5">
                <Toggle checked={imagesEnabled} onChange={setImagesEnabled} label="AI-изображения" />
                {imagesEnabled && (
                  <SegmentedControl
                    options={[
                      { value: '5', label: '5' },
                      { value: '10', label: '10' },
                      { value: '25', label: '25' },
                    ]}
                    value={numImages}
                    onChange={setNumImages}
                  />
                )}
              </div>
              {imagesEnabled && (
                <Field label="Источник картинок" hint={imageSource === 'generate' ? 'Через выбранную image-модель OpenRouter' : 'Поиск подходящих картинок в интернете'}>
                  <SegmentedControl
                    options={[
                      { value: 'generate', label: 'Генерация AI' },
                      { value: 'search', label: 'Поиск в интернете' },
                    ]}
                    value={imageSource}
                    onChange={setImageSource}
                  />
                </Field>
              )}
              <div className="flex flex-wrap items-center gap-5">
                <Toggle checked={watermarkEnabled} onChange={setWatermarkEnabled} label="Водяной знак" />
                {watermarkEnabled && (
                  <Input
                    value={watermark}
                    onChange={(e) => setWatermark(e.target.value)}
                    placeholder="MyChannel"
                    className="w-56"
                    invalid={!!watermark && !WATERMARK_RE.test(watermark)}
                  />
                )}
              </div>
            </div>
          </Section>

          <Section n={4} title="Фон">
            <div className="space-y-5">
              {isFacts && (
                <p className="text-[12.5px] leading-relaxed text-text-low">
                  Для фактов фон необязателен: без него ролик соберётся из AI-картинок крупным
                  планом на тёмном канвасе + субтитры. Повторный клик снимает выбор.
                </p>
              )}
              <Field label={isFacts ? 'Фоновое видео · опционально' : 'Фоновое видео'}>
                <AssetSelectRow
                  assetType="background video"
                  value={bgVideo}
                  onChange={setBgVideo}
                  allowNone={isFacts}
                />
              </Field>
              <Field label={isFacts ? 'Фоновая музыка · опционально' : 'Фоновая музыка'}>
                <AssetSelectRow
                  assetType="background music"
                  value={bgMusic}
                  onChange={setBgMusic}
                  allowNone={isFacts}
                />
              </Field>
            </div>
          </Section>
        </motion.div>

        {/* Сводка-«хлопушка» */}
        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="w-72 shrink-0"
        >
          <div className="sticky top-10 rounded-lg border border-line bg-ink-900 p-5">
            <div
              aria-hidden
              className="mb-4 h-2.5 rounded-sm"
              style={{
                background:
                  'repeating-linear-gradient(-45deg, #F6A623 0 10px, #0D1017 10px 20px)',
                opacity: 0.75,
              }}
            />
            <h3 className="text-display mb-4 text-[14px] tracking-wide">СЦЕНА {numShorts > 1 ? `× ${numShorts}` : ''}</h3>
            <dl className="space-y-2.5 text-[13px]">
              {[
                ['Тип', presetLabel[preset]],
                ['Язык', voice.language || '—'],
                [
                  'Голос',
                  voice.engine === 'edge'
                    ? `EdgeTTS · ${voice.gender === 'female' ? 'женский' : 'мужской'}`
                    : `ElevenLabs · ${voice.voice_name ?? '—'}`,
                ],
                [
                  'Картинки',
                  imagesEnabled
                    ? `${numImages} · ${imageSource === 'generate' ? 'генерация' : 'поиск'}`
                    : 'нет',
                ],
                ['Водяной знак', watermarkEnabled ? watermark || '—' : 'нет'],
                ['Фон-видео', bgVideo ?? (isFacts ? 'нет · канвас' : '—')],
                ['Музыка', bgMusic ?? (isFacts ? 'нет' : '—')],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-text-low">{k}</dt>
                  <dd className="truncate text-right text-text-mid">{v}</dd>
                </div>
              ))}
            </dl>
            <Button
              variant="primary"
              size="lg"
              className="mt-6 w-full"
              icon={<Rocket size={16} />}
              disabled={!!blockReason}
              loading={launch.isPending}
              onClick={() => launch.mutate()}
            >
              Запустить рендер{numShorts > 1 ? ` · ${numShorts}` : ''}
            </Button>
            {blockReason && (
              <p className="mt-2.5 text-center text-[12px] text-text-low">{blockReason}</p>
            )}
          </div>
        </motion.aside>
      </div>
    </div>
  )
}
