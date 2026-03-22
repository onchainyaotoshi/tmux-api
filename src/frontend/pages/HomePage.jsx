import { Navigate } from 'react-router-dom'
import { TerminalSquare, Eye, Wifi } from 'lucide-react'
import { auth } from '../lib/auth.js'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const features = [
  {
    icon: TerminalSquare,
    title: 'Sessions',
    description: 'Manage tmux sessions via REST API. Create, kill, and monitor from anywhere.',
  },
  {
    icon: Eye,
    title: 'Capture',
    description: 'View terminal output in real-time. See what your agents are doing without SSH.',
  },
  {
    icon: Wifi,
    title: 'API',
    description: 'Full REST API with Swagger docs. Integrate Foreman into your automation pipeline.',
  },
]

export default function HomePage() {
  if (auth.isAuthenticated()) {
    return <Navigate to="/sessions" replace />
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <TerminalSquare className="mb-4 size-10 text-primary" />
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Orchestrate your AI workforce
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Manage tmux sessions via REST API. Persistent terminal sessions controlled over HTTP.
      </p>

      <Button
        size="lg"
        className="mt-8"
        onClick={() => auth.login()}
      >
        Get Started
      </Button>

      <div className="mt-16 grid w-full max-w-3xl gap-4 text-left sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="bg-card border-border">
            <CardHeader>
              <Icon className="mb-2 size-5 text-primary" />
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
