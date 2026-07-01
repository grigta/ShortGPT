import { api } from './client'
import type { AssetOut, AssetType } from './types'

export const assetsApi = {
  list: () => api.get<AssetOut[]>('/api/assets'),
  addLocal: (file: File, name: string, assetType: AssetType) => {
    const form = new FormData()
    form.set('file', file)
    form.set('name', name)
    form.set('asset_type', assetType)
    return api.postForm<AssetOut>('/api/assets/local', form)
  },
  addRemote: (name: string, assetType: AssetType, url: string) =>
    api.post<AssetOut>('/api/assets/remote', { name, asset_type: assetType, url }),
  remove: (name: string) => api.del(`/api/assets/${encodeURIComponent(name)}`),
}
