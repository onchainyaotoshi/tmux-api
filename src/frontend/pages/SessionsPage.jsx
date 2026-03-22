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
      const res = await apiFetch('/terminals')
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
      await apiFetch(`/terminals/${killTarget}`, { method: 'DELETE' })
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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-mono text-2xl font-bold">Terminals</h2>
        <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
          <RefreshCw data-icon="inline-start" className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sessions.length === 0 && !loading ? (
        <p className="py-10 text-center text-muted-foreground">No active sessions</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Windows</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[160px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.name}>
                <TableCell className="font-mono">{s.name}</TableCell>
                <TableCell>{s.windows}</TableCell>
                <TableCell>{formatDate(s.created)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewTarget(s.name)}
                    >
                      <Eye data-icon="inline-start" />
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setKillTarget(s.name)}
                    >
                      Kill
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
