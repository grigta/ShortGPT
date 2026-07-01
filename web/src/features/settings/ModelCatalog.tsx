import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'
import { toast } from '../../components/ui/Toast'
import { settingsApi } from '../../lib/api/settings'
import { cn } from '../../lib/cn'

const PAGE = 12

/** Цена OpenRouter: за токен (~1e-6) или уже за 1M — нормализуем к $/1M. */
function fmtPrice(p: number | null): string {
  if (p === null) return '—'
  if (p === 0) return '0'
  const perM = p < 0.001 ? p * 1_000_000 : p
  return `$${perM < 10 ? perM.toFixed(2) : Math.round(perM)}/1M`
}

function fmtContext(c: number | null): string {
  if (!c) return '—'
  return c >= 1000 ? `${Math.round(c / 1000)}K` : String(c)
}

interface ModelCatalogProps {
  target: 'text' | 'image'
  title: string
}

export function ModelCatalog({ target, title }: ModelCatalogProps) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [manualId, setManualId] = useState('')

  const query = useQuery({
    queryKey: ['models', target, q, freeOnly, page],
    queryFn: () =>
      settingsApi.models({
        q: q || undefined,
        free_only: freeOnly,
        image_only: target === 'image',
        offset: page * PAGE,
        limit: PAGE,
      }),
    placeholderData: (prev) => prev,
  })

  const data = query.data
  const selected = target === 'image' ? data?.selected_image : data?.selected
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1

  const select = async (id: string) => {
    try {
      await settingsApi.selectModel(id, target)
      await qc.invalidateQueries({ queryKey: ['models', target] })
      toast.ok(`Модель выбрана: ${id}`)
    } catch (e) {
      toast.err(e instanceof Error ? e.message : 'Не удалось выбрать модель')
    }
  }

  return (
    <section>
      <h2 className="mb-1 text-[16px] font-semibold text-text-hi">{title}</h2>
      {selected ? (
        <p className="mb-4 font-mono text-[12px] text-text-mid">
          выбрана: <span className="text-amber-400">{selected}</span>
        </p>
      ) : (
        <p className="mb-4 text-[12px] text-text-low">
          {target === 'image' ? 'Не выбрана — картинки из поиска' : 'Используется модель по умолчанию'}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <Input
          placeholder="Поиск модели…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(0)
          }}
          className="h-9 w-64"
        />
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text-mid select-none">
          <input
            type="checkbox"
            checked={freeOnly}
            onChange={(e) => {
              setFreeOnly(e.target.checked)
              setPage(0)
            }}
            className="size-3.5 accent-amber-500"
          />
          Только бесплатные
        </label>
        <Button
          size="sm"
          variant="ghost"
          icon={<RefreshCw size={13} className={query.isFetching ? 'animate-spin' : ''} />}
          onClick={() => qc.invalidateQueries({ queryKey: ['models', target] })}
        >
          Обновить
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-ink-900 font-mono text-[11px] tracking-wider text-text-low uppercase">
                <th className="px-3.5 py-2 font-normal">Модель</th>
                <th className="w-20 px-3 py-2 font-normal">Контекст</th>
                <th className="w-28 px-3 py-2 font-normal">Ввод</th>
                <th className="w-28 px-3 py-2 font-normal">Вывод</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((m) => {
                const isSel = m.id === selected
                return (
                  <tr
                    key={m.id}
                    onClick={() => select(m.id)}
                    className={cn(
                      'cursor-pointer border-b border-line/50 transition-colors duration-75 last:border-0',
                      isSel ? 'bg-amber-500/8' : 'hover:bg-ink-900',
                    )}
                  >
                    <td className="px-3.5 py-2">
                      <span className={cn('block truncate', isSel ? 'text-text-hi' : 'text-text-mid')}>
                        {m.name}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-text-low">
                        {m.id}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[12px] text-text-mid tabular-nums">
                      {fmtContext(m.context)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[12px] text-text-mid">
                      {m.is_free ? <Badge tone="ok">бесплатно</Badge> : fmtPrice(m.prompt_price)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[12px] text-text-mid">
                      {m.is_free ? '' : fmtPrice(m.completion_price)}
                    </td>
                    <td className="px-3 py-2">
                      {isSel && <Check size={14} className="text-amber-400" />}
                    </td>
                  </tr>
                )
              })}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3.5 py-6 text-center text-text-low">
                    Ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ← Назад
          </Button>
          <span className="font-mono text-[12px] text-text-low tabular-nums">
            {page + 1} / {pages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд →
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="id модели вручную…"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="h-8 w-56 font-mono text-[12px]"
          />
          <Button
            size="sm"
            disabled={!manualId.trim()}
            onClick={() => {
              void select(manualId.trim())
              setManualId('')
            }}
          >
            Задать
          </Button>
        </div>
      </div>
    </section>
  )
}
