import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dropzone } from '../../components/ui/Dropzone'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Tabs } from '../../components/ui/Tabs'
import { toast } from '../../components/ui/Toast'
import { assetsApi } from '../../lib/api/assets'
import type { AssetType } from '../../lib/api/types'

const NAME_RE = /^[A-Za-z0-9 _-]+$/
const YT_RE = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//

interface AddAssetModalProps {
  open: boolean
  onClose: () => void
  existingNames: string[]
}

export function AddAssetModal({ open, onClose, existingNames }: AddAssetModalProps) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'youtube' | 'file'>('youtube')
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState<AssetType>('background video')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const nameError = !name
    ? undefined
    : !NAME_RE.test(name)
      ? 'Только латиница, цифры, пробел, - и _'
      : existingNames.includes(name)
        ? 'Имя уже занято'
        : undefined
  const urlError = tab === 'youtube' && url && !YT_RE.test(url) ? 'Нужна ссылка на YouTube' : undefined
  const ready =
    !!name && !nameError && (tab === 'youtube' ? !!url && !urlError : !!file)

  const reset = () => {
    setName('')
    setUrl('')
    setFile(null)
  }

  const add = useMutation({
    mutationFn: async () => {
      if (tab === 'youtube') return assetsApi.addRemote(name, assetType, url)
      return assetsApi.addLocal(file!, name, assetType)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assets'] })
      toast.ok(`Ассет «${name}» добавлен`)
      reset()
      onClose()
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Не удалось добавить'),
  })

  return (
    <Modal open={open} onClose={onClose} title="Добавить ассет">
      <Tabs
        tabs={[
          { value: 'youtube', label: 'YouTube' },
          { value: 'file', label: 'Файл' },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      <div className="space-y-4">
        <Field label="Имя" error={nameError} hint="Под этим именем ассет появится в формах">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Minecraft Parkour" />
        </Field>

        <Field label="Тип">
          <SegmentedControl
            options={
              [
                { value: 'background video', label: 'Фон-видео' },
                { value: 'background music', label: 'Музыка' },
                ...(tab === 'file' ? [{ value: 'image' as const, label: 'Картинка' }] : []),
              ] as { value: AssetType; label: string }[]
            }
            value={assetType}
            onChange={setAssetType}
          />
        </Field>

        {tab === 'youtube' ? (
          <Field label="Ссылка" error={urlError}>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </Field>
        ) : (
          <Dropzone
            onFile={setFile}
            accept={assetType === 'image' ? 'image/*' : assetType === 'background music' ? 'audio/*' : 'video/*'}
            hint={assetType === 'image' ? '.png, .jpg' : assetType === 'background music' ? '.mp3, .wav' : '.mp4, .mov, .avi'}
          />
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="primary" disabled={!ready} loading={add.isPending} onClick={() => add.mutate()}>
          Добавить
        </Button>
      </div>
    </Modal>
  )
}
