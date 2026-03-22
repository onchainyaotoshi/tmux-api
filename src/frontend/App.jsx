import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import KnowledgeBasePage from './pages/KnowledgeBasePage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'
import { SidebarProvider, useSidebar } from './hooks/use-sidebar.jsx'
import { useIsMobile } from './hooks/use-mobile.jsx'
import { cn } from '@/lib/utils'

function AppLayout() {
  const { collapsed } = useSidebar()
  const isMobile = useIsMobile()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className={cn(
          'flex-1 p-6 md:p-10 transition-[margin] duration-200 ease-in-out',
          isMobile ? 'mt-12' : (collapsed ? 'ml-16' : 'ml-56')
        )}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/sessions"
            element={
              <ProtectedRoute>
                <SessionsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <SidebarProvider>
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </SidebarProvider>
  )
}

export default App
