// Контракт с FastAPI-бэкендом (см. план mutable-dreaming-toast.md).
// Поля — snake_case, как в JSON бэкенда.

export type JobKind = 'short' | 'video' | 'translation'
export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled'

export interface JobOut {
  id: string
  kind: JobKind
  status: JobStatus
  step: number
  total_steps: number
  step_label: string
  group_id: string | null
  result_path: string | null
  video_url: string | null
  error: string | null
  created_at: string
  cancel_requested: boolean
}

export interface JobDetail extends JobOut {
  log: string[]
}

export interface JobGroupOut {
  group_id: string
  jobs: JobOut[]
}

export interface JobEvent extends JobOut {
  log_tail?: string[]
}

export interface VoiceSpec {
  engine: 'edge' | 'elevenlabs'
  language: string
  gender?: 'male' | 'female'
  voice_name?: string
}

export interface ShortJobCreate {
  short_type: 'reddit' | 'facts'
  facts_subject?: string
  num_shorts: number
  background_video: string
  background_music: string
  num_images?: number
  watermark?: string
  language: string
  voice: VoiceSpec
}

export interface VideoJobCreate {
  script: string
  vertical: boolean
  language: string
  voice: VoiceSpec
}

export interface TranslationJobCreate {
  src_url: string
  target_languages: string[]
  use_captions: boolean
  voice: VoiceSpec
}

export type AssetType =
  | 'background video'
  | 'background music'
  | 'image'
  | 'video'
  | 'audio'
  | 'other'

export interface AssetOut {
  name: string
  type: AssetType
  source: string
  link: string
  duration: number | null
}

export interface VideoFile {
  filename: string
  url: string
  size: number
  mtime: number
}

export interface LanguageOut {
  name: string
  value: string
}

export interface EdgeVoice {
  language: string
  male: string
  female: string
}

export interface ElevenLabsVoices {
  available: boolean
  voices: string[]
}

export interface KeyInfo {
  key: string
  label: string
  is_secret: boolean
  is_set: boolean
  masked_value: string
}

export interface ModelSummary {
  id: string
  name: string
  context: number | null
  prompt_price: number | null
  completion_price: number | null
  modality: string
  is_free: boolean
  description: string
}

export interface ModelsResponse {
  total: number
  items: ModelSummary[]
  selected: string
  selected_image: string
}

export interface HealthOut {
  status: string
  keys: Record<string, boolean>
  jobs_running: number
}
