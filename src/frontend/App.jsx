import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import KnowledgeBasePage from './pages/KnowledgeBasePage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="*"
        element={
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-64 flex-1 p-6 md:p-10">
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
        }
      />
    </Routes>
  )
}

export default App
