import { useEffect, useState } from 'react'
import { auth } from '../lib/auth.js'

export default function ProtectedRoute({ children }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (auth.isAuthenticated()) {
      setReady(true)
    } else {
      auth.login()
    }
  }, [])

  if (!ready) return null

  return children
}
