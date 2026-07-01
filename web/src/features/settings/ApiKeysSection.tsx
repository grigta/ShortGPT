import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'
import { toast } from '../../components/ui/Toast'
import { settingsApi } from '../../lib/api/settings'

/** Ключи API: masked-инпуты, PUT только реально изменённых значений. */
export function ApiKeysSection() {
  const qc = useQueryClient()
  const { data: keys, isLoading } = useQuery({
    queryKey: ['settings-keys'],
    queryFn: settingsApi.keys,
  })
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [savedAt, setSavedAt] = useState<Record<string, number>>({})

  const save = useMutation({
    mutationFn: async () => {
      const changed = Object.entries(edits)
      for (const [key, value] of changed) {
        await settingsApi.setKey(key, value)
      }
      return changed.map(([k]) => k)
    },
    onSuccess: (savedKeys) => {
      setEdits({})
      setSavedAt((s) => ({
        ...s,
        ...Object.fromEntries(savedKeys.map((k) => [k, Date.now()])),
      }))
      void qc.invalidateQueries({ queryKey: ['settings-keys'] })
      void qc.invalidateQueries({ queryKey: ['health'] })
      // после смены ключа список голосов ElevenLabs должен перечитаться сразу
      void qc.invalidateQueries({ queryKey: ['voices-eleven'] })
      toast.ok('Ключи сохранены')
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Не удалось сохранить'),
  })

  const secretKeys = keys?.filter((k) => k.is_secret) ?? []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {secretKeys.map((k) => (
        <Field key={k.key} label={k.label} className="max-w-lg">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={visible[k.key] ? 'text' : 'password'}
                placeholder={k.is_set ? k.masked_value : 'не задан'}
                value={edits[k.key] ?? ''}
                onChange={(e) => setEdits((s) => ({ ...s, [k.key]: e.target.value }))}
                autoComplete="off"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={visible[k.key] ? 'Скрыть' : 'Показать'}
                onClick={() => setVisible((s) => ({ ...s, [k.key]: !s[k.key] }))}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-text-low transition-colors duration-120 hover:text-text-mid"
              >
                {visible[k.key] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {savedAt[k.key] && !edits[k.key] && (
              <Check size={16} className="shrink-0 text-ok" aria-label="Сохранено" />
            )}
          </div>
        </Field>
      ))}
      <Button
        variant="primary"
        size="sm"
        disabled={Object.keys(edits).length === 0}
        loading={save.isPending}
        onClick={() => save.mutate()}
      >
        Сохранить ключи
      </Button>
    </div>
  )
}
