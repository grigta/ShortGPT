import { X } from 'lucide-react'
import { useMemo, useState } from 'react'

interface MultiChipSelectProps {
  options: { value: string; label: string }[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

/** Мультивыбор чипами с поиском — языки перевода и т.п. */
export function MultiChipSelect({
  options,
  values,
  onChange,
  placeholder = 'Начните вводить…',
  className,
}: MultiChipSelectProps) {
  const [query, setQuery] = useState('')

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options
      .filter((o) => !values.includes(o.value))
      .filter((o) => !q || o.label.toLowerCase().includes(q))
      .slice(0, 24)
  }, [options, values, query])

  const add = (v: string) => {
    onChange([...values, v])
    setQuery('')
  }
  const remove = (v: string) => onChange(values.filter((x) => x !== v))

  return (
    <div className={className}>
      {values.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {values.map((v) => {
            const opt = options.find((o) => o.value === v)
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 py-1 pr-1.5 pl-3 text-[13px] text-amber-400"
              >
                {opt?.label ?? v}
                <button
                  type="button"
                  aria-label={`Убрать ${opt?.label ?? v}`}
                  onClick={() => remove(v)}
                  className="rounded-full p-0.5 transition-colors duration-120 hover:bg-amber-500/20"
                >
                  <X size={12} />
                </button>
              </span>
            )
          })}
        </div>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-sm border border-line bg-ink-800 px-3 text-[14px] text-text-hi placeholder:text-text-low transition-colors duration-120 hover:border-line-strong focus:border-amber-500/60 focus:outline-none"
      />
      <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
        {suggestions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => add(opt.value)}
            className="rounded-full border border-line bg-ink-800 px-3 py-1 text-[13px] text-text-mid transition-colors duration-120 hover:border-line-strong hover:text-text-hi"
          >
            {opt.label}
          </button>
        ))}
        {suggestions.length === 0 && (
          <span className="py-1 text-[13px] text-text-low">
            {options.length === values.length ? 'Все варианты выбраны' : 'Ничего не найдено'}
          </span>
        )}
      </div>
    </div>
  )
}
