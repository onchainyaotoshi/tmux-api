import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import { useIsMobile } from '@/hooks/use-mobile'

export default function AppLayout() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <main className="p-4 pt-18">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <Sidebar />
      <main className="overflow-auto p-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
