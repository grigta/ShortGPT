import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '../lib/api/settings'

export function useEdgeVoices() {
  return useQuery({
    queryKey: ['voices-edge'],
    queryFn: settingsApi.edgeVoices,
    staleTime: Infinity,
  })
}

export function useElevenVoices() {
  return useQuery({
    queryKey: ['voices-eleven'],
    queryFn: settingsApi.elevenVoices,
    staleTime: 300_000,
    retry: false,
  })
}
