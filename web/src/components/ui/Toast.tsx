import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { create } from 'zustand'

type ToastTone = 'ok' | 'err'

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

interface ToastStore {
  toasts: ToastItem[]
  push: (tone: ToastTone, message: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (tone, message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  ok: (message: string) => useToastStore.getState().push('ok', message),
  err: (message: string) => useToastStore.getState().push('err', message),
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-110 flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-md border border-line bg-ink-800 px-4 py-2.5 text-[13px] text-text-hi shadow-card"
          >
            {t.tone === 'ok' ? (
              <CheckCircle2 size={15} className="shrink-0 text-ok" />
            ) : (
              <AlertCircle size={15} className="shrink-0 text-err" />
            )}
            {t.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
