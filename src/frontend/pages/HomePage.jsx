import { Navigate } from 'react-router-dom'
import { TerminalSquare } from 'lucide-react'
import { auth } from '../lib/auth.js'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  if (auth.isAuthenticated()) {
    return <Navigate to="/sessions" replace />
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <TerminalSquare className="mb-4 h-12 w-12 text-primary" />
      <h1 className="mb-3 font-mono text-4xl font-bold">Foreman</h1>
      <p className="mb-8 text-lg text-muted-foreground">Tmux REST API & workforce manager</p>
      <Button size="lg" onClick={() => auth.login()}>
        Login
      </Button>
    </div>
  )
}
