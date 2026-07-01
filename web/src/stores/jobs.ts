import { create } from 'zustand'
import type { JobEvent, JobOut, JobStatus } from '../lib/api/types'

export interface JobState extends JobOut {
  log: string[]
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
  // log_tail перекрывается с уже накопленным при реконнекте — дописываем только новое
  const merged = [...current]
  for (const line of tail) {
    if (!merged.length || merged[merged.length - 1] !== line) merged.push(line)
  }
  return merged
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
      return {
        jobs: {
          ...s.jobs,
          [e.id]: { ...prev, ...job, log: appendLog(prev?.log ?? [], log_tail) },
        },
      }
    }),

  hydrate: (list) =>
    set((s) => {
      const jobs = { ...s.jobs }
      for (const j of list) {
        const prev = jobs[j.id]
        jobs[j.id] = {
          ...prev,
          ...j,
          log: j.log ?? prev?.log ?? [],
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
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
