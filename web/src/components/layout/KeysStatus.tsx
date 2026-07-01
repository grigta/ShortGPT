import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router'
import { api } from '../../lib/api/client'
import type { HealthOut } from '../../lib/api/types'
import { cn } from '../../lib/cn'

const KEY_LABELS: [string, string][] = [
  ['OPENROUTER_API_KEY', 'OpenRouter'],
  ['ELEVENLABS_API_KEY', 'ElevenLabs'],
  ['PEXELS_API_KEY', 'Pexels'],
]

export function KeysStatus({ collapsed }: { collapsed: boolean }) {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<HealthOut>('/api/health'),
    refetchInterval: 60_000,
  })

  return (
    <NavLink
      to="/settings"
      title="Ключи API — Настройки"
      className="mx-3 mb-3 flex items-center gap-2 rounded-md border border-line px-3 py-2 transition-colors duration-120 hover:border-line-strong hover:bg-ink-900"
    >
      <span className="flex items-center gap-1.5">
        {KEY_LABELS.map(([key, label]) => (
          <span
            key={key}
            title={`${label}: ${data?.keys?.[key] ? 'настроен' : 'не задан'}`}
            className={cn(
              'size-1.5 rounded-full',
              data?.keys?.[key] ? 'bg-ok' : 'bg-err',
            )}
          />
        ))}
      </span>
      {!collapsed && <span className="text-[12px] text-text-mid">Ключи API</span>}
    </NavLink>
  )
}
