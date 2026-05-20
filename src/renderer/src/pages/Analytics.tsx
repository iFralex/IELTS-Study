import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import type { AnalyticsData } from '../types'
import { StatCard } from '../components/StatCard'
import { formatDuration, formatAccuracy } from '../components/analyticsUtils'

type DaysFilter = 7 | 30 | 0

const SECTION_COLOR: Record<string, string> = { listening: 'text-blue', reading: 'text-green', writing: 'text-mauve' }
const SECTION_BAR: Record<string, string>   = { listening: 'bg-blue',   reading: 'bg-green',   writing: 'bg-mauve' }

function accuracyColor(r: number) { return r >= 0.8 ? 'text-green' : r >= 0.6 ? 'text-yellow' : 'text-red' }
function accuracyBarColor(r: number) { return r >= 0.8 ? 'bg-green' : r >= 0.6 ? 'bg-yellow' : 'bg-red' }

function formatSeconds(s: number): string {
  if (!s || s < 1) return '—'
  if (s < 60) return `${Math.round(s)}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

function BandBadge({ band }: { band: number }) {
  if (!band) return <span className="text-subtext0 text-sm">—</span>
  const color = band >= 7 ? 'text-green' : band >= 6 ? 'text-yellow' : 'text-red'
  return <span className={`text-3xl font-bold ${color}`}>{band.toFixed(1)}</span>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-subtext0 uppercase tracking-wide mb-3">
      {children}
    </h2>
  )
}

const tooltipStyle = { background: '#1e1e2e', border: '1px solid #313244', borderRadius: 6, fontSize: 12 }
const cursorStyle  = { fill: 'rgba(255,255,255,0.04)' }

export function Analytics() {
  const { t } = useTranslation()
  const [days, setDays]           = useState<DaysFilter>(30)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting]       = useState(false)

  const FILTERS: { label: string; value: DaysFilter }[] = [
    { label: t('analytics.last7Days'),  value: 7  },
    { label: t('analytics.last30Days'), value: 30 },
    { label: t('analytics.allTime'),    value: 0  },
  ]

  const SECTION_LABEL: Record<string, string> = {
    listening: t('sidebar.listening'),
    reading:   t('sidebar.reading'),
    writing:   t('sidebar.writing'),
  }

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
      .catch(() => setError(t('dashboard.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(days) }, [days])

  const activeTypes = analytics?.accuracy_by_type.filter(row => row.attempts > 0) ?? []
  const weakest = activeTypes.length > 0
    ? activeTypes.reduce((min, row) => row.accuracy < min.accuracy ? row : min)
    : null

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-8">

        {/* Header + filter */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-text">{t('analytics.title')}</h1>
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setDays(f.value)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  days === f.value ? 'bg-mauve text-base font-medium' : 'bg-surface0 text-subtext0 hover:text-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-subtext0 text-sm text-center py-10">{t('common.loading')}</p>}
        {error && (
          <div className="flex flex-col items-center gap-4 py-10">
            <p className="text-red text-sm">{error}</p>
            <button onClick={() => load(days)} className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1 transition-colors">{t('common.retry')}</button>
          </div>
        )}

        {analytics && (
          <>
            {/* ── Stat cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <StatCard value={String(analytics.total_sessions)}             label={t('analytics.sessions')} />
              <StatCard value={formatAccuracy(analytics.average_accuracy)}   label={t('analytics.accuracy')} color="text-green" />
              <StatCard value={formatDuration(analytics.total_time_seconds)} label={t('analytics.time')} color="text-blue" />
              <StatCard value={String(analytics.days_active)}                label={t('analytics.activeDays')} color="text-yellow" />
              <StatCard value={`${analytics.current_streak}d`}              label={t('analytics.streak')} color="text-peach" />
              <StatCard value={String(analytics.exam_count)}                 label={t('analytics.exams')} color="text-mauve" />
            </div>

            {/* ── Band stimata attuale ────────────────────────────────────── */}
            {(analytics.estimated_bands.listening > 0 || analytics.estimated_bands.reading > 0 || analytics.estimated_bands.writing > 0) && (
              <div>
                <SectionTitle>{t('analytics.estimatedBand')}</SectionTitle>
                <div className="bg-surface0/30 border border-surface0 rounded-lg p-5">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    {(['listening','reading','writing'] as const).map(sec => (
                      <div key={sec} className="flex flex-col gap-1">
                        <div className={`text-xs font-semibold uppercase tracking-wide ${SECTION_COLOR[sec]}`}>{SECTION_LABEL[sec]}</div>
                        <BandBadge band={analytics.estimated_bands[sec]} />
                      </div>
                    ))}
                    <div className="flex flex-col gap-1 border-l border-surface1 pl-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-subtext0">{t('common.overall')}</div>
                      <BandBadge band={analytics.estimated_bands.overall} />
                    </div>
                  </div>
                  <p className="text-xs text-surface2 mt-3 text-center">{t('analytics.periodAverage')}</p>
                </div>
              </div>
            )}

            {/* ── Punto debole ────────────────────────────────────────────── */}
            {weakest && weakest.accuracy < 0.7 && (
              <div className="bg-red/5 border border-red/20 rounded-lg px-4 py-3 flex items-center gap-3">
                <span className="text-red text-lg">⚠</span>
                <div>
                  <p className="text-sm text-text font-medium">
                    {t('analytics.weakPoint')} <span className="text-red">{weakest.question_type.replace(/_/g, ' ')}</span>
                    <span className="font-normal text-subtext0"> — {formatAccuracy(weakest.accuracy)} · {weakest.attempts} {t('analytics.answers')}</span>
                  </p>
                  <p className="text-xs text-subtext0 mt-0.5">{t('analytics.weakPointHint')}</p>
                </div>
              </div>
            )}

            {/* ── Band nel tempo ──────────────────────────────────────────── */}
            <div>
              <SectionTitle>{t('analytics.bandTrend')}</SectionTitle>
              <div className="bg-surface0/30 border border-surface0 rounded-lg p-5">
                {analytics.sessions_by_week.length === 0 ? (
                  <p className="text-subtext0 text-sm text-center py-8">{t('analytics.noDataForPeriod')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.sessions_by_week} barGap={2} barCategoryGap="30%">
                      <XAxis dataKey="week" tickFormatter={w => (w as string).slice(5)} tick={{ fill: '#6c7086', fontSize: 11 }} />
                      <YAxis domain={[0, 9]} tick={{ fill: '#6c7086', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="listening" name={SECTION_LABEL.listening} fill="#89b4fa" radius={[3,3,0,0]} />
                      <Bar dataKey="reading"   name={SECTION_LABEL.reading}   fill="#a6e3a1" radius={[3,3,0,0]} />
                      <Bar dataKey="writing"   name={SECTION_LABEL.writing}   fill="#cba6f7" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Trend accuratezza ────────────────────────────────────────── */}
            {analytics.accuracy_trend.length >= 3 && (
              <div>
                <SectionTitle>{t('analytics.accuracyTrend')}</SectionTitle>
                <div className="bg-surface0/30 border border-surface0 rounded-lg p-5">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={analytics.accuracy_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                      <XAxis dataKey="date" tickFormatter={d => (d as string).slice(5)} tick={{ fill: '#6c7086', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#6c7086', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="listening" name={SECTION_LABEL.listening} stroke="#89b4fa" strokeWidth={2} dot={false} connectNulls />
                      <Line type="monotone" dataKey="reading"   name={SECTION_LABEL.reading}   stroke="#a6e3a1" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Per sezione ──────────────────────────────────────────────── */}
            {analytics.by_section.length > 0 && (
              <div>
                <SectionTitle>{t('analytics.bySection')}</SectionTitle>
                <div className="grid grid-cols-3 gap-3">
                  {analytics.by_section.map(s => (
                    <div key={s.section} className="bg-surface0/30 border border-surface0 rounded-lg p-4 flex flex-col gap-2">
                      <div className={`text-xs font-semibold uppercase tracking-wide ${SECTION_COLOR[s.section] ?? 'text-text'}`}>
                        {SECTION_LABEL[s.section] ?? s.section}
                      </div>
                      <div className={`text-2xl font-bold ${accuracyColor(s.accuracy)}`}>{formatAccuracy(s.accuracy)}</div>
                      <div className="h-1.5 bg-surface1 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${SECTION_BAR[s.section] ?? 'bg-mauve'} opacity-70`} style={{ width: `${Math.round(s.accuracy * 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-subtext0 mt-0.5">
                        <span>{s.sessions} {t('analytics.sessions').toLowerCase()}</span>
                        <span>{formatDuration(s.total_time_seconds)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Per tipo di domanda ──────────────────────────────────────── */}
            {activeTypes.length > 0 && (
              <div>
                <SectionTitle>{t('analytics.byQuestionType')}</SectionTitle>
                <div className="bg-surface0/30 border border-surface0 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface0 text-xs text-subtext0 uppercase tracking-wide">
                        <th className="text-left px-4 py-2.5 font-medium">{t('analytics.type')}</th>
                        <th className="text-left px-4 py-2.5 font-medium">{t('analytics.accuracy')}</th>
                        <th className="text-right px-4 py-2.5 font-medium">{t('analytics.timePerQuestion')}</th>
                        <th className="text-right px-4 py-2.5 font-medium">{t('analytics.speed')}</th>
                        <th className="text-right px-4 py-2.5 font-medium">{t('analytics.answers')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTypes.map((row, i) => {
                        const trend = analytics.speed_trend.find(x => x.question_type === row.question_type)
                        const faster = trend && trend.recent_avg < trend.older_avg * 0.95
                        const slower = trend && trend.recent_avg > trend.older_avg * 1.05
                        return (
                          <tr key={row.question_type} className={i < activeTypes.length - 1 ? 'border-b border-surface0/60' : ''}>
                            <td className="px-4 py-3 text-text font-medium">{row.question_type.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-surface1 rounded-full overflow-hidden min-w-[60px]">
                                  <div className={`h-full rounded-full ${accuracyBarColor(row.accuracy)}`} style={{ width: `${Math.round(row.accuracy * 100)}%` }} />
                                </div>
                                <span className={`text-xs font-semibold w-9 text-right ${accuracyColor(row.accuracy)}`}>{formatAccuracy(row.accuracy)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-subtext0 text-xs tabular-nums">{formatSeconds(row.avg_time_per_question)}</td>
                            <td className="px-4 py-3 text-right text-xs">
                              {faster && <span className="text-green">▲ {t('analytics.faster')}</span>}
                              {slower && <span className="text-red">▼ {t('analytics.slower')}</span>}
                              {!faster && !slower && <span className="text-surface2">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-subtext0 text-xs tabular-nums">{row.attempts}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Copertura esercizi ───────────────────────────────────────── */}
            <div>
              <SectionTitle>{t('analytics.exerciseCoverage')}</SectionTitle>
              <div className="flex flex-col gap-3">
                {analytics.exercise_coverage.map(c => {
                  const pct = c.total > 0 ? c.done / c.total : 0
                  return (
                    <div key={c.section} className="bg-surface0/30 border border-surface0 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${SECTION_COLOR[c.section] ?? 'text-text'}`}>{SECTION_LABEL[c.section]}</span>
                        <span className="text-xs text-subtext0 tabular-nums">{c.done} / {c.total}</span>
                      </div>
                      <div className="h-2 bg-surface1 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${SECTION_BAR[c.section] ?? 'bg-mauve'}`} style={{ width: `${Math.round(pct * 100)}%` }} />
                      </div>
                      <div className="text-xs text-subtext0 mt-1">{Math.round(pct * 100)}% {t('analytics.completed')}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Writing bands ────────────────────────────────────────────── */}
            {(analytics.writing_bands.task1_count > 0 || analytics.writing_bands.task2_count > 0) && (
              <div>
                <SectionTitle>{t('analytics.writingBands')}</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { labelKey: 'analytics.task1', avg: analytics.writing_bands.task1_avg, count: analytics.writing_bands.task1_count },
                    { labelKey: 'analytics.task2', avg: analytics.writing_bands.task2_avg, count: analytics.writing_bands.task2_count },
                  ].map(({ labelKey, avg, count }) => (
                    <div key={labelKey} className="bg-surface0/30 border border-surface0 rounded-lg p-4 text-center">
                      <div className="text-xs text-subtext0 mb-2">{t(labelKey)}</div>
                      {count > 0 ? (
                        <>
                          <BandBadge band={avg} />
                          <div className="text-xs text-surface2 mt-1">{t('analytics.submission', { count })}</div>
                        </>
                      ) : (
                        <span className="text-subtext0 text-sm">{t('common.noData')}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Flashcard ────────────────────────────────────────────────── */}
            {analytics.flashcard_stats.total > 0 && (
              <div>
                <SectionTitle>{t('analytics.flashcardTitle')}</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard value={String(analytics.flashcard_stats.total)}     label={t('analytics.totalCards')} />
                  <StatCard value={String(analytics.flashcard_stats.mastered)}  label={t('analytics.mastered')} color="text-green" />
                  <StatCard value={String(analytics.flashcard_stats.due_today)} label={t('analytics.dueToday')} color="text-yellow" />
                  <StatCard value={formatAccuracy(analytics.flashcard_stats.retention_rate)} label={t('analytics.retention')} color="text-blue" />
                </div>
              </div>
            )}

            {analytics.total_sessions === 0 && (
              <p className="text-subtext0 text-sm text-center py-4">{t('analytics.noDataForPeriod')}</p>
            )}
          </>
        )}

        {/* ── Danger zone ──────────────────────────────────────────────────── */}
        <div className="border border-red/30 rounded-lg p-5">
          <h2 className="text-xs font-semibold text-red/80 uppercase tracking-wide mb-1">{t('analytics.dangerZone')}</h2>
          <p className="text-xs text-subtext0 mb-4">{t('analytics.deleteAllDesc')}</p>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="px-4 py-2 bg-red/10 text-red border border-red/30 rounded text-sm hover:bg-red/20 transition-colors">
              {t('analytics.deleteAll')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-text">{t('analytics.deleteConfirm')}</span>
              <button onClick={handleReset} disabled={resetting} className="px-4 py-2 bg-red text-base rounded text-sm font-medium hover:bg-red/90 disabled:opacity-50 transition-colors">
                {resetting ? t('analytics.deleting') : t('analytics.deleteConfirmBtn')}
              </button>
              <button onClick={() => setConfirmReset(false)} className="px-4 py-2 bg-surface0 text-subtext0 rounded text-sm hover:text-text transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
