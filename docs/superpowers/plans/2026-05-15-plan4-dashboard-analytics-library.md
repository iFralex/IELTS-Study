# Plan 4 — Dashboard, Analytics, Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three placeholder pages — Dashboard (home overview with stats + shortcuts), Analytics (Recharts bar chart + accuracy grid with time filter), and Library (exercise browser across all four IELTS sections).

**Architecture:** Five tasks in dependency order: utilities first, then shared StatCard, then three independent pages. Each page fetches data via existing IPC methods (`getAnalytics`, `getRecentSessions`, `getExercises`, `getCompletedExerciseIds`). Recharts (`BarChart`, `ResponsiveContainer`) is already installed.

**Tech Stack:** React 18 + TypeScript, Tailwind v4 (Catppuccin Mocha), Recharts 3.x, react-router-dom `useNavigate`, existing IPC via `window.api.*`, Vitest (node env).

---

## Codebase orientation

- `src/renderer/src/types/index.ts` — all shared types. `AnalyticsData`, `Session`, `ListeningExercise`, `ReadingExercise`, `WritingTask1`, `WritingTask2` are already defined.
- `src/renderer/src/pages/Dashboard.tsx` — placeholder, will be fully replaced.
- `src/renderer/src/pages/Analytics.tsx` — placeholder, will be fully replaced.
- `src/renderer/src/pages/Library.tsx` — placeholder, will be fully replaced.
- `window.api.getAnalytics(days: number)` — returns `AnalyticsData`. `days=0` means all time.
- `window.api.getRecentSessions(limit: number)` — returns `Session[]` (most recent first).
- `window.api.getExercises(section: string)` — `'listening'`, `'reading'`, `'writing/task1'`, `'writing/task2'`.
- `window.api.getCompletedExerciseIds(section: string)` — returns `string[]` of exercise IDs with completed sessions. Only works for `'listening'` and `'reading'` (writing uses a separate table with no equivalent IPC method).
- **`text-base` is a Catppuccin Mocha COLOR** (`#1e1e2e`), not a font-size. Use it for text on colored backgrounds (e.g. `bg-mauve text-base`).
- Tests live in `src/tests/**/*.test.ts` and run with `npx vitest run`.

---

## File map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/renderer/src/components/analyticsUtils.ts` | Create | `formatDuration`, `formatAccuracy` |
| `src/tests/analyticsUtils.test.ts` | Create | Unit tests for both helpers |
| `src/renderer/src/components/StatCard.tsx` | Create | Reusable stat card (value + label + color) |
| `src/renderer/src/pages/Dashboard.tsx` | Replace | Home overview page |
| `src/renderer/src/pages/Analytics.tsx` | Replace | Analytics page with Recharts |
| `src/renderer/src/pages/Library.tsx` | Replace | Exercise browser |

---

## Task 1: analyticsUtils — formatting helpers + tests

**Files:**
- Create: `src/renderer/src/components/analyticsUtils.ts`
- Create: `src/tests/analyticsUtils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/analyticsUtils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatDuration, formatAccuracy } from '../../renderer/src/components/analyticsUtils'

describe('formatDuration', () => {
  it('returns 0s for zero', () => expect(formatDuration(0)).toBe('0s'))
  it('returns seconds for < 60', () => expect(formatDuration(45)).toBe('45s'))
  it('returns minutes for exactly 60', () => expect(formatDuration(60)).toBe('1m'))
  it('floors to minutes (no seconds shown)', () => expect(formatDuration(90)).toBe('1m'))
  it('returns hours only when no remaining minutes', () => expect(formatDuration(3600)).toBe('1h'))
  it('returns hours and minutes', () => expect(formatDuration(3660)).toBe('1h 1m'))
  it('returns hours and minutes for 5400s', () => expect(formatDuration(5400)).toBe('1h 30m'))
})

describe('formatAccuracy', () => {
  it('returns 0% for zero', () => expect(formatAccuracy(0)).toBe('0%'))
  it('rounds to nearest integer', () => expect(formatAccuracy(0.724)).toBe('72%'))
  it('returns 100% for 1', () => expect(formatAccuracy(1)).toBe('100%'))
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx vitest run src/tests/analyticsUtils.test.ts
```

Expected: FAIL — `Cannot find module '../../renderer/src/components/analyticsUtils'`

- [ ] **Step 3: Implement analyticsUtils**

Create `src/renderer/src/components/analyticsUtils.ts`:

```ts
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatAccuracy(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx vitest run src/tests/analyticsUtils.test.ts
```

Expected: 10 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx vitest run
```

Expected: all tests pass (50 total).

- [ ] **Step 6: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/components/analyticsUtils.ts src/tests/analyticsUtils.test.ts && git commit -m "feat: add analyticsUtils — formatDuration, formatAccuracy"
```

---

## Task 2: StatCard component

**Files:**
- Create: `src/renderer/src/components/StatCard.tsx`

No tests needed — pure presentational component with no logic.

- [ ] **Step 1: Create StatCard**

Create `src/renderer/src/components/StatCard.tsx`:

```tsx
interface StatCardProps {
  value: string
  label: string
  color?: string
}

export function StatCard({ value, label, color = 'text-mauve' }: StatCardProps) {
  return (
    <div className="bg-surface0/50 rounded-lg p-4 flex flex-col gap-1">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-subtext0">{label}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm run typecheck:web 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/components/StatCard.tsx && git commit -m "feat: add StatCard component"
```

---

## Task 3: Dashboard page

**Files:**
- Modify: `src/renderer/src/pages/Dashboard.tsx` (full replacement)

**Context:**
- `AnalyticsData` shape: `{ total_sessions, average_accuracy, total_time_seconds, exam_count, sessions_by_week, accuracy_by_type }`
- `Session` shape: `{ id, exercise_id, section, started_at, completed_at, score, max_score, time_spent_seconds }`
- `window.api.getRecentSessions(5)` returns sessions ordered by `started_at DESC`

- [ ] **Step 1: Implement Dashboard.tsx**

Replace the entire contents of `src/renderer/src/pages/Dashboard.tsx`:

```tsx
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
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm run typecheck:web 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/pages/Dashboard.tsx && git commit -m "feat: implement Dashboard page"
```

---

## Task 4: Analytics page

**Files:**
- Modify: `src/renderer/src/pages/Analytics.tsx` (full replacement)

**Context:**
- `AnalyticsData.sessions_by_week`: `{ week: string; listening: number; reading: number; writing: number }[]` — `week` is an ISO date string like `"2026-05-15"`.
- `AnalyticsData.accuracy_by_type`: `{ question_type: string; accuracy: number; attempts: number }[]` — `accuracy` is a 0–1 ratio.
- Recharts is already installed. Import from `'recharts'`.
- `days=0` passed to `getAnalytics` means "all time" (fetches from timestamp 0).

- [ ] **Step 1: Implement Analytics.tsx**

Replace the entire contents of `src/renderer/src/pages/Analytics.tsx`:

```tsx
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

  function load(d: DaysFilter) {
    setError(null)
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
            <div className="grid grid-cols-4 gap-3">
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
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm run typecheck:web 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/pages/Analytics.tsx && git commit -m "feat: implement Analytics page with Recharts bar chart"
```

---

## Task 5: Library page

**Files:**
- Modify: `src/renderer/src/pages/Library.tsx` (full replacement)

**Context:**
- `ListeningExercise` has: `id, title, question_type, difficulty`
- `ReadingExercise` has: `id, title, question_type, difficulty`
- `WritingTask1` has: `id, chart_type, prompt, band_target` (no `title`)
- `WritingTask2` has: `id, topic, essay_type, band_target` (no `title`)
- `getCompletedExerciseIds('listening')` and `getCompletedExerciseIds('reading')` work correctly. Writing has no equivalent — show no completion badge for writing exercises.
- Clicking any exercise navigates to the section's practice route; the practice page handles exercise selection.

- [ ] **Step 1: Implement Library.tsx**

Replace the entire contents of `src/renderer/src/pages/Library.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ListeningExercise, ReadingExercise, WritingTask1, WritingTask2 } from '../types'

type TabId = 'listening' | 'reading' | 'task1' | 'task2'

interface LibraryData {
  listening: ListeningExercise[]
  reading: ReadingExercise[]
  task1: WritingTask1[]
  task2: WritingTask2[]
  completedListening: Set<string>
  completedReading: Set<string>
}

interface ExerciseCardProps {
  title: string
  badges: string[]
  completed: boolean
  onClick: () => void
}

function ExerciseCard({ title, badges, completed, onClick }: ExerciseCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-surface0/30 border border-surface0
        rounded-lg cursor-pointer hover:border-mauve/60 hover:bg-surface0/60 transition-colors"
    >
      <p className="text-sm text-text line-clamp-1 mr-4 flex-1">{title}</p>
      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
        {badges.map((b, i) => (
          <span key={i} className="text-xs bg-surface1 text-subtext0 px-2 py-0.5 rounded">
            {b}
          </span>
        ))}
        {completed && (
          <span className="text-xs bg-green/20 text-green px-2 py-0.5 rounded">
            ✓ fatto
          </span>
        )}
      </div>
    </div>
  )
}

export function Library() {
  const navigate = useNavigate()
  const [tab, setTab]       = useState<TabId>('listening')
  const [data, setData]     = useState<LibraryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  function load() {
    setError(null)
    setLoading(true)
    Promise.all([
      window.api.getExercises('listening')     as Promise<ListeningExercise[]>,
      window.api.getExercises('reading')       as Promise<ReadingExercise[]>,
      window.api.getExercises('writing/task1') as Promise<WritingTask1[]>,
      window.api.getExercises('writing/task2') as Promise<WritingTask2[]>,
      window.api.getCompletedExerciseIds('listening'),
      window.api.getCompletedExerciseIds('reading'),
    ])
      .then(([listening, reading, task1, task2, doneL, doneR]) => {
        setData({
          listening,
          reading,
          task1,
          task2,
          completedListening: new Set(doneL),
          completedReading:   new Set(doneR),
        })
      })
      .catch(() => setError('Errore nel caricamento degli esercizi.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const TABS: { id: TabId; label: string; count: number }[] = data
    ? [
        { id: 'listening', label: 'Listening',  count: data.listening.length },
        { id: 'reading',   label: 'Reading',    count: data.reading.length   },
        { id: 'task1',     label: 'Writing T1', count: data.task1.length     },
        { id: 'task2',     label: 'Writing T2', count: data.task2.length     },
      ]
    : []

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-surface0 shrink-0">
        <h1 className="text-xl font-bold text-text">Library</h1>
        {data && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  tab === t.id
                    ? 'bg-mauve text-base font-medium'
                    : 'bg-surface0 text-subtext0 hover:text-text'
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
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

        {data && (
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
            {tab === 'listening' && data.listening.map(ex => (
              <ExerciseCard
                key={ex.id}
                title={ex.title}
                badges={[ex.question_type, ex.difficulty]}
                completed={data.completedListening.has(ex.id)}
                onClick={() => navigate('/listening')}
              />
            ))}
            {tab === 'reading' && data.reading.map(ex => (
              <ExerciseCard
                key={ex.id}
                title={ex.title}
                badges={[ex.question_type, ex.difficulty]}
                completed={data.completedReading.has(ex.id)}
                onClick={() => navigate('/reading')}
              />
            ))}
            {tab === 'task1' && data.task1.map(ex => (
              <ExerciseCard
                key={ex.id}
                title={ex.prompt}
                badges={[ex.chart_type, `Band ${ex.band_target}`]}
                completed={false}
                onClick={() => navigate('/writing')}
              />
            ))}
            {tab === 'task2' && data.task2.map(ex => (
              <ExerciseCard
                key={ex.id}
                title={ex.topic}
                badges={[ex.essay_type.replace(/_/g, ' '), `Band ${ex.band_target}`]}
                completed={false}
                onClick={() => navigate('/writing')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npm run typecheck:web 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && npx vitest run
```

Expected: 50 tests pass.

- [ ] **Step 4: Commit**

```bash
cd "/Users/alessioantonucci/Downloads/ielts liz" && git add src/renderer/src/pages/Library.tsx && git commit -m "feat: implement Library page — exercise browser across all sections"
```
