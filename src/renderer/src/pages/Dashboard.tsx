import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AnalyticsData, Session } from '../types'
import { StatCard } from '../components/StatCard'
import { formatDuration, formatAccuracy } from '../components/analyticsUtils'

const SHORTCUTS = [
  { label: 'Listening', icon: '🎧', to: '/listening' },
  { label: 'Reading',   icon: '📖', to: '/reading'   },
  { label: 'Writing',   icon: '✍️', to: '/writing'   },
]

const SECTION_LABEL: Record<string, string> = {
  listening:       '🎧 Listening',
  reading:         '📖 Reading',
  'writing/task1': '✍️ Writing T1',
  'writing/task2': '✍️ Writing T2',
  writing:         '✍️ Writing',
}

export function Dashboard() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [sessions, setSessions]   = useState<Session[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  function load() {
    setError(null)
    setAnalytics(null)
    setSessions([])
    setLoading(true)
    Promise.all([
      window.api.getAnalytics(30),
      window.api.getRecentSessions(5),
    ])
      .then(([a, s]) => { setAnalytics(a); setSessions(s) })
      .catch(() => setError('Errore nel caricamento dei dati.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
        <h1 className="text-xl font-bold text-text">Dashboard</h1>

        {loading && (
          <p className="text-subtext0 text-sm text-center py-10">Caricamento…</p>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-10">
            <p className="text-red text-sm">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1 transition-colors"
            >
              Riprova
            </button>
          </div>
        )}

        {analytics && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard value={String(analytics.total_sessions)}               label="Sessioni totali" />
              <StatCard value={formatAccuracy(analytics.average_accuracy)}     label="Accuratezza media" color="text-green" />
              <StatCard value={formatDuration(analytics.total_time_seconds)}   label="Tempo studio"     color="text-blue" />
              <StatCard value={String(analytics.exam_count)}                   label="Esami simulati"   color="text-yellow" />
            </div>

            {/* Shortcuts */}
            <div>
              <h2 className="text-xs font-semibold text-subtext0 uppercase tracking-wide mb-3">
                Inizia ad esercitarti
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {SHORTCUTS.map(s => (
                  <button
                    key={s.to}
                    onClick={() => navigate(s.to)}
                    className="flex flex-col items-center gap-2 p-4 bg-surface0/50 rounded-lg
                      border border-surface0 hover:bg-surface0 hover:border-mauve/40 transition-colors"
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-sm font-medium text-text">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent sessions */}
            <div>
              <h2 className="text-xs font-semibold text-subtext0 uppercase tracking-wide mb-3">
                Sessioni recenti
              </h2>
              {sessions.length === 0 ? (
                <p className="text-subtext0 text-sm">Nessuna sessione ancora.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-4 py-3
                        bg-surface0/30 border border-surface0 rounded-lg"
                    >
                      <span className="text-sm text-text">
                        {SECTION_LABEL[s.section] ?? s.section}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-green">
                          {s.score != null && s.max_score != null
                            ? `${s.score} / ${s.max_score}`
                            : '—'}
                        </span>
                        <span className="text-xs text-subtext0">
                          {new Date(s.started_at).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
