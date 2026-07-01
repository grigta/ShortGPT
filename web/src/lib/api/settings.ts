import { api } from './client'
import type {
  EdgeVoice,
  ElevenLabsVoices,
  HealthOut,
  KeyInfo,
  LanguageOut,
  ModelsResponse,
} from './types'

export const settingsApi = {
  keys: () => api.get<KeyInfo[]>('/api/settings/keys'),
  setKey: (key: string, value: string) =>
    api.put<KeyInfo>(`/api/settings/keys/${encodeURIComponent(key)}`, { value }),
  health: () => api.get<HealthOut>('/api/health'),
  languages: () => api.get<LanguageOut[]>('/api/voices/languages'),
  edgeVoices: () => api.get<EdgeVoice[]>('/api/voices/edge'),
  elevenVoices: () => api.get<ElevenLabsVoices>('/api/voices/elevenlabs'),
  models: (params: {
    q?: string
    free_only?: boolean
    image_only?: boolean
    offset?: number
    limit?: number
  }) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.free_only) q.set('free_only', 'true')
    if (params.image_only) q.set('image_only', 'true')
    q.set('offset', String(params.offset ?? 0))
    q.set('limit', String(params.limit ?? 12))
    return api.get<ModelsResponse>(`/api/models?${q}`)
  },
  selectModel: (model_id: string, target: 'text' | 'image') =>
    api.put<{ target: string; model_id: string }>('/api/models/selected', { model_id, target }),
}
