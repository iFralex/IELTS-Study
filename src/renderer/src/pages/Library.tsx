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
  const [tab, setTab]           = useState<TabId>('listening')
  const [data, setData]         = useState<LibraryData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  function load() {
    setError(null)
    setData(null)
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
