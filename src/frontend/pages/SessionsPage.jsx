import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Eye } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ConfirmModal from '../components/ConfirmModal.jsx'
import TerminalViewerModal from '../components/TerminalViewerModal.jsx'

export default function SessionsPage() {
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [killTarget, setKillTarget] = useState(null)
  const [viewTarget, setViewTarget] = useState(null)

  const fetchSessions = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const res = await apiFetch('/sessions')
      setSessions(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleKill = async () => {
    if (!killTarget) return
    try {
      await apiFetch(`/sessions/${killTarget}`, { method: 'DELETE' })
      setKillTarget(null)
      fetchSessions()
    } catch (err) {
      setError(err.message)
      setKillTarget(null)
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  return (
    <div className="max-w-3xl">
      {/* Terminal prompt header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-mono text-lg">
          <span className="text-primary">user@foreman</span>
          <span className="text-muted-foreground">:</span>
          <span className="text-secondary">~/sessions</span>
          <span className="text-muted-foreground">$ </span>
          <span className="animate-blink">█</span>
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSessions}
          disabled={loading}
          className="border-primary/30 text-primary hover:bg-primary/10 font-mono text-xs"
        >
          <RefreshCw data-icon="inline-start" className={loading ? 'animate-spin' : ''} />
          {loading ? 'loading...' : '↻ refresh'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sessions.length === 0 && !loading ? (
        <p className="py-10 text-center font-mono text-muted-foreground">
          &gt; no active sessions. create one to get started.
          <span className="animate-blink">_</span>
        </p>
      ) : (
        <div className="rounded-lg border border-primary/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-primary/15 hover:bg-transparent">
                <TableHead className="text-primary font-mono text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-primary font-mono text-xs uppercase tracking-wider">Windows</TableHead>
                <TableHead className="text-primary font-mono text-xs uppercase tracking-wider">Created</TableHead>
                <TableHead className="w-[180px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.name} className="border-b border-border/50 hover:bg-accent/30">
                  <TableCell className="font-mono text-foreground">{s.name}</TableCell>
                  <TableCell className="font-mono text-secondary">{s.windows}</TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">{formatDate(s.created)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewTarget(s.name)}
                        className="border-primary/30 text-primary hover:bg-primary/10 font-mono text-xs"
                      >
                        ▸ view
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setKillTarget(s.name)}
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 font-mono text-xs"
                      >
                        × kill
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {killTarget && (
        <ConfirmModal
          title="Kill Session"
          message={`Are you sure you want to kill session "${killTarget}"?`}
          onConfirm={handleKill}
          onCancel={() => setKillTarget(null)}
        />
      )}

      {viewTarget && (
        <TerminalViewerModal
          sessionName={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  )
}
