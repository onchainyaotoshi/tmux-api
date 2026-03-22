import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/auth.js'

export default function CallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    auth.handleCallback()
      .then(() => navigate('/sessions', { replace: true }))
      .catch((err) => {
        console.error('Auth callback failed:', err)
        navigate('/', { replace: true })
      })
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Logging in...
    </div>
  )
}
