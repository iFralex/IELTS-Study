# Plan 4 — Dashboard, Analytics, Library Design

**Goal:** Implement three currently-placeholder pages: Dashboard (home overview), Analytics (Recharts-based study stats with time filter), and Library (full exercise browser across all four sections).

**Architecture:** Three independent page components, each fetching data via existing IPC methods. One new reusable `StatCard` component shared by Dashboard and Analytics. One new `analyticsUtils.ts` with two pure formatting helpers. Recharts added as a dependency for the grouped bar chart in Analytics.

**Tech Stack:** React 18 + TypeScript, Tailwind v4 (Catppuccin Mocha), Recharts (`BarChart`, `ResponsiveContainer`), existing IPC (`getAnalytics`, `getRecentSessions`, `getExercises`, `getCompletedExerciseIds`), react-router-dom `useNavigate`.

---

## 1. File Structure

### New files
```
src/renderer/src/components/StatCard.tsx          — reusable stat card (value + label + optional color)
src/renderer/src/components/analyticsUtils.ts     — formatDuration, formatAccuracy
src/tests/analyticsUtils.test.ts                  — unit tests for both helpers
```

### Modified files
```
src/renderer/src/pages/Dashboard.tsx              — full implementation (replaces placeholder)
src/renderer/src/pages/Analytics.tsx              — full implementation (replaces placeholder)
src/renderer/src/pages/Library.tsx                — full implementation (replaces placeholder)
```

### Dependency
```
npm install recharts
```

---

## 2. Utility Functions

**`src/renderer/src/components/analyticsUtils.ts`:**

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

**Tests** (`src/tests/analyticsUtils.test.ts`):
- `formatDuration(0)` → `'0s'`
- `formatDuration(45)` → `'45s'`
- `formatDuration(60)` → `'1m'`
- `formatDuration(90)` → `'1m'`
- `formatDuration(3600)` → `'1h'`
- `formatDuration(3660)` → `'1h 1m'`
- `formatDuration(5400)` → `'1h 30m'`
- `formatAccuracy(0)` → `'0%'`
- `formatAccuracy(0.724)` → `'72%'`
- `formatAccuracy(1)` → `'100%'`

---

## 3. StatCard Component

**`src/renderer/src/components/StatCard.tsx`:**

```tsx
interface StatCardProps {
  value: string
  label: string
  color?: string   // Tailwind color class, e.g. 'text-mauve'. Defaults to 'text-mauve'.
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

---

## 4. Dashboard Page

**Route:** `/`

**Data:** Loaded on mount with `Promise.all`:
- `window.api.getAnalytics(30)` → `AnalyticsData`
- `window.api.getRecentSessions(5)` → `Session[]`

**Layout (vertical scroll):**

```
┌──────────────────────────────────────────┐
│  h1: Dashboard                           │
├──────────────────────────────────────────┤
│  [4 StatCards in a grid]                 │
│  Sessioni totali | Accuratezza | Tempo | Esami
├──────────────────────────────────────────┤
│  "Inizia ad esercitarti"                 │
│  [3 shortcut buttons: Listening / Reading / Writing]
├──────────────────────────────────────────┤
│  "Sessioni recenti"                      │
│  [list of up to 5 sessions]              │
└──────────────────────────────────────────┘
```

**Stat cards:**
- Sessioni totali: `analytics.total_sessions`
- Accuratezza media: `formatAccuracy(analytics.average_accuracy)`
- Tempo studio: `formatDuration(analytics.total_time_seconds)`
- Esami simulati: `analytics.exam_count`

**Shortcuts:** Three `<button>` elements that call `navigate('/listening')`, `navigate('/reading')`, `navigate('/writing')`.

**Recent sessions:** Each row shows:
- Section icon + section name (e.g. "🎧 Listening")
- Score: `${session.score} / ${session.max_score}` if both present, otherwise `—`
- Relative date: `new Date(session.started_at).toLocaleDateString('it-IT')`

**Error/loading:** Loading spinner while fetching; error message + "Riprova" button on failure. Empty state: "Nessuna sessione ancora." below shortcuts if no recent sessions.

---

## 5. Analytics Page

**Route:** `/analytics`

**Data:** Loaded on mount and re-fetched when time filter changes:
- `window.api.getAnalytics(days)` where `days` ∈ `{ 7, 30, 0 }` (0 = all time)

**Layout (vertical scroll):**

```
┌──────────────────────────────────────────┐
│  h1: Analytics                           │
│  [Time filter: 7 giorni | 30 giorni | Tutto]
├──────────────────────────────────────────┤
│  [4 StatCards: same as Dashboard]        │
├──────────────────────────────────────────┤
│  "Punteggio per settimana"               │
│  [Recharts BarChart — grouped bars]      │
├──────────────────────────────────────────┤
│  "Accuratezza per tipo di domanda"       │
│  [Grid of AccuracyCard per type]         │
└──────────────────────────────────────────┘
```

**Time filter:** Three pill buttons. Active pill: `bg-mauve text-base`. Inactive: `bg-surface0 text-subtext0 hover:text-text`. Default: 30 giorni.

**Recharts BarChart:**
```tsx
<ResponsiveContainer width="100%" height={220}>
  <BarChart data={analytics.sessions_by_week} barGap={2} barCategoryGap="30%">
    <XAxis dataKey="week" tickFormatter={w => w.slice(5)} tick={{ fill: '#6c7086', fontSize: 11 }} />
    <YAxis domain={[0, 9]} tick={{ fill: '#6c7086', fontSize: 11 }} />
    <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #313244', borderRadius: 6 }} />
    <Legend wrapperStyle={{ fontSize: 11 }} />
    <Bar dataKey="listening" name="Listening" fill="#89b4fa" radius={[3,3,0,0]} />
    <Bar dataKey="reading"   name="Reading"   fill="#a6e3a1" radius={[3,3,0,0]} />
    <Bar dataKey="writing"   name="Writing"   fill="#cba6f7" radius={[3,3,0,0]} />
  </BarChart>
</ResponsiveContainer>
```

Empty state for chart: if `sessions_by_week.length === 0`, show a grey placeholder `"Nessun dato disponibile per il periodo selezionato"`.

**Accuracy grid:** Only show types where `attempts > 0`. Each cell shows `question_type` + `formatAccuracy(accuracy)`. Color the accuracy value: `>= 0.8` → `text-green`, `>= 0.6` → `text-yellow`, `< 0.6` → `text-red`.

Empty state for accuracy: if `accuracy_by_type` is empty or all entries have 0 attempts, show `"Nessun dato"`.

**Error/loading:** Same pattern as Dashboard.

---

## 6. Library Page

**Route:** `/library`

**Tabs:** Listening | Reading | Writing T1 | Writing T2

**Data loading:** On mount, load all four exercise lists in parallel:
```ts
Promise.all([
  window.api.getExercises('listening')      as Promise<ListeningExercise[]>,
  window.api.getExercises('reading')        as Promise<ReadingExercise[]>,
  window.api.getExercises('writing/task1')  as Promise<WritingTask1[]>,
  window.api.getExercises('writing/task2')  as Promise<WritingTask2[]>,
  window.api.getCompletedExerciseIds('listening'),
  window.api.getCompletedExerciseIds('reading'),
])
```

Writing exercises have no completion tracking (submissions go to `writing_submissions`, not `sessions`), so no completion badge for Writing T1/T2.

**Tab header:** Shows section name + count, e.g. `Listening (41)`.

**Exercise card per section:**

| Section | Title shown | Badges |
|---------|------------|--------|
| Listening | `exercise.title` | `question_type`, `difficulty`, ✓ if completed |
| Reading | `exercise.title` | `question_type`, `difficulty`, ✓ if completed |
| Writing T1 | `exercise.prompt` (truncated, `line-clamp-1`) | `chart_type`, `band_target` |
| Writing T2 | `exercise.topic` | `essay_type`, `band_target` |

**Click behavior:** Clicking a card navigates to the section's practice route (`/listening`, `/reading`, `/writing`). Does not start the exercise directly — the practice page handles selection.

**Completion badge:** `bg-green/20 text-green` pill reading `✓ completato`.

**Error/loading:** Loading spinner + error + "Riprova" button.

---

## 7. Error Handling

- All three pages: `Promise.all` failure → show error message + "Riprova" button that calls `load()` again
- Loading state: show a centered spinner while fetching
- Empty data: graceful empty-state messages (no crashes on zero sessions/exercises)

---

## 8. Testing

Tests in `src/tests/analyticsUtils.test.ts` (Vitest, node env, no DOM):
- `formatDuration` — edge cases: 0s, <60s, exactly 60s, hours only, hours+minutes
- `formatAccuracy` — 0%, mid value with rounding, 100%
