import { motion } from 'framer-motion'
import { Page } from '../../components/layout/Page'
import { PageHeader } from '../../components/layout/PageHeader'
import { ApiKeysSection } from './ApiKeysSection'
import { ModelCatalog } from './ModelCatalog'

export function SettingsPage() {
  return (
    <Page>
      <PageHeader eyebrow="система" title="Настройки" subtitle="Ключи API и модели OpenRouter" />
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="space-y-12 pb-16"
      >
        {[
          <section key="keys">
            <h2 className="mb-4 text-[16px] font-semibold text-text-hi">Ключи API</h2>
            <ApiKeysSection />
          </section>,
          <ModelCatalog key="text" target="text" title="Модель LLM" />,
          <ModelCatalog key="image" target="image" title="Модель изображений" />,
        ].map((child, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </Page>
  )
}
