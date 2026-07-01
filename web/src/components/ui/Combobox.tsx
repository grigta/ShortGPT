import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

interface ComboboxProps {
  options: { value: string; label: string }[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/** Селект с поиском — для длинных списков (языки, модели). */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Выбрать…',
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => setHighlighted(0), [query])

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlighted, open])

  const selected = options.find((o) => o.value === value)

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(filtered.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlighted]) pick(filtered[highlighted].value)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-sm border border-line bg-ink-800 px-3 text-left text-[14px] transition-colors duration-120',
          'hover:border-line-strong disabled:pointer-events-none disabled:opacity-40',
          selected ? 'text-text-hi' : 'text-text-low',
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronsUpDown size={14} className="shrink-0 text-text-low" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-md border border-line bg-ink-900 shadow-card"
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Поиск…"
              className="w-full border-b border-line bg-transparent px-3 py-2.5 text-[13px] text-text-hi placeholder:text-text-low focus:outline-none"
            />
            <ul ref={listRef} className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-[13px] text-text-low">Ничего не найдено</li>
              )}
              {filtered.map((opt, i) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    data-highlighted={i === highlighted}
                    onMouseEnter={() => setHighlighted(i)}
                    onClick={() => pick(opt.value)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors duration-75',
                      i === highlighted ? 'bg-ink-800 text-text-hi' : 'text-text-mid',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.value === value && <Check size={13} className="text-amber-400" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
