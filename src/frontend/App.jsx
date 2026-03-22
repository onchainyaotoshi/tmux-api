import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import AgentsPage from './pages/AgentsPage.jsx'
import AboutTmuxPage from './pages/AboutTmuxPage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* Auth callback — centered layout, no sidebar */}
      <Route element={<AuthLayout />}>
        <Route path="/callback" element={<CallbackPage />} />
      </Route>

      {/* Main app — sidebar + content */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <SessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agents"
          element={
            <ProtectedRoute>
              <AgentsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/about-tmux" element={<AboutTmuxPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
