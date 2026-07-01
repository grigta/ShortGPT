import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

/** Живой лог рендера: моно, автоскролл с «прилипанием» к низу. */
export function LiveLog({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(true)

  useEffect(() => {
    if (stuck && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [lines.length, stuck])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    setStuck(el.scrollHeight - el.scrollTop - el.clientHeight < 24)
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-md border border-line bg-ink-900/60">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
        <span className="font-mono text-[11px] tracking-widest text-text-low uppercase">
          Журнал
        </span>
        {!stuck && (
          <button
            type="button"
            onClick={() => setStuck(true)}
            className="font-mono text-[11px] text-amber-400 hover:text-amber-500"
          >
            ↓ к последним
          </button>
        )}
      </div>
      <div
        ref={ref}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3.5 py-2.5 font-mono text-[11.5px] leading-relaxed"
      >
        {lines.length === 0 && <p className="text-text-low">Пока тихо…</p>}
        {lines.map((line, i) => (
          <p
            key={i}
            className={cn(
              'break-words whitespace-pre-wrap',
              i === lines.length - 1 ? 'text-text-mid' : 'text-text-low',
            )}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
