import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import styles from './SessionsPage.module.css'

export default function SessionsPage() {
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [killTarget, setKillTarget] = useState(null)

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
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Sessions</h2>
        <button className={styles.refreshBtn} onClick={fetchSessions} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {sessions.length === 0 && !loading ? (
        <div className={styles.empty}>No active sessions</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Windows</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.name}>
                <td className={styles.sessionName}>{s.name}</td>
                <td>{s.windows}</td>
                <td>{formatDate(s.created)}</td>
                <td>
                  <button className={styles.killBtn} onClick={() => setKillTarget(s.name)}>
                    Kill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {killTarget && (
        <ConfirmModal
          title="Kill Session"
          message={`Are you sure you want to kill session "${killTarget}"?`}
          onConfirm={handleKill}
          onCancel={() => setKillTarget(null)}
        />
      )}
    </div>
  )
}
