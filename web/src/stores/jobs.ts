import { create } from 'zustand'
import type { JobEvent, JobOut, JobStatus } from '../lib/api/types'

export interface JobState extends JobOut {
  log: string[]
  /** Подписи пройденных шагов по номеру шага (накапливаются из live-событий). */
  step_labels: Record<number, string>
}

interface JobsStore {
  jobs: Record<string, JobState>
  connected: boolean
  applyEvent: (e: JobEvent) => void
  hydrate: (jobs: (JobOut & { log?: string[] })[]) => void
  setConnected: (v: boolean) => void
}

const ACTIVE: JobStatus[] = ['queued', 'running']

function appendLog(current: string[], tail: string[] | undefined): string[] {
  if (!tail?.length) return current
  // log_tail (последние N строк) перекрывается с накопленным логом —
  // ищем максимальное перекрытие «хвост current == начало tail» и дописываем остаток
  const max = Math.min(current.length, tail.length)
  for (let k = max; k > 0; k--) {
    let match = true
    for (let i = 0; i < k; i++) {
      if (current[current.length - k + i] !== tail[i]) {
        match = false
        break
      }
    }
    if (match) return k === tail.length ? current : [...current, ...tail.slice(k)]
  }
  return [...current, ...tail]
}

export const useJobsStore = create<JobsStore>((set) => ({
  jobs: {},
  connected: false,

  applyEvent: (e) =>
    set((s) => {
      const prev = s.jobs[e.id]
      // идемпотентность: устаревший progress поверх более свежего состояния игнорируем
      if (
        prev &&
        prev.status === e.status &&
        e.status === 'running' &&
        e.step < prev.step
      ) {
        return s
      }
      const { log_tail, ...job } = e
      const step_labels = { ...prev?.step_labels }
      if (e.step >= 1 && e.step_label) step_labels[e.step] = e.step_label
      return {
        jobs: {
          ...s.jobs,
          [e.id]: {
            ...prev,
            ...job,
            log: appendLog(prev?.log ?? [], log_tail),
            step_labels,
          },
        },
      }
    }),

  hydrate: (list) =>
    set((s) => {
      const jobs = { ...s.jobs }
      for (const j of list) {
        const prev = jobs[j.id]
        const step_labels = { ...prev?.step_labels }
        if (j.step >= 1 && j.step_label) step_labels[j.step] = j.step_label
        jobs[j.id] = {
          ...prev,
          ...j,
          log: j.log ?? prev?.log ?? [],
          step_labels,
        }
      }
      return { jobs }
    }),

  setConnected: (v) => set({ connected: v }),
}))

export const selectActiveJobs = (s: JobsStore) =>
  Object.values(s.jobs).filter((j) => ACTIVE.includes(j.status))

export const selectGroup = (groupId: string) => (s: JobsStore) =>
  Object.values(s.jobs)
    .filter((j) => j.group_id === groupId || j.id === groupId)
    .sort(
      (a, b) => (a.created_at ?? 0) - (b.created_at ?? 0) || a.id.localeCompare(b.id),
    )
