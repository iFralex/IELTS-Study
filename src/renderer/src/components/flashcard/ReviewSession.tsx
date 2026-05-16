import { useState, useEffect } from 'react'
import type { Flashcard, AIEvalResult, AIAudioEvalResult, ReviewInput } from '../../types'
import { pickMode, computeQualityFromDual } from './flashcardUtils'
import type { ReviewMode } from './flashcardUtils'

type Phase = 'loading' | 'error' | 'idle' | 'reviewing' | 'evaluating' | 'result' | 'done'

interface EvalState {
  textResult: AIEvalResult | null
  audioResult: AIAudioEvalResult | null
  aiError: boolean
}

function speak(word: string) {
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-GB'
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}

export function ReviewSession() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [cards, setCards] = useState<Flashcard[]>([])
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<ReviewMode>('text-en-it')
  const [textInput, setTextInput] = useState('')
  const [audioEnInput, setAudioEnInput] = useState('')
  const [audioItInput, setAudioItInput] = useState('')
  const [evalState, setEvalState] = useState<EvalState>({ textResult: null, audioResult: null, aiError: false })
  const [saveError, setSaveError] = useState(false)

  function load() {
    setPhase('loading')
    window.api.getDueFlashcards()
      .then(due => {
        setCards(due)
        if (due.length === 0) {
          setPhase('idle')
        } else {
          setIndex(0)
          setMode(pickMode())
          setPhase('reviewing')
        }
      })
      .catch(() => setPhase('error'))
  }

  useEffect(() => { load() }, [])

  const card = cards[index]

  useEffect(() => {
    if (phase === 'reviewing' && mode === 'audio' && card) {
      speak(card.english)
    }
  }, [phase, mode, index])

  async function handleSubmit() {
    if (!card) return
    setPhase('evaluating')
    const newEval: EvalState = { textResult: null, audioResult: null, aiError: false }
    try {
      if (mode === 'audio') {
        newEval.audioResult = await window.api.evaluateAudioAnswer(card.english, audioEnInput, audioItInput)
      } else {
        const correct = mode === 'text-en-it' ? card.italian : card.english
        const direction = mode === 'text-en-it' ? 'en-it' : 'it-en'
        newEval.textResult = await window.api.evaluateAnswer(card.english, correct, textInput, direction)
      }
    } catch {
      newEval.aiError = true
    }
    setEvalState(newEval)
    setPhase('result')
  }

  async function handleNext() {
    if (!card) return
    setSaveError(false)

    const quality = evalState.aiError
      ? 3
      : evalState.audioResult
        ? computeQualityFromDual(evalState.audioResult.english_correct, evalState.audioResult.italian_correct)
        : evalState.textResult?.quality ?? 3

    const isCorrect = evalState.aiError
      ? false
      : evalState.audioResult
        ? evalState.audioResult.english_correct && evalState.audioResult.italian_correct
        : evalState.textResult?.is_correct ?? false

    const direction: ReviewInput['direction'] =
      mode === 'audio' ? 'audio' : mode === 'text-en-it' ? 'en-it' : 'it-en'

    const userAnswer = mode === 'audio'
      ? `${audioEnInput} / ${audioItInput}`
      : textInput

    try {
      await window.api.updateFlashcardSM2(card.id, quality)
      await window.api.saveFlashcardReview({
        flashcard_id: card.id,
        reviewed_at: Date.now(),
        direction,
        user_answer: userAnswer,
        quality,
        is_correct: isCorrect,
      })
    } catch {
      setSaveError(true)
    }

    const nextIndex = index + 1
    if (nextIndex >= cards.length) {
      setPhase('done')
      return
    }

    setIndex(nextIndex)
    setMode(pickMode())
    setTextInput('')
    setAudioEnInput('')
    setAudioItInput('')
    setEvalState({ textResult: null, audioResult: null, aiError: false })
    setPhase('reviewing')
  }

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtext0 text-sm animate-pulse">Caricamento…</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 pt-10">
        <p className="text-red text-sm">Errore nel caricamento delle card.</p>
        <button onClick={load} className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1">
          Riprova
        </button>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtext0 text-sm">Nessuna card da ripassare oggi 🎉</p>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-3xl">🎉</p>
        <p className="text-text font-medium">{cards.length} card ripassate!</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-surface0 text-subtext0 hover:text-text rounded text-sm transition-colors"
        >
          Ricarica
        </button>
      </div>
    )
  }

  if (!card) return null

  const canSubmit = mode === 'audio'
    ? audioEnInput.trim() !== '' && audioItInput.trim() !== ''
    : textInput.trim() !== ''

  // ── Reviewing / Evaluating ────────────────────────────────────────────────────
  if (phase === 'reviewing' || phase === 'evaluating') {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <span className="text-xs text-subtext0">{index + 1} / {cards.length}</span>
          <div className="flex-1 h-1 bg-surface0 rounded-full overflow-hidden">
            <div
              className="h-full bg-mauve rounded-full transition-all"
              style={{ width: `${((index + 1) / cards.length) * 100}%` }}
            />
          </div>
        </div>

        {mode === 'audio' ? (
          <div
            onClick={() => speak(card.english)}
            className="flex-1 flex flex-col items-center justify-center gap-3 bg-surface0/30
              border border-blue/30 rounded-xl cursor-pointer hover:border-blue/60 transition-colors mb-4"
          >
            <span className="text-4xl">🔊</span>
            <span className="text-sm text-blue font-medium">Clicca per risentire</span>
            <span className="text-xs text-subtext0">Scrivi la parola che senti</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-surface0/30 border border-surface0 rounded-xl mb-4">
            <span className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded">
              {mode === 'text-en-it' ? '🔤 en → it' : '🔤 it → en'}
            </span>
            <span className="text-3xl font-bold text-text">
              {mode === 'text-en-it' ? card.english : card.italian}
            </span>
            <span className="text-xs text-subtext0">
              {mode === 'text-en-it' ? 'Scrivi la traduzione italiana' : 'Scrivi la traduzione inglese'}
            </span>
            <button
              onClick={() => speak(card.english)}
              className="flex items-center gap-1.5 text-xs text-blue bg-surface0 px-3 py-1
                rounded-full hover:bg-surface1 transition-colors"
            >
              🔊 Ascolta pronuncia
            </button>
          </div>
        )}

        {mode === 'audio' ? (
          <div className="flex gap-3 mb-3 shrink-0">
            <div className="flex-1">
              <label className="text-xs text-subtext0 mb-1 block">Parola inglese</label>
              <input
                type="text"
                value={audioEnInput}
                onChange={e => setAudioEnInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canSubmit && phase === 'reviewing') handleSubmit() }}
                disabled={phase === 'evaluating'}
                placeholder="Spelling..."
                className="w-full bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                  placeholder:text-subtext0 outline-none focus:border-mauve transition-colors disabled:opacity-50"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-subtext0 mb-1 block">Traduzione italiana</label>
              <input
                type="text"
                value={audioItInput}
                onChange={e => setAudioItInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canSubmit && phase === 'reviewing') handleSubmit() }}
                disabled={phase === 'evaluating'}
                placeholder="Traduzione..."
                className="w-full bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                  placeholder:text-subtext0 outline-none focus:border-mauve transition-colors disabled:opacity-50"
              />
            </div>
          </div>
        ) : (
          <div className="mb-3 shrink-0">
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit && phase === 'reviewing') handleSubmit() }}
              disabled={phase === 'evaluating'}
              placeholder={mode === 'text-en-it' ? 'Traduzione italiana...' : 'English translation...'}
              autoFocus
              className="w-full bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                placeholder:text-subtext0 outline-none focus:border-mauve transition-colors disabled:opacity-50"
            />
          </div>
        )}

        <div className="flex justify-end shrink-0">
          {phase === 'evaluating' ? (
            <span className="text-sm text-subtext0 animate-pulse">Valutazione in corso…</span>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-5 py-2 bg-mauve text-base rounded-lg text-sm font-medium
                hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Valuta ▶
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Result ────────────────────────────────────────────────────────────────────
  const synonymsEn = card.synonyms_en?.split(', ').filter(Boolean) ?? []
  const synonymsIt = card.synonyms_it?.split(', ').filter(Boolean) ?? []
  const examplesEn = card.examples_en?.split('\n\n').filter(Boolean) ?? []
  const examplesIt = card.examples_it?.split('\n\n').filter(Boolean) ?? []

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <span className="text-xs text-subtext0">{index + 1} / {cards.length}</span>
        <div className="flex-1 h-1 bg-surface0 rounded-full overflow-hidden">
          <div className="h-full bg-mauve rounded-full" style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
        </div>
      </div>

      {evalState.aiError && (
        <div className="mb-3 p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-xs shrink-0">
          ⚠ Valutazione AI non disponibile
        </div>
      )}
      {saveError && (
        <div className="mb-3 p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-xs shrink-0">
          ⚠ Salvataggio non riuscito
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-surface0/30 border border-surface0 rounded-xl p-4 mb-4 min-h-0">
        {evalState.textResult && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-text">
                {mode === 'text-en-it'
                  ? `${card.english} → ${card.italian}`
                  : `${card.italian} → ${card.english}`}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                evalState.textResult.is_correct ? 'bg-green/20 text-green' : 'bg-red/20 text-red'
              }`}>
                {evalState.textResult.is_correct ? '✓ Corretto' : '✗ Sbagliato'}
              </span>
            </div>
            <p className="text-xs text-subtext0 mb-3">{evalState.textResult.explanation}</p>
          </>
        )}

        {evalState.audioResult && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-subtext0 w-20 shrink-0">Spelling:</span>
              <span className="text-sm font-medium text-text">{card.english}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                evalState.audioResult.english_correct ? 'bg-green/20 text-green' : 'bg-red/20 text-red'
              }`}>
                {evalState.audioResult.english_correct ? '✓' : '✗'}
              </span>
            </div>
            <p className="text-xs text-subtext0 mb-2">{evalState.audioResult.english_explanation}</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-subtext0 w-20 shrink-0">Traduzione:</span>
              <span className="text-sm font-medium text-text">{card.italian}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                evalState.audioResult.italian_correct ? 'bg-green/20 text-green' : 'bg-red/20 text-red'
              }`}>
                {evalState.audioResult.italian_correct ? '✓' : '✗'}
              </span>
            </div>
            <p className="text-xs text-subtext0 mb-3">{evalState.audioResult.italian_explanation}</p>
          </>
        )}

        {evalState.aiError && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-text">{card.english} → {card.italian}</span>
          </div>
        )}

        {synonymsEn.length > 0 && (
          <>
            <p className="text-xs text-subtext0 uppercase tracking-wider mb-1.5">Sinonimi EN</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {synonymsEn.map(s => (
                <span key={s} className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </>
        )}
        {synonymsIt.length > 0 && (
          <>
            <p className="text-xs text-subtext0 uppercase tracking-wider mb-1.5">Sinonimi IT</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {synonymsIt.map(s => (
                <span key={s} className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </>
        )}

        {examplesEn.length > 0 && (
          <>
            <div className="h-px bg-surface0 mb-3" />
            <p className="text-xs text-subtext0 uppercase tracking-wider mb-2">Esempi</p>
            {examplesEn.map((ex, i) => (
              <div key={i} className="mb-2">
                <p className="text-xs text-text">{ex}</p>
                {examplesIt[i] && <p className="text-xs text-subtext0">{examplesIt[i]}</p>}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="flex justify-end shrink-0">
        <button
          onClick={handleNext}
          className="px-5 py-2 bg-surface0 text-text rounded-lg text-sm hover:bg-surface1 transition-colors"
        >
          {index + 1 < cards.length ? 'Avanti →' : 'Fine ✓'}
        </button>
      </div>
    </div>
  )
}
