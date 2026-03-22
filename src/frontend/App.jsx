import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import KnowledgeBasePage from './pages/KnowledgeBasePage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'
import styles from './App.module.css'

function App() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <div className={styles.layout}>
              <Sidebar />
              <main className={styles.main}>
                <Routes>
                  <Route path="/" element={<SessionsPage />} />
                  <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
