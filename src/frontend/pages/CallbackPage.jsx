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

  return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Logging in...</div>
}
