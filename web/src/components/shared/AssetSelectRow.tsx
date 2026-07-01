import { useQuery } from '@tanstack/react-query'
import { AudioLines, Link2, Video } from 'lucide-react'
import { Link } from 'react-router'
import { assetsApi } from '../../lib/api/assets'
import type { AssetType } from '../../lib/api/types'
import { cn } from '../../lib/cn'
import { Skeleton } from '../ui/Skeleton'

interface AssetSelectRowProps {
  assetType: Extract<AssetType, 'background video' | 'background music'>
  value: string | null
  onChange: (name: string) => void
  error?: string
}

/** Горизонтальный ряд миниатюр-ассетов с одиночным выбором. */
export function AssetSelectRow({ assetType, value, onChange, error }: AssetSelectRowProps) {
  const { data: assets, isLoading } = useQuery({ queryKey: ['assets'], queryFn: assetsApi.list })
  const items = (assets ?? []).filter((a) => a.type === assetType)
  const isVideo = assetType === 'background video'

  if (isLoading) return <Skeleton className="h-24" />

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line px-4 py-5 text-[13px] text-text-low">
        В библиотеке нет ассетов типа «{isVideo ? 'фоновое видео' : 'фоновая музыка'}».{' '}
        <Link to="/assets" className="text-amber-400 hover:underline">
          Добавить →
        </Link>
      </p>
    )
  }

  return (
    <div>
      <div className="flex gap-2.5 overflow-x-auto pb-1.5">
        {items.map((asset) => {
          const active = value === asset.name
          const local = asset.link.startsWith('/')
          return (
            <button
              key={asset.name}
              type="button"
              onClick={() => onChange(asset.name)}
              title={asset.name}
              className={cn(
                'group relative shrink-0 overflow-hidden rounded-md border text-left transition-all duration-120',
                isVideo ? 'h-24 w-40' : 'h-12 min-w-36 px-3',
                active
                  ? 'border-amber-500/70 shadow-glow'
                  : 'border-line hover:border-line-strong',
              )}
            >
              {isVideo ? (
                <>
                  {local ? (
                    <video
                      src={asset.link}
                      preload="metadata"
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 size-full object-cover"
                      onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause()
                        e.currentTarget.currentTime = 0
                      }}
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-ink-800">
                      <Video size={18} className="text-text-low" />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-ink-950/80 px-2 py-1 text-[11px] text-text-hi">
                    {!local && <Link2 size={9} className="mr-1 inline text-info" />}
                    {asset.name}
                  </span>
                </>
              ) : (
                <span className="flex h-full items-center gap-2">
                  <AudioLines
                    size={14}
                    className={active ? 'text-amber-400' : 'text-text-low'}
                  />
                  <span
                    className={cn(
                      'truncate text-[12.5px]',
                      active ? 'text-text-hi' : 'text-text-mid',
                    )}
                  >
                    {asset.name}
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        {error ? (
          <span className="text-[12px] text-err">{error}</span>
        ) : (
          <span />
        )}
        <Link to="/assets" className="text-[12px] text-text-low hover:text-amber-400">
          Управлять библиотекой →
        </Link>
      </div>
    </div>
  )
}
