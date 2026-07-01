import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Languages } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Page } from '../../components/layout/Page'
import { PageHeader } from '../../components/layout/PageHeader'
import { VoicePicker } from '../../components/shared/VoicePicker'
import { Button } from '../../components/ui/Button'
import { Dropzone } from '../../components/ui/Dropzone'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { MultiChipSelect } from '../../components/ui/MultiChipSelect'
import { Tabs } from '../../components/ui/Tabs'
import { Toggle } from '../../components/ui/Toggle'
import { toast } from '../../components/ui/Toast'
import { useEdgeVoices } from '../../hooks/useVoices'
import { assetsApi } from '../../lib/api/assets'
import { jobsApi } from '../../lib/api/jobs'
import { settingsApi } from '../../lib/api/settings'
import type { VoiceSpec } from '../../lib/api/types'
import { ELEVEN_SUPPORTED } from '../../lib/languages'

const YT_RE = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/

export function TranslatePage() {
  const navigate = useNavigate()
  const [sourceTab, setSourceTab] = useState<'youtube' | 'file'>('youtube')
  const [url, setUrl] = useState('')
  const [fileLink, setFileLink] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [langs, setLangs] = useState<string[]>([])
  const [voice, setVoice] = useState<VoiceSpec>({ engine: 'edge', language: 'English', gender: 'male' })
  const [captions, setCaptions] = useState(false)

  const edge = useEdgeVoices()
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: settingsApi.health })

  const langOptions = useMemo(() => {
    const all =
      voice.engine === 'edge'
        ? (edge.data ?? []).map((v) => v.language)
        : ELEVEN_SUPPORTED
    return all.map((l) => ({ value: l, label: l }))
  }, [voice.engine, edge.data])

  const srcUrl = sourceTab === 'youtube' ? url.trim() : fileLink
  const blockReason = !health?.keys.OPENROUTER_API_KEY
    ? 'Добавьте ключ OpenRouter в настройках'
    : sourceTab === 'youtube' && (!url.trim() || !YT_RE.test(url.trim()))
      ? 'Вставьте ссылку на YouTube'
      : sourceTab === 'file' && !fileLink
        ? 'Загрузите видеофайл'
        : langs.length === 0
          ? 'Выберите хотя бы один язык'
          : voice.engine === 'elevenlabs' && !voice.voice_name
            ? 'Выберите голос ElevenLabs'
            : null

  const upload = async (file: File) => {
    setUploading(true)
    try {
      // файл заезжает в библиотеку как видео-ассет, движку уходит его ссылка
      const name = `upload ${Date.now().toString(36)}`
      const asset = await assetsApi.addLocal(file, name, 'video')
      setFileLink(asset.link)
      toast.ok('Файл загружен')
    } catch (e) {
      toast.err(e instanceof Error ? e.message : 'Не удалось загрузить файл')
    } finally {
      setUploading(false)
    }
  }

  const launch = useMutation({
    mutationFn: () =>
      jobsApi.createTranslations({
        src_url: srcUrl!,
        target_languages: langs,
        use_captions: captions,
        voice,
      }),
    onSuccess: (res) => navigate(`/jobs/${res.group_id}`),
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Не удалось запустить перевод'),
  })

  return (
    <Page>
      <PageHeader eyebrow="локализация" title="Перевод видео" subtitle="Дубляж на несколько языков за один запуск" />

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        className="max-w-2xl space-y-9 pb-16"
      >
        {[
          <Field key="src" label="Источник">
            <Tabs
              tabs={[
                { value: 'youtube', label: 'YouTube' },
                { value: 'file', label: 'Файл' },
              ]}
              value={sourceTab}
              onChange={setSourceTab}
              className="mb-4"
            />
            {sourceTab === 'youtube' ? (
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            ) : (
              <Dropzone
                onFile={(f) => void upload(f)}
                accept="video/mp4,video/quicktime,video/x-msvideo"
                hint={uploading ? 'Загружаем…' : '.mp4, .mov, .avi'}
              />
            )}
          </Field>,

          <Field
            key="langs"
            label="Целевые языки"
            hint={langs.length > 0 ? `${langs.length} яз. → ${langs.length} видео` : undefined}
          >
            <MultiChipSelect options={langOptions} values={langs} onChange={setLangs} />
          </Field>,

          <div key="voice" className="space-y-4">
            <VoicePicker value={voice} onChange={setVoice} hideLanguage />
            <Toggle checked={captions} onChange={setCaptions} label="Вшить субтитры" />
          </div>,

          <div key="go" className="border-t border-line pt-6">
            <Button
              variant="primary"
              size="lg"
              icon={<Languages size={16} />}
              disabled={!!blockReason || uploading}
              loading={launch.isPending}
              onClick={() => launch.mutate()}
            >
              Перевести{langs.length > 0 ? ` на ${langs.length} яз.` : ''}
            </Button>
            {blockReason && <p className="mt-2.5 text-[12px] text-text-low">{blockReason}</p>}
          </div>,
        ].map((child, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </Page>
  )
}
