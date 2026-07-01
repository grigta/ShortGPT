import { AudioLines, ImageIcon, Link2, Trash2, Video } from 'lucide-react'
import { useRef } from 'react'
import { Badge } from '../../components/ui/Badge'
import type { AssetOut } from '../../lib/api/types'
import { cn } from '../../lib/cn'

const TYPE_LABEL: Record<string, string> = {
  'background video': 'фон-видео',
  'background music': 'музыка',
  image: 'картинка',
  video: 'видео',
  audio: 'аудио',
}

function isLocalUrl(link: string) {
  return link.startsWith('/')
}

function fmtDuration(d: number | null) {
  if (!d) return null
  const m = Math.floor(d / 60)
  const s = Math.round(d % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

interface AssetCardProps {
  asset: AssetOut
  onOpen: () => void
  onDelete: () => void
}

export function AssetCard({ asset, onOpen, onDelete }: AssetCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const local = isLocalUrl(asset.link)
  const isVideo = asset.type.includes('video')
  const isAudio = asset.type.includes('music') || asset.type === 'audio'
  const duration = fmtDuration(asset.duration)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="glass group relative cursor-pointer overflow-hidden rounded-md transition-all duration-120 hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-card"
    >
      <div
        className="relative flex aspect-video items-center justify-center overflow-hidden bg-ink-800"
        onMouseEnter={() => local && isVideo && videoRef.current?.play().catch(() => {})}
        onMouseLeave={() => {
          if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
          }
        }}
      >
        {local && isVideo ? (
          <video
            ref={videoRef}
            src={asset.link}
            preload="metadata"
            muted
            loop
            playsInline
            className="size-full object-cover"
          />
        ) : local && asset.type === 'image' ? (
          <img src={asset.link} alt={asset.name} className="size-full object-cover" />
        ) : isAudio ? (
          <AudioLines size={26} className="text-text-low transition-colors duration-120 group-hover:text-amber-400" />
        ) : isVideo ? (
          <Video size={26} className="text-text-low" />
        ) : (
          <ImageIcon size={26} className="text-text-low" />
        )}
        {duration && (
          <span className="absolute right-1.5 bottom-1.5 rounded-sm bg-ink-950/80 px-1.5 py-0.5 font-mono text-[10px] text-text-mid">
            {duration}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-text-hi">{asset.name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge>{TYPE_LABEL[asset.type] ?? asset.type}</Badge>
            {!local && (
              <Badge tone="info">
                <Link2 size={9} /> YouTube
              </Badge>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={`Удалить ${asset.name}`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className={cn(
            'rounded-sm p-1.5 text-text-low opacity-0 transition-all duration-120',
            'group-hover:opacity-100 hover:bg-err/10 hover:text-err focus-visible:opacity-100',
          )}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
