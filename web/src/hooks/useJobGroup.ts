import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { jobsApi } from '../lib/api/jobs'
import { selectGroup, useJobsStore, type JobState } from '../stores/jobs'

/**
 * Job'ы группы: живые обновления из SSE-стора + гидрация полным снапшотом
 * (с логами) на маунте — F5 на сцене полностью восстанавливает состояние.
 */
export function useJobGroup(groupId: string): JobState[] {
  const jobs = useJobsStore(useShallow(selectGroup(groupId)))

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const list = await jobsApi.list({ group_id: groupId, limit: 50 })
        const details = await Promise.all(list.map((j) => jobsApi.get(j.id)))
        if (alive) useJobsStore.getState().hydrate(details)
      } catch {
        // бэкенд недоступен — состояние догонит SSE-реконнект
      }
    })()
    return () => {
      alive = false
    }
  }, [groupId])

  return jobs
}
