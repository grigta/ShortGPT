import { api } from './client'

export const scriptApi = {
  generate: (description: string, language: string) =>
    api.post<{ script: string }>('/api/script', { description, language }),
  correct: (script: string, correction: string) =>
    api.post<{ script: string }>('/api/script/correct', { script, correction }),
}
