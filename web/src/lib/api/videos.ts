import { api } from './client'
import type { VideoFile } from './types'

export const videosApi = {
  list: () => api.get<VideoFile[]>('/api/videos'),
  remove: (filename: string) => api.del(`/api/videos/${encodeURIComponent(filename)}`),
}
