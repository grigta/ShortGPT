import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { AssetsPage } from './features/assets/AssetsPage'
import { CreateShortPage } from './features/create-short/CreateShortPage'
import { CreateVideoPage } from './features/create-video/CreateVideoPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { JobScenePage } from './features/jobs/JobScenePage'
import { KitPage } from './features/kit/KitPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { TranslatePage } from './features/translate/TranslatePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="create/short" element={<CreateShortPage />} />
            <Route path="create/video" element={<CreateVideoPage />} />
            <Route path="translate" element={<TranslatePage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="jobs/:groupId" element={<JobScenePage />} />
            {import.meta.env.DEV && <Route path="dev/kit" element={<KitPage />} />}
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
