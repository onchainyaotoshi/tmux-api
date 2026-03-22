import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function TerminalViewerModal({ sessionName, onClose }) {
  const [windows, setWindows] = useState([])
  const [selectedWindow, setSelectedWindow] = useState(null)
  const [panes, setPanes] = useState([])
  const [selectedPane, setSelectedPane] = useState(null)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const outputRef = useRef(null)

  const fetchOutput = useCallback(async (win, pane) => {
    if (win === null || pane === null) return
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch(`/terminals/${sessionName}/windows/${win}/panes/${pane}/capture`)
      if (!res) return
      setOutput(res.data.content)
      // Auto-scroll to bottom
      setTimeout(() => {
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
      }, 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sessionName])

  const fetchPanes = useCallback(async (win) => {
    try {
      const res = await apiFetch(`/terminals/${sessionName}/windows/${win}/panes`)
      if (!res) return
      setPanes(res.data)
      const firstPane = res.data.length > 0 ? String(res.data[0].index) : null
      setSelectedPane(firstPane)
      if (firstPane !== null) {
        await fetchOutput(win, firstPane)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sessionName, fetchOutput])

  useEffect(() => {
    async function init() {
      try {
        const res = await apiFetch(`/terminals/${sessionName}/windows`)
        if (!res) return
        setWindows(res.data)
        if (res.data.length > 0) {
          const firstWin = String(res.data[0].index)
          setSelectedWindow(firstWin)
          await fetchPanes(firstWin)
        } else {
          setLoading(false)
        }
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }
    init()
  }, [sessionName, fetchPanes])

  const handleWindowChange = async (value) => {
    setSelectedWindow(value)
    setPanes([])
    setSelectedPane(null)
    setOutput('')
    await fetchPanes(value)
  }

  const handlePaneChange = async (value) => {
    setSelectedPane(value)
    await fetchOutput(selectedWindow, value)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-mono">Session: {sessionName}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Window:</span>
            <Select
              value={selectedWindow ?? undefined}
              onValueChange={handleWindowChange}
              disabled={windows.length === 0 || loading}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select window" />
              </SelectTrigger>
              <SelectContent>
                {windows.map((w) => (
                  <SelectItem key={w.index} value={String(w.index)}>
                    {w.index}: {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Pane:</span>
            <Select
              value={selectedPane ?? undefined}
              onValueChange={handlePaneChange}
              disabled={panes.length === 0 || loading}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Select pane" />
              </SelectTrigger>
              <SelectContent>
                {panes.map((p) => (
                  <SelectItem key={p.index} value={String(p.index)}>
                    {p.index}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {windows.length === 0 && !loading ? (
          <p className="py-10 text-center text-muted-foreground">No windows found</p>
        ) : panes.length === 0 && !loading && selectedWindow !== null ? (
          <p className="py-10 text-center text-muted-foreground">No panes found</p>
        ) : (
          <pre
            ref={outputRef}
            className="font-mono text-sm bg-zinc-950 text-zinc-100 p-4 rounded-lg max-h-[60vh] overflow-auto"
          >
            {loading ? 'Loading...' : output || '\n'}
          </pre>
        )}

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOutput(selectedWindow, selectedPane)}
            disabled={loading || selectedWindow === null || selectedPane === null}
          >
            <RefreshCw data-icon="inline-start" className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
