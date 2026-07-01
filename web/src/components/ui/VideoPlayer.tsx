import type { VideoHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface VideoPlayerProps extends VideoHTMLAttributes<HTMLVideoElement> {
  src: string
  vertical?: boolean
}

export function VideoPlayer({ src, vertical, className, ...rest }: VideoPlayerProps) {
  return (
    <video
      src={src}
      controls
      playsInline
      className={cn(
        'w-full rounded-md border border-line bg-black shadow-card',
        vertical ? 'aspect-9/16' : 'aspect-video',
        className,
      )}
      {...rest}
    />
  )
}
