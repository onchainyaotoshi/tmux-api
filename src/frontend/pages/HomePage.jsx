import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { TerminalSquare, Eye, Wifi } from 'lucide-react'
import { auth } from '../lib/auth.js'
import { Button } from '@/components/ui/button'
import MatrixRain from '../components/MatrixRain.jsx'

const ASCII_LOGO = `
 ███████  ██████  ██████  ███████ ███    ███  █████  ███    ██
 ██      ██    ██ ██   ██ ██      ████  ████ ██   ██ ████   ██
 █████   ██    ██ ██████  █████   ██ ████ ██ ███████ ██ ██  ██
 ██      ██    ██ ██   ██ ██      ██  ██  ██ ██   ██ ██  ██ ██
 ██       ██████  ██   ██ ███████ ██      ██ ██   ██ ██   ████`

const TAGLINE = '> orchestrate your AI workforce'

const features = [
  {
    file: 'sessions.sh',
    icon: TerminalSquare,
    text: 'Manage tmux sessions via REST API. Create, kill, and monitor from anywhere.',
  },
  {
    file: 'capture.sh',
    icon: Eye,
    text: 'Capture terminal output in real-time. See what your agents are doing without SSH.',
  },
  {
    file: 'api.sh',
    icon: Wifi,
    text: 'Full REST API with Swagger docs. Integrate Foreman into your automation pipeline.',
  },
]

function useTypingEffect(text, speed = 50) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(text)
      setDone(true)
      return
    }
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return { displayed, done }
}

function FeatureCard({ file, icon: Icon, text }) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-0 transition-transform hover:-translate-y-1">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span className="text-primary">┌───</span>
        <span>{file}</span>
        <span className="text-primary ml-auto">───┐</span>
      </div>
      <div className="flex items-start gap-3 p-4">
        <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  if (auth.isAuthenticated()) {
    return <Navigate to="/sessions" replace />
  }

  const { displayed, done } = useTypingEffect(TAGLINE)

  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center text-center">
      <MatrixRain />

      <div className="relative z-10">
        {/* ASCII Logo */}
        <pre
          role="img"
          aria-label="Foreman"
          className="mb-6 text-xs leading-tight text-primary sm:text-sm md:text-base"
        >
          {ASCII_LOGO}
        </pre>

        {/* Tagline with typing effect */}
        <p className="mb-8 font-mono text-lg text-muted-foreground">
          {displayed}
          {!done && <span className="animate-blink">█</span>}
          {done && <span className="animate-blink">_</span>}
        </p>

        {/* Login button */}
        <Button
          size="lg"
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10 hover:text-primary font-mono"
          onClick={() => auth.login()}
        >
          $ foreman login
        </Button>

        {/* Feature cards */}
        <div className="mt-16 grid max-w-3xl gap-4 text-left md:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.file} {...f} />
          ))}
        </div>
      </div>
    </div>
  )
}
