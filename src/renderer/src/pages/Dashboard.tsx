import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AnalyticsData, Session, ExamRun } from '../types'
import { StatCard } from '../components/StatCard'
import { SectionTitle } from '../components/SectionTitle'
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
  const { t, i18n } = useTranslation()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [sessions, setSessions]   = useState<Session[]>([])
  const [examRuns, setExamRuns]   = useState<ExamRun[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [showAllSessions, setShowAllSessions] = useState(false)
  const SESSIONS_PREVIEW = 5

  function load() {
    setError(null)
    setAnalytics(null)
    setSessions([])
    setExamRuns([])
    setLoading(true)
    Promise.all([
      window.api.getAnalytics(30),
      window.api.getRecentSessions(SESSIONS_PREVIEW),
      window.api.getExamRuns(),
    ])
      .then(([a, s, runs]) => {
        setAnalytics(a)
        setSessions(s)
        setExamRuns((runs as ExamRun[]).slice(0, 3))
      })
      .catch(() => setError(t('dashboard.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
        <h1 className="text-xl font-bold text-text">{t('dashboard.title')}</h1>

        {loading && (
          <p className="text-subtext0 text-sm text-center py-10">{t('common.loading')}</p>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-10">
            <p className="text-red text-sm">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1 transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {analytics && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard value={String(analytics.total_sessions)}               label={t('dashboard.totalSessions')} />
              <StatCard value={formatAccuracy(analytics.average_accuracy)}     label={t('dashboard.avgAccuracy')} color="text-green" />
              <StatCard value={formatDuration(analytics.total_time_seconds)}   label={t('dashboard.studyTime')}   color="text-blue" />
              <StatCard value={String(analytics.exam_count)}                   label={t('dashboard.examsSimulated')} color="text-yellow" />
            </div>

            {/* Shortcuts */}
            <div>
              <SectionTitle>
                {t('dashboard.startPractice')}
              </SectionTitle>
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
              <SectionTitle>
                {t('dashboard.recentSessions')}
              </SectionTitle>
              {sessions.length === 0 ? (
                <p className="text-subtext0 text-sm">{t('dashboard.noSessions')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(showAllSessions ? sessions : sessions.slice(0, SESSIONS_PREVIEW)).map(s => (
                    <div
                      key={s.id}
                      onClick={() => navigate(`/review/${s.id}`, { state: { session: s } })}
                      className="flex items-center justify-between px-4 py-3
                        bg-surface0/30 border border-surface0 rounded-lg cursor-pointer
                        hover:border-mauve/40 hover:bg-surface0/60 transition-colors"
                    >
                      <span className="text-sm text-text">
                        {SECTION_LABEL[s.section] ?? s.section}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-green">
                          {s.score != null && s.max_score != null
                            ? `${s.score} / ${s.max_score}`
                            : s.band_score != null
                              ? `${s.band_score}`
                              : '—'}
                        </span>
                        <span className="text-xs text-subtext0">
                          {new Date(s.started_at).toLocaleDateString(i18n.language)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!showAllSessions && sessions.length >= SESSIONS_PREVIEW && (
                    <button
                      onClick={() => {
                        window.api.getRecentSessions(0).then(all => {
                          setSessions(all)
                          setShowAllSessions(true)
                        })
                      }}
                      className="text-sm text-mauve hover:text-mauve/80 transition-colors text-center py-1"
                    >
                      {t('dashboard.showAll')}
                    </button>
                  )}
                  {showAllSessions && (
                    <button
                      onClick={() => setShowAllSessions(false)}
                      className="text-sm text-mauve hover:text-mauve/80 transition-colors text-center py-1"
                    >
                      {t('dashboard.showLess')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Recent exam runs */}
            <div>
              <SectionTitle>
                {t('dashboard.recentExams')}
              </SectionTitle>
              {examRuns.length === 0 ? (
                <p className="text-subtext0 text-sm">{t('dashboard.noExams')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {examRuns.map(r => (
                    <div
                      key={r.id}
                      onClick={() => navigate('/exam')}
                      className="flex items-center justify-between px-4 py-3
                        bg-surface0/30 border border-surface0 rounded-lg cursor-pointer
                        hover:border-mauve/40 hover:bg-surface0/60 transition-colors"
                    >
                      <span className="text-sm text-text">
                        {new Date(r.started_at).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        {r.listening_score != null && (
                          <span className="text-green">🎧 {Math.round(r.listening_score * 100)}%</span>
                        )}
                        {r.reading_score != null && (
                          <span className="text-blue">📖 {Math.round(r.reading_score * 100)}%</span>
                        )}
                        {r.writing_score != null && (
                          <span className="text-yellow">✍️ {r.writing_score.toFixed(1)}</span>
                        )}
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
