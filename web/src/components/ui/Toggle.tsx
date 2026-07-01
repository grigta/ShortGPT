import { cn } from '../../lib/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'group inline-flex items-center gap-2.5 select-none disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      <span
        className={cn(
          'relative h-5.5 w-9.5 rounded-full border transition-colors duration-200',
          checked ? 'border-amber-500/60 bg-amber-500/90' : 'border-line-strong bg-ink-700',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 left-0.5 size-4 -translate-y-1/2 rounded-full transition-transform duration-200 ease-[cubic-bezier(.22,1,.36,1)]',
            checked ? 'translate-x-4 bg-amber-ink' : 'translate-x-0 bg-text-mid',
          )}
        />
      </span>
      {label && <span className="text-[14px] text-text-hi">{label}</span>}
    </button>
  )
}
