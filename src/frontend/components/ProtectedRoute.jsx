import { Navigate } from 'react-router-dom'
import { auth } from '../lib/auth.js'

export default function ProtectedRoute({ children }) {
  if (!auth.isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  return children
}
