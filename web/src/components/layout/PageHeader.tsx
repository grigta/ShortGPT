import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Мелкая моно-строка над заголовком: «производство», «библиотека»… */
  eyebrow?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, eyebrow, actions }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mb-10 flex items-end justify-between gap-4"
    >
      <div>
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-amber-500/80 uppercase">
            <span aria-hidden className="inline-block h-px w-6 bg-amber-500/50" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-display text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-semibold text-text-hi">
          {title}
        </h1>
        {subtitle && <p className="mt-2.5 max-w-xl text-[14px] text-text-mid">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0 pb-1">{actions}</div>}
    </motion.header>
  )
}
