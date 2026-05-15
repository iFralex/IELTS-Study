# Exam Simulator — Design Spec

**Goal:** Implementare la pagina `/exam` (attualmente placeholder) con una simulazione esame IELTS completa: sezioni opzionali (Listening, Reading, Writing), cronometro visibile con snapshot automatico ai tempi IELTS standard, valutazione AI per Writing, salvataggio risultati, e sezione "Ultime simulazioni" nella Dashboard.

**Architecture:** `ExamSimulator.tsx` (orchestratore + setup + risultati) + tre section components che riusano i componenti foglia già esistenti. `Dashboard.tsx` esteso con storico esami.

**Tech Stack:** React 18 + TypeScript, Tailwind v4 Catppuccin Mocha, IPC esistente (`saveExamRun`, `getExamRuns`, `evaluateWriting`, `saveSession`, `saveWritingSubmission`, `getExercises`), utility esistente (`scoreAnswers` da `components/practice/utils.ts`).

---

## 1. File Structure

### Nuovi file
```
src/renderer/src/pages/ExamSimulator.tsx                    — orchestratore (sostituisce placeholder)
src/renderer/src/components/exam/ExamListeningSection.tsx   — sezione Listening con timer/snapshot
src/renderer/src/components/exam/ExamReadingSection.tsx     — sezione Reading con timer/snapshot
src/renderer/src/components/exam/ExamWritingSection.tsx     — sezione Writing T1 + T2 in sequenza
```

### File modificati
```
src/renderer/src/pages/Dashboard.tsx   — aggiunge sezione "Ultime simulazioni" (ultimi 3 exam_runs)
```

---

## 2. Types (tutti in `src/renderer/src/types/index.ts` — già presenti, nessuna modifica)

```ts
// Già esistenti — usati così come sono:
// ExamRunInput, ExamRun, SessionInput, WritingInput, AIWritingFeedback
// ListeningExercise, ReadingExercise, WritingTask1, WritingTask2
```

Interfacce locali (definite nei file component, non esportate in types/index.ts):

```ts
// In ExamSimulator.tsx
type SectionType = 'listening' | 'reading' | 'writing'
type ExamPhase = 'loading' | 'setup' | 'running' | 'evaluating' | 'results' | 'error'

interface ListeningResult {
  exercise: ListeningExercise
  answers: Record<number, string>
  snapshotAnswers: Record<number, string> | null   // risposte al momento dello snapshot (40 min)
  elapsedSeconds: number
}

interface ReadingResult {
  exercise: ReadingExercise
  answers: Record<number, string>
  snapshotAnswers: Record<number, string> | null   // risposte al momento dello snapshot (60 min)
  elapsedSeconds: number
}

interface WritingSubResult {
  exercise: WritingTask1 | WritingTask2
  text: string
  snapshotText: string | null   // testo al momento dello snapshot (T1=20min, T2=40min)
  elapsedSeconds: number
}

interface WritingResult {
  t1: WritingSubResult
  t2: WritingSubResult
}

interface AIWritingPair {
  t1: AIWritingFeedback | null   // null se valutazione fallita
  t2: AIWritingFeedback | null
}
```

---

## 3. `ExamSimulator.tsx` — Orchestratore

### State
```ts
const [phase, setPhase] = useState<ExamPhase>('loading')
const [sections, setSections] = useState({ listening: true, reading: true, writing: true })
const [examRuns, setExamRuns] = useState<ExamRun[]>([])
const [loadError, setLoadError] = useState<string | null>(null)

// Computed da sections: ['listening', 'reading', 'writing'].filter(s => sections[s])
const [sectionQueue, setSectionQueue] = useState<SectionType[]>([])
const [currentIndex, setCurrentIndex] = useState(0)
const examStartedAt = useRef<number>(0)

// Risultati raccolti durante l'esame
const [listeningResult, setListeningResult] = useState<ListeningResult | null>(null)
const [readingResult, setReadingResult] = useState<ReadingResult | null>(null)
const [writingResult, setWritingResult] = useState<WritingResult | null>(null)

// Valutazione AI (fase evaluating)
const [aiWriting, setAiWriting] = useState<AIWritingPair | null>(null)
const [evaluating, setEvaluating] = useState(false)
const [saveError, setSaveError] = useState(false)
```

### On mount
`Promise.all([getExamRuns()])` → se ok, `setExamRuns(runs)`, `setPhase('setup')`. Se fallisce → `setPhase('error')`.

### Setup screen
- Titolo "Simulazione Esame"
- Tre checkbox: Listening (~40 min), Reading (~60 min), Writing — Task 1 + Task 2 · AI eval
- Almeno una sezione deve essere selezionata (bottone "Inizia" disabilitato se nessuna)
- Sezione "Ultime simulazioni" sotto: mostra `examRuns.slice(0, 3)` con data + punteggi
- Bottone "Inizia esame ▶" → calcola `sectionQueue`, `examStartedAt.current = Date.now()`, `setPhase('running')`

### Running phase
Render la sezione corrente (`sectionQueue[currentIndex]`):
- `'listening'` → `<ExamListeningSection onComplete={handleListeningComplete} />`
- `'reading'` → `<ExamReadingSection onComplete={handleReadingComplete} />`
- `'writing'` → `<ExamWritingSection onComplete={handleWritingComplete} />`

Header fisso in cima durante running: `"Sezione X di Y · [nome sezione]"` + cronometro globale (tempo totale dall'inizio esame).

### handleXComplete callbacks
Salva il risultato nel rispettivo state, poi:
```ts
if (currentIndex + 1 < sectionQueue.length) {
  setCurrentIndex(i => i + 1)
} else {
  // Tutte le sezioni completate
  if (sections.writing && writingResult) {
    setPhase('evaluating')
    evaluateWriting(writingResult)
  } else {
    saveAndShowResults()
  }
}
```

### evaluateWriting
```ts
async function evaluateWriting(wr: WritingResult) {
  setEvaluating(true)
  const [t1Res, t2Res] = await Promise.allSettled([
    window.api.evaluateWriting('task1', wr.t1.text, wr.t1.exercise.prompt, countWords(wr.t1.text)),
    window.api.evaluateWriting('task2', wr.t2.text, wr.t2.exercise.question, countWords(wr.t2.text)),
  ])
  setAiWriting({
    t1: t1Res.status === 'fulfilled' ? t1Res.value : null,
    t2: t2Res.status === 'fulfilled' ? t2Res.value : null,
  })
  setEvaluating(false)
  saveAndShowResults()
}
```

### saveAndShowResults
1. Chiama `saveSession` per ogni sezione Listening/Reading completata:
   ```ts
   saveSession({ exercise_id: ex.id, section: 'listening', started_at: ..., completed_at: ...,
                 score: correctCount, max_score: maxScore, time_spent_seconds: elapsed })
   ```
2. Chiama `saveWritingSubmission` per T1 e T2 se Writing completata
3. Chiama `saveExamRun({ started_at, completed_at, listening_score, reading_score, writing_score })`
   - `listening_score` = `correctCount / maxScore` (0–1) oppure `null`
   - `reading_score` = `correctCount / maxScore` (0–1) oppure `null`
   - `writing_score` = media band T1+T2 oppure band della sola disponibile oppure `null`
4. Se `saveExamRun` fallisce → `setSaveError(true)` (banner errore + bottone "Riprova salvataggio")
5. `setPhase('results')`

### Results screen
Vedi Sezione 6.

---

## 4. `ExamListeningSection.tsx`

### Props
```ts
interface Props {
  onComplete: (result: ListeningResult) => void
}
```

### Behavior
1. On mount: `getExercises('listening')` → seleziona un esercizio random
2. Mostra `<AudioPlayer>` + `<QuestionInput>` (riuso diretto dei componenti esistenti)
3. Timer: `elapsedSeconds` con `setInterval(1000)`, display `MM:SS`
4. Target: 2400 sec (40 min). Al primo superamento → `snapshotAnswers = { ...answers }` (solo una volta)
5. Display timer: `"42:17 · snapshot a 40:00 ✓"` se snapshot preso, altrimenti `"38:45 / 40:00 target"`
6. Bottone "Sezione successiva ▶" (sempre visibile, anche prima del target)
7. Bottone "Salta sezione →" (visibile sempre) — chiama `onComplete` con `answers = {}`, `snapshotAnswers = null`
8. "Sezione successiva ▶" → chiama `onComplete({ exercise, answers, snapshotAnswers, elapsedSeconds })`

### Error handling
Se `getExercises` fallisce → messaggio errore + bottone "Riprova". Se ancora fallisce → bottone "Salta sezione".

---

## 5. `ExamReadingSection.tsx`

Identico a `ExamListeningSection` ma con:
- `getExercises('reading')` → esercizio random
- Usa `<ReadingPassage>` + `<QuestionInput>` invece di `<AudioPlayer>`
- Target: 3600 sec (60 min)

---

## 6. `ExamWritingSection.tsx`

### Props
```ts
interface Props {
  onComplete: (result: WritingResult) => void
}
```

### Behavior
1. On mount: `getExercises('writing/task1')` + `getExercises('writing/task2')` in parallel → seleziona random da ciascuna lista
2. Fase interna: `'t1' | 't2'`
3. **Task 1** (target 1200 sec = 20 min):
   - Mostra prompt T1 + `<WritingEditor>` (riuso diretto)
   - Timer per T1, snapshot a 1200 sec
   - Bottone "Passa a Task 2 ▶" → salva `t1SubResult`, passa a fase `'t2'`
4. **Task 2** (target 2400 sec = 40 min):
   - Mostra prompt T2 + `<WritingEditor>`
   - Timer parte da zero per T2, snapshot a 2400 sec
   - Bottone "Termina Writing ▶" → chiama `onComplete({ t1: t1SubResult, t2: { ... } })`

Header sempre visibile: mostra quale task si sta svolgendo + timer corrente.

---

## 7. Results Screen (in `ExamSimulator.tsx`)

Tabella riepilogativa:

| Sezione | Entro il tempo | Totale | Tempo impiegato |
|---------|---------------|--------|-----------------|
| Listening | X/Y risposte corrette (snapshot) | A/B corrette | MM:SS |
| Reading | X/Y risposte corrette (snapshot) | A/B corrette | MM:SS |
| Writing T1 | testo snapshot (parole) | band AI o N/D | MM:SS |
| Writing T2 | testo snapshot (parole) | band AI o N/D | MM:SS |

- Sezioni non incluse nell'esame: non mostrate
- "Entro il tempo" per Listening/Reading: `scoreAnswers(questions, snapshotAnswers)` oppure "—" se snapshot null
- "Totale" per Listening/Reading: `scoreAnswers(questions, answers)`
- "Entro il tempo" per Writing: `snapshotText ? "${countWords(snapshotText)} parole al snapshot" : "—"`
- Band AI: da `aiWriting.t1.band` / `aiWriting.t2.band`; se null → "N/D"
- Feedback AI Writing (strengths/improvements): mostrati sotto la tabella come accordion espandibile per T1 e T2
- Bottone "Nuovo esame" → torna a setup (reset state)
- Se `saveError`: banner giallo "Errore nel salvataggio" + bottone "Riprova salvataggio"

**Evaluating screen** (fase `'evaluating'`): spinner + "Valutazione AI in corso…"

---

## 8. `Dashboard.tsx` — Modifica

Aggiunge al `Promise.all` del `load()`:
```ts
Promise.all([
  window.api.getAnalytics(30),
  window.api.getRecentSessions(5),
  window.api.getExamRuns(),       // ← aggiunto
])
  .then(([a, s, runs]) => { setAnalytics(a); setSessions(s); setExamRuns(runs.slice(0, 3)) })
```

Nuova sezione "Ultime simulazioni" (dopo "Sessioni recenti"):
- Se `examRuns.length === 0`: `"Nessuna simulazione ancora."`
- Altrimenti: lista degli ultimi 3 esami, ogni riga mostra:
  - Data: `new Date(run.started_at).toLocaleDateString('it-IT')`
  - Listening score: `${Math.round(run.listening_score * 100)}%` oppure `—`
  - Reading score: idem
  - Writing band: `run.writing_score?.toFixed(1)` oppure `—`
  - Link cliccabile → `navigate('/exam')`

---

## 9. Error Handling

| Scenario | Comportamento |
|---|---|
| `getExercises` fallisce in una section | Messaggio errore + Riprova; se persiste → bottone "Salta sezione" |
| `evaluateWriting` fallisce (T1 o T2) | Band "N/D" per la sezione fallita, feedback non mostrato |
| `saveExamRun` fallisce | Banner errore + bottone "Riprova salvataggio" in results screen |
| `saveSession`/`saveWritingSubmission` fallisce | Ignorato silenziosamente (non blocca il flusso) |
| Caricamento `getExamRuns` fallisce al mount | `setPhase('setup')` con lista esami vuota (non blocca l'uso) |
| Nessuna sezione selezionata nel setup | Bottone "Inizia" disabilitato |

---

## 10. No New IPC

Tutti i metodi usati esistono già:
- `getExercises(section)` — carica esercizi
- `saveSession(SessionInput)` — salva sessione pratica
- `saveWritingSubmission(WritingInput)` — salva testo writing
- `saveExamRun(ExamRunInput)` — salva risultati esame
- `getExamRuns()` — storico esami
- `evaluateWriting(taskType, text, prompt, wordCount)` — valutazione AI (`countWords` da `writingUtils.ts` per il conteggio)

---

## 11. No New Tests

Nessuna utility pura da testare — tutta la logica è orchestrazione UI. TypeScript garantisce la type-safety.
