import { motion } from 'framer-motion'
import { useId } from 'react'
import { cn } from '../../lib/cn'

interface TabsProps<T extends string> {
  tabs: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  const layoutId = useId()
  return (
    <div role="tablist" className={cn('flex gap-1 border-b border-line', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative px-3.5 pb-2.5 text-[14px] transition-colors duration-120',
            value === tab.value ? 'text-text-hi' : 'text-text-mid hover:text-text-hi',
          )}
        >
          {tab.label}
          {value === tab.value && (
            <motion.span
              layoutId={layoutId}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-amber-500"
            />
          )}
        </button>
      ))}
    </div>
  )
}
