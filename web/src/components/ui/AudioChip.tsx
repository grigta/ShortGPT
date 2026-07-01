import { AudioLines, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

interface AudioChipProps {
  src: string
  label: string
  className?: string
}

/** Чип аудио-ассета с предпрослушкой. */
export function AudioChip({ src, label, className }: AudioChipProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current) {
      audioRef.current = new Audio(src)
      audioRef.current.onended = () => setPlaying(false)
      audioRef.current.onerror = () => setPlaying(false)
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      void audioRef.current.play()
      setPlaying(true)
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-line bg-ink-800 py-1.5 pr-3 pl-1.5 text-[13px] text-text-mid',
        className,
      )}
    >
      <button
        type="button"
        aria-label={playing ? 'Пауза' : 'Прослушать'}
        onClick={toggle}
        className={cn(
          'flex size-6 items-center justify-center rounded-full transition-colors duration-120',
          playing ? 'bg-amber-500 text-amber-ink' : 'bg-ink-700 text-text-mid hover:text-text-hi',
        )}
      >
        {playing ? <Pause size={11} /> : <Play size={11} className="ml-0.5" />}
      </button>
      <AudioLines size={13} className={playing ? 'text-amber-400' : 'text-text-low'} />
      <span className="max-w-40 truncate">{label}</span>
    </span>
  )
}
