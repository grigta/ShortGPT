import { api } from './client'
import type {
  JobDetail,
  JobGroupOut,
  JobOut,
  ShortJobCreate,
  TranslationJobCreate,
  VideoJobCreate,
} from './types'

export const jobsApi = {
  createShorts: (body: ShortJobCreate) => api.post<JobGroupOut>('/api/jobs/shorts', body),
  createVideo: (body: VideoJobCreate) => api.post<JobGroupOut>('/api/jobs/videos', body),
  createTranslations: (body: TranslationJobCreate) =>
    api.post<JobGroupOut>('/api/jobs/translations', body),
  list: (params?: { group_id?: string; status?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.group_id) q.set('group_id', params.group_id)
    if (params?.status) q.set('status', params.status)
    if (params?.limit) q.set('limit', String(params.limit))
    const qs = q.toString()
    return api.get<JobOut[]>(`/api/jobs${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => api.get<JobDetail>(`/api/jobs/${id}`),
  cancel: (id: string) => api.post<JobOut>(`/api/jobs/${id}/cancel`),
}
