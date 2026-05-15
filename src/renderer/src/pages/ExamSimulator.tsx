import { useState, useEffect, useRef } from 'react'
import type { ExamRun, AIWritingFeedback, WritingTask1, WritingTask2 } from '../types'
import { ExamListeningSection } from '../components/exam/ExamListeningSection'
import type { ListeningResult } from '../components/exam/ExamListeningSection'
import { ExamReadingSection } from '../components/exam/ExamReadingSection'
import type { ReadingResult } from '../components/exam/ExamReadingSection'
import { ExamWritingSection } from '../components/exam/ExamWritingSection'
import type { WritingResult } from '../components/exam/ExamWritingSection'
import { scoreAnswers } from '../components/practice/utils'
import { countWords } from '../components/practice/writingUtils'

type SectionType = 'listening' | 'reading' | 'writing'
type ExamPhase = 'loading' | 'setup' | 'running' | 'evaluating' | 'results'

interface AIWritingPair {
  t1: AIWritingFeedback | null
  t2: AIWritingFeedback | null
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function scoreRow(result: ListeningResult | ReadingResult): { snap: string; total: string } {
  if (!result.exercise) return { snap: '—', total: '—' }
  let snap = '—'
  if (result.snapshotAnswers) {
    const { correctCount, maxScore } = scoreAnswers(result.exercise.questions, result.snapshotAnswers)
    snap = `${correctCount}/${maxScore}`
  }
  const { correctCount, maxScore } = scoreAnswers(result.exercise.questions, result.answers)
  return { snap, total: `${correctCount}/${maxScore}` }
}

export function ExamSimulator() {
  const [phase, setPhase] = useState<ExamPhase>('loading')
  const [sections, setSections] = useState({ listening: true, reading: true, writing: true })
  const [examRuns, setExamRuns] = useState<ExamRun[]>([])
  const [sectionQueue, setSectionQueue] = useState<SectionType[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [aiWriting, setAiWriting] = useState<AIWritingPair | null>(null)
  const [saveError, setSaveError] = useState(false)

  const queueRef = useRef<SectionType[]>([])
  const indexRef = useRef(0)
  const examStartRef = useRef(0)
  const resultsRef = useRef<{
    listening: ListeningResult | null
    reading: ReadingResult | null
    writing: WritingResult | null
  }>({ listening: null, reading: null, writing: null })

  function load() {
    window.api.getExamRuns()
      .then((runs: ExamRun[]) => {
        setExamRuns(runs.slice(0, 3))
        setPhase('setup')
      })
      .catch(() => setPhase('setup'))
  }

  useEffect(() => { load() }, [])

  function handleStart() {
    const q = (['listening', 'reading', 'writing'] as SectionType[]).filter(s => sections[s])
    if (q.length === 0) return
    queueRef.current = q
    indexRef.current = 0
    examStartRef.current = Date.now()
    resultsRef.current = { listening: null, reading: null, writing: null }
    setSectionQueue(q)
    setCurrentIndex(0)
    setAiWriting(null)
    setSaveError(false)
    setPhase('running')
  }

  function advance() {
    const next = indexRef.current + 1
    if (next < queueRef.current.length) {
      indexRef.current = next
      setCurrentIndex(next)
    } else {
      finishExam()
    }
  }

  function handleListeningComplete(result: ListeningResult) {
    resultsRef.current.listening = result
    advance()
  }

  function handleReadingComplete(result: ReadingResult) {
    resultsRef.current.reading = result
    advance()
  }

  function handleWritingComplete(result: WritingResult) {
    resultsRef.current.writing = result
    advance()
  }

  function finishExam() {
    const wr = resultsRef.current.writing
    if (wr) {
      setPhase('evaluating')
      void runEvaluation(wr)
    } else {
      void saveAndShowResults(null)
    }
  }

  async function runEvaluation(wr: WritingResult) {
    const [r1, r2] = await Promise.allSettled([
      window.api.evaluateWriting('task1', wr.t1.text, (wr.t1.exercise as WritingTask1).prompt, countWords(wr.t1.text)),
      window.api.evaluateWriting('task2', wr.t2.text, (wr.t2.exercise as WritingTask2).question, countWords(wr.t2.text)),
    ])
    const pair: AIWritingPair = {
      t1: r1.status === 'fulfilled' ? r1.value : null,
      t2: r2.status === 'fulfilled' ? r2.value : null,
    }
    setAiWriting(pair)
    await saveAndShowResults(pair)
  }

  async function saveAndShowResults(pair: AIWritingPair | null) {
    const { listening, reading, writing } = resultsRef.current
    const now = Date.now()

    let listenScore: number | undefined
    let readScore: number | undefined
    let writeScore: number | undefined

    if (listening?.exercise) {
      const { correctCount, maxScore } = scoreAnswers(listening.exercise.questions, listening.answers)
      window.api.saveSession({
        exercise_id: listening.exercise.id,
        section: 'listening',
        started_at: examStartRef.current,
        completed_at: now,
        score: correctCount,
        max_score: maxScore,
        time_spent_seconds: listening.elapsedSeconds,
      }).catch(() => {})
      listenScore = maxScore > 0 ? correctCount / maxScore : undefined
    }
    if (reading?.exercise) {
      const { correctCount, maxScore } = scoreAnswers(reading.exercise.questions, reading.answers)
      window.api.saveSession({
        exercise_id: reading.exercise.id,
        section: 'reading',
        started_at: examStartRef.current,
        completed_at: now,
        score: correctCount,
        max_score: maxScore,
        time_spent_seconds: reading.elapsedSeconds,
      }).catch(() => {})
      readScore = maxScore > 0 ? correctCount / maxScore : undefined
    }
    if (writing) {
      window.api.saveWritingSubmission({
        task_id: writing.t1.exercise.id,
        task_type: 'task1',
        submitted_at: examStartRef.current,
        text: writing.t1.text,
        word_count: countWords(writing.t1.text),
      }).catch(() => {})
      window.api.saveWritingSubmission({
        task_id: writing.t2.exercise.id,
        task_type: 'task2',
        submitted_at: examStartRef.current,
        text: writing.t2.text,
        word_count: countWords(writing.t2.text),
      }).catch(() => {})
    }

    if (pair) {
      const bands = [pair.t1?.band, pair.t2?.band].filter((b): b is number => b != null)
      writeScore = bands.length > 0 ? bands.reduce((a, b) => a + b, 0) / bands.length : undefined
    }

    try {
      await window.api.saveExamRun({
        started_at: examStartRef.current,
        completed_at: now,
        listening_score: listenScore,
        reading_score: readScore,
        writing_score: writeScore,
      })
    } catch {
      setSaveError(true)
    }
    setPhase('results')
  }

  if (phase === 'loading') {
    return <p className="p-8 text-subtext0 text-sm text-center">Caricamento…</p>
  }

  if (phase === 'evaluating') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-mauve border-t-transparent rounded-full animate-spin" />
        <p className="text-subtext0 text-sm">Valutazione AI in corso…</p>
        <button
          onClick={() => void saveAndShowResults(null)}
          className="text-xs text-subtext0 hover:text-text underline transition-colors mt-2"
        >
          Salta valutazione
        </button>
      </div>
    )
  }

  if (phase === 'running') {
    const section = sectionQueue[currentIndex]
    const total = sectionQueue.length
    const sectionLabel: Record<SectionType, string> = {
      listening: '🎧 Listening',
      reading: '📖 Reading',
      writing: '✍️ Writing',
    }
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="px-6 py-2 bg-mantle border-b border-surface0 shrink-0 flex items-center gap-3">
          <span className="text-xs font-semibold text-mauve uppercase tracking-wide">Simulazione Esame</span>
          <span className="text-xs text-subtext0">·</span>
          <span className="text-xs text-subtext0">
            Sezione {currentIndex + 1} di {total} · {sectionLabel[section]}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          {section === 'listening' && (
            <ExamListeningSection onComplete={handleListeningComplete} />
          )}
          {section === 'reading' && (
            <ExamReadingSection onComplete={handleReadingComplete} />
          )}
          {section === 'writing' && (
            <ExamWritingSection onComplete={handleWritingComplete} />
          )}
        </div>
      </div>
    )
  }

  if (phase === 'results') {
    const { listening, reading, writing } = resultsRef.current

    const listenRow = listening ? scoreRow(listening) : null
    const readRow = reading ? scoreRow(reading) : null

    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-text">Risultati Esame</h1>
            <span className="text-xs text-subtext0">{fmtDate(examStartRef.current)}</span>
          </div>

          {saveError && (
            <div className="bg-yellow/10 border border-yellow/30 rounded-lg px-4 py-3 text-sm text-yellow">
              Errore nel salvataggio dei risultati.{' '}
              <button
                onClick={() => { setSaveError(false); void saveAndShowResults(aiWriting) }}
                className="underline hover:no-underline"
              >
                Riprova salvataggio
              </button>
            </div>
          )}

          <div className="bg-surface0/30 border border-surface0 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface0 text-xs text-subtext0 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Sezione</th>
                  <th className="text-right px-4 py-3">Entro il tempo</th>
                  <th className="text-right px-4 py-3">Totale</th>
                  <th className="text-right px-4 py-3">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {listenRow && listening && (
                  <tr className="border-b border-surface0/50">
                    <td className="px-4 py-3 text-text">
                      🎧 Listening
                      {!listening.exercise && <span className="text-xs text-subtext0 ml-1">(saltata)</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-subtext0">{listenRow.snap}</td>
                    <td className="px-4 py-3 text-right font-medium text-green">{listenRow.total}</td>
                    <td className="px-4 py-3 text-right text-subtext0">{fmtSec(listening.elapsedSeconds)}</td>
                  </tr>
                )}
                {readRow && reading && (
                  <tr className="border-b border-surface0/50">
                    <td className="px-4 py-3 text-text">
                      📖 Reading
                      {!reading.exercise && <span className="text-xs text-subtext0 ml-1">(saltata)</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-subtext0">{readRow.snap}</td>
                    <td className="px-4 py-3 text-right font-medium text-green">{readRow.total}</td>
                    <td className="px-4 py-3 text-right text-subtext0">{fmtSec(reading.elapsedSeconds)}</td>
                  </tr>
                )}
                {writing && (
                  <>
                    <tr className="border-b border-surface0/50">
                      <td className="px-4 py-3 text-text">✍️ Writing T1</td>
                      <td className="px-4 py-3 text-right text-subtext0">
                        {writing.t1.snapshotText ? `${countWords(writing.t1.snapshotText)} parole` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue">
                        {aiWriting?.t1 ? `Band ${aiWriting.t1.band}` : 'N/D'}
                      </td>
                      <td className="px-4 py-3 text-right text-subtext0">{fmtSec(writing.t1.elapsedSeconds)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-text">✍️ Writing T2</td>
                      <td className="px-4 py-3 text-right text-subtext0">
                        {writing.t2.snapshotText ? `${countWords(writing.t2.snapshotText)} parole` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue">
                        {aiWriting?.t2 ? `Band ${aiWriting.t2.band}` : 'N/D'}
                      </td>
                      <td className="px-4 py-3 text-right text-subtext0">{fmtSec(writing.t2.elapsedSeconds)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {aiWriting && writing && (
            <div className="flex flex-col gap-3">
              {([
                { label: 'Writing T1', fb: aiWriting.t1 },
                { label: 'Writing T2', fb: aiWriting.t2 },
              ] as { label: string; fb: AIWritingFeedback | null }[]).map(({ label, fb }) => fb && (
                <details key={label} className="bg-surface0/20 border border-surface0 rounded-xl">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-text select-none">
                    Feedback AI — {label} · Band {fb.band}
                  </summary>
                  <div className="px-4 pb-4 flex flex-col gap-3 text-sm">
                    <p className="text-subtext0">{fb.overall}</p>
                    {fb.strengths.length > 0 && (
                      <div>
                        <p className="text-green text-xs font-semibold uppercase tracking-wide mb-1">Punti di forza</p>
                        <ul className="flex flex-col gap-1">
                          {fb.strengths.map((s, i) => <li key={i} className="text-text">• {s}</li>)}
                        </ul>
                      </div>
                    )}
                    {fb.improvements.length > 0 && (
                      <div>
                        <p className="text-yellow text-xs font-semibold uppercase tracking-wide mb-1">Miglioramenti</p>
                        <ul className="flex flex-col gap-1">
                          {fb.improvements.map((s, i) => <li key={i} className="text-text">• {s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => { load(); setPhase('loading') }}
              className="px-5 py-2 bg-mauve text-base rounded text-sm font-medium hover:bg-mauve/90 transition-colors"
            >
              Nuovo esame ▶
            </button>
          </div>
        </div>
      </div>
    )
  }

  // SETUP phase
  const anySelected = sections.listening || sections.reading || sections.writing
  const SECTION_META: Record<SectionType, string> = {
    listening: '~40 min · esercizio random',
    reading: '~60 min · esercizio random',
    writing: 'Task 1 + Task 2 · valutazione AI',
  }
  const SECTION_LABELS: Record<SectionType, string> = {
    listening: '🎧 Listening',
    reading: '📖 Reading',
    writing: '✍️ Writing',
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-text">Simulazione Esame</h1>
          <p className="text-sm text-subtext0 mt-1">
            Seleziona le sezioni da includere. Un esercizio verrà scelto automaticamente per ciascuna.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {(['listening', 'reading', 'writing'] as SectionType[]).map(s => (
            <label key={s}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                sections[s]
                  ? 'border-mauve/40 bg-mauve/10'
                  : 'border-surface0 bg-surface0/20 hover:bg-surface0/40'
              }`}>
              <input
                type="checkbox"
                checked={sections[s]}
                onChange={e => setSections(prev => ({ ...prev, [s]: e.target.checked }))}
                className="w-4 h-4 accent-mauve"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">{SECTION_LABELS[s]}</p>
                <p className="text-xs text-subtext0">{SECTION_META[s]}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleStart}
            disabled={!anySelected}
            className="px-5 py-2 bg-mauve text-base rounded text-sm font-medium
              hover:bg-mauve/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Inizia esame ▶
          </button>
        </div>

        {examRuns.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-subtext0 uppercase tracking-wide mb-3">
              Ultime simulazioni
            </h2>
            <div className="flex flex-col gap-2">
              {examRuns.map(r => (
                <div key={r.id}
                  className="flex items-center justify-between px-4 py-3
                    bg-surface0/30 border border-surface0 rounded-lg">
                  <span className="text-sm text-text">{fmtDate(r.started_at)}</span>
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
          </div>
        )}
      </div>
    </div>
  )
}
