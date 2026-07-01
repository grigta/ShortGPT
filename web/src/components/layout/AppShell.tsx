import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { connectJobEvents } from '../../lib/sse'
import { Toaster } from '../ui/Toast'
import { JobsDock } from './JobsDock'
import { NoiseOverlay } from './NoiseOverlay'
import { Sidebar } from './Sidebar'

export function AppShell() {
  useEffect(() => {
    connectJobEvents()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <JobsDock />
      <Toaster />
      <NoiseOverlay />
    </div>
  )
}
