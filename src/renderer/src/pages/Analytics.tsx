import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { AnalyticsData } from '../types'
import { StatCard } from '../components/StatCard'
import { formatDuration, formatAccuracy } from '../components/analyticsUtils'

type DaysFilter = 7 | 30 | 0

const FILTERS: { label: string; value: DaysFilter }[] = [
  { label: '7 giorni', value: 7  },
  { label: '30 giorni', value: 30 },
  { label: 'Tutto',    value: 0  },
]

function accuracyColor(ratio: number): string {
  if (ratio >= 0.8) return 'text-green'
  if (ratio >= 0.6) return 'text-yellow'
  return 'text-red'
}

export function Analytics() {
  const [days, setDays]           = useState<DaysFilter>(30)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting]       = useState(false)

  async function handleReset() {
    setResetting(true)
    await window.api.resetAllData()
    setConfirmReset(false)
    setResetting(false)
    load(days)
  }

  function load(d: DaysFilter) {
    setError(null)
    setAnalytics(null)
    setLoading(true)
    window.api.getAnalytics(d)
      .then(a => setAnalytics(a))
      .catch(() => setError('Errore nel caricamento dei dati.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(days) }, [days])

  const activeTypes = analytics?.accuracy_by_type.filter(t => t.attempts > 0) ?? []

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
        {/* Header + filter */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-text">Analytics</h1>
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setDays(f.value)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  days === f.value
                    ? 'bg-mauve text-base font-medium'
                    : 'bg-surface0 text-subtext0 hover:text-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="text-subtext0 text-sm text-center py-10">Caricamento…</p>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-10">
            <p className="text-red text-sm">{error}</p>
            <button
              onClick={() => load(days)}
              className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1 transition-colors"
            >
              Riprova
            </button>
          </div>
        )}

        {analytics && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard value={String(analytics.total_sessions)}             label="Sessioni totali" />
              <StatCard value={formatAccuracy(analytics.average_accuracy)}   label="Accuratezza media" color="text-green" />
              <StatCard value={formatDuration(analytics.total_time_seconds)} label="Tempo studio"     color="text-blue" />
              <StatCard value={String(analytics.exam_count)}                 label="Esami simulati"   color="text-yellow" />
            </div>

            {/* Weekly bar chart */}
            <div className="bg-surface0/30 border border-surface0 rounded-lg p-5">
              <h2 className="text-xs font-semibold text-subtext0 uppercase tracking-wide mb-4">
                Punteggio per settimana (band IELTS)
              </h2>
              {analytics.sessions_by_week.length === 0 ? (
                <p className="text-subtext0 text-sm text-center py-8">
                  Nessun dato disponibile per il periodo selezionato.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={analytics.sessions_by_week}
                    barGap={2}
                    barCategoryGap="30%"
                  >
                    <XAxis
                      dataKey="week"
                      tickFormatter={w => (w as string).slice(5)}
                      tick={{ fill: '#6c7086', fontSize: 11 }}
                    />
                    <YAxis domain={[0, 9]} tick={{ fill: '#6c7086', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#1e1e2e',
                        border: '1px solid #313244',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="listening" name="Listening" fill="#89b4fa" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="reading"   name="Reading"   fill="#a6e3a1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="writing"   name="Writing"   fill="#cba6f7" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Accuracy by type */}
            <div>
              <h2 className="text-xs font-semibold text-subtext0 uppercase tracking-wide mb-3">
                Accuratezza per tipo di domanda
              </h2>
              {activeTypes.length === 0 ? (
                <p className="text-subtext0 text-sm">Nessun dato.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {activeTypes.map(t => (
                    <div
                      key={t.question_type}
                      className="bg-surface0/30 border border-surface0 rounded-lg p-3"
                    >
                      <div className={`text-xl font-bold ${accuracyColor(t.accuracy)}`}>
                        {formatAccuracy(t.accuracy)}
                      </div>
                      <div className="text-xs text-subtext0 mt-0.5">{t.question_type}</div>
                      <div className="text-xs text-surface2 mt-0.5">{t.attempts} risposte</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {/* Danger zone */}
        <div className="border border-red/30 rounded-lg p-5">
          <h2 className="text-xs font-semibold text-red/80 uppercase tracking-wide mb-1">Zona pericolosa</h2>
          <p className="text-xs text-subtext0 mb-4">Elimina tutti i dati (sessioni, risposte, esami, flashcard). L'operazione è irreversibile.</p>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="px-4 py-2 bg-red/10 text-red border border-red/30 rounded text-sm hover:bg-red/20 transition-colors"
            >
              Cancella tutti i dati
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-text">Sei sicuro? Questa azione non può essere annullata.</span>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="px-4 py-2 bg-red text-base rounded text-sm font-medium hover:bg-red/90 transition-colors disabled:opacity-50"
              >
                {resetting ? 'Eliminazione…' : 'Sì, elimina tutto'}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 bg-surface0 text-subtext0 rounded text-sm hover:text-text transition-colors"
              >
                Annulla
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
