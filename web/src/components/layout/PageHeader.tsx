import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 flex items-end justify-between gap-4"
    >
      <div>
        <h1 className="text-display text-[28px] font-semibold text-text-hi">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-text-mid">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </motion.header>
  )
}
