import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FolderOpen, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Page } from '../../components/layout/Page'
import { PageHeader } from '../../components/layout/PageHeader'
import { AudioChip } from '../../components/ui/AudioChip'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'
import { toast } from '../../components/ui/Toast'
import { VideoPlayer } from '../../components/ui/VideoPlayer'
import { assetsApi } from '../../lib/api/assets'
import type { AssetOut } from '../../lib/api/types'
import { cn } from '../../lib/cn'
import { AddAssetModal } from './AddAssetModal'
import { AssetCard } from './AssetCard'

const FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'background video', label: 'Фон-видео' },
  { value: 'background music', label: 'Музыка' },
  { value: 'image', label: 'Картинки' },
] as const

export function AssetsPage() {
  const qc = useQueryClient()
  const { data: assets, isLoading } = useQuery({ queryKey: ['assets'], queryFn: assetsApi.list })
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [preview, setPreview] = useState<AssetOut | null>(null)
  const [deleting, setDeleting] = useState<AssetOut | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (assets ?? [])
      .filter((a) => filter === 'all' || a.type === filter)
      .filter((a) => !q || a.name.toLowerCase().includes(q))
  }, [assets, filter, search])

  const remove = useMutation({
    mutationFn: (name: string) => assetsApi.remove(name),
    onSuccess: (_, name) => {
      void qc.invalidateQueries({ queryKey: ['assets'] })
      toast.ok(`«${name}» удалён из библиотеки`)
      setDeleting(null)
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Не удалось удалить'),
  })

  return (
    <Page wide>
      <PageHeader
        eyebrow="библиотека"
        title="Ассеты"
        subtitle="Фоновые видео, музыка и изображения для рендеров"
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
            Добавить ассет
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-[13px] transition-colors duration-120',
              filter === f.value
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                : 'border-line text-text-mid hover:border-line-strong hover:text-text-hi',
            )}
          >
            {f.label}
          </button>
        ))}
        <Input
          placeholder="Поиск…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto h-9 w-56"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={28} />}
          title={assets?.length ? 'Ничего не найдено' : 'Библиотека пуста'}
          description={
            assets?.length
              ? 'Попробуйте другой фильтр или запрос'
              : 'Добавьте фоновое видео и музыку — без них не собрать short'
          }
          action={
            !assets?.length && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
                Добавить первый ассет
              </Button>
            )
          }
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-2 gap-4 pb-16 md:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((asset) => (
            <motion.div
              key={asset.name}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              <AssetCard
                asset={asset}
                onOpen={() => setPreview(asset)}
                onDelete={() => setDeleting(asset)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <AddAssetModal
        open={adding}
        onClose={() => setAdding(false)}
        existingNames={(assets ?? []).map((a) => a.name)}
      />

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name} className="max-w-xl">
        {preview &&
          (preview.link.startsWith('/') ? (
            preview.type === 'image' ? (
              <img src={preview.link} alt={preview.name} className="w-full rounded-md" />
            ) : preview.type.includes('music') || preview.type === 'audio' ? (
              <div className="flex justify-center py-6">
                <AudioChip src={preview.link} label={preview.name} />
              </div>
            ) : (
              <VideoPlayer src={preview.link} />
            )
          ) : (
            <p className="text-[14px] text-text-mid">
              Внешний ассет:{' '}
              <a
                href={preview.link}
                target="_blank"
                rel="noreferrer"
                className="break-all text-amber-400 hover:underline"
              >
                {preview.link}
              </a>
              <span className="mt-2 block text-[12px] text-text-low">
                Скачивается автоматически при первом использовании в рендере
              </span>
            </p>
          ))}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.name)}
        loading={remove.isPending}
        title="Удалить ассет?"
        description={`«${deleting?.name}» пропадёт из библиотеки и форм. Файл на диске не удаляется.`}
      />
    </Page>
  )
}
