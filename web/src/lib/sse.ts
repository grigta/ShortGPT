import { useJobsStore } from '../stores/jobs'
import { api } from './api/client'
import type { JobEvent, JobOut } from './api/types'

// Singleton-подписка на глобальный SSE-поток job'ов.
// EventSource сам реконнектится; после каждого open заново гидрируемся снапшотом.

let source: EventSource | null = null

async function hydrateFromSnapshot() {
  try {
    const jobs = await api.get<JobOut[]>('/api/jobs?limit=100')
    useJobsStore.getState().hydrate(jobs)
  } catch {
    // бэкенд недоступен — состояние придёт со следующим реконнектом
  }
}

export function connectJobEvents() {
  if (source) return
  source = new EventSource('/api/jobs/events')
  const store = useJobsStore.getState()

  const onEvent = (ev: MessageEvent) => {
    try {
      store.applyEvent(JSON.parse(ev.data) as JobEvent)
    } catch (err) {
      console.error('[sse] некорректное событие', err, ev.data)
    }
  }

  for (const name of ['progress', 'done', 'error', 'cancelled']) {
    source.addEventListener(name, onEvent)
  }
  source.onopen = () => {
    useJobsStore.getState().setConnected(true)
    void hydrateFromSnapshot()
  }
  source.onerror = () => {
    useJobsStore.getState().setConnected(false)
  }
}
