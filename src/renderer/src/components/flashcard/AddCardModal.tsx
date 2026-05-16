import { useState, useEffect } from 'react'
import type { AIFlashcardData, FlashcardInput } from '../../types'

interface Props {
  onClose: () => void
  initialWord?: string
}

type Phase = 'input' | 'loading' | 'preview' | 'saving'

export function AddCardModal({ onClose, initialWord }: Props) {
  const [phase, setPhase] = useState<Phase>(initialWord ? 'loading' : 'input')
  const [word, setWord] = useState(initialWord ?? '')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AIFlashcardData>({
    english: '', italian: '', synonyms_en: '', synonyms_it: '', examples_en: '', examples_it: '',
  })

  useEffect(() => {
    if (initialWord) handleGenerate(initialWord)
  }, [])

  async function handleGenerate(w = word) {
    if (!w.trim()) return
    setError(null)
    setPhase('loading')
    try {
      const result = await window.api.generateFlashcard(w.trim())
      setData(result)
      setPhase('preview')
    } catch {
      setError('Errore nella generazione. Riprova.')
      setPhase('input')
    }
  }

  async function handleSave() {
    setPhase('saving')
    try {
      const card: FlashcardInput = {
        english: data.english,
        italian: data.italian,
        synonyms_en: data.synonyms_en || null,
        synonyms_it: data.synonyms_it || null,
        examples_en: data.examples_en,
        examples_it: data.examples_it,
      }
      await window.api.saveFlashcard(card)
      onClose()
    } catch {
      setError('Errore nel salvataggio.')
      setPhase('preview')
    }
  }

  const fields: { label: string; key: keyof AIFlashcardData; multiline?: boolean }[] = [
    { label: 'Inglese', key: 'english' },
    { label: 'Italiano', key: 'italian' },
    { label: 'Sinonimi EN', key: 'synonyms_en' },
    { label: 'Sinonimi IT', key: 'synonyms_it' },
    { label: 'Esempi EN', key: 'examples_en', multiline: true },
    { label: 'Esempi IT', key: 'examples_it', multiline: true },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm">
      <div className="bg-mantle border border-surface0 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">Aggiungi flashcard</h2>
          <button
            onClick={onClose}
            className="text-subtext0 hover:text-text transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {phase === 'input' && (
          <div className="flex flex-col gap-3">
            {error && <p className="text-sm text-red">{error}</p>}
            <input
              type="text"
              value={word}
              onChange={e => setWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="Parola inglese..."
              autoFocus
              className="bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                placeholder:text-subtext0 outline-none focus:border-mauve transition-colors"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={!word.trim()}
              className="px-4 py-2 bg-mauve text-base rounded-lg text-sm font-medium
                hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Genera ✨
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <p className="text-sm text-subtext0 animate-pulse text-center py-6">Generazione in corso…</p>
        )}

        {(phase === 'preview' || phase === 'saving') && (
          <div className="flex flex-col gap-3">
            {error && <p className="text-sm text-red">{error}</p>}
            {fields.map(({ label, key, multiline }) => (
              <div key={key}>
                <label className="text-xs text-subtext0 mb-1 block">{label}</label>
                {multiline ? (
                  <textarea
                    value={data[key]}
                    onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
                    rows={3}
                    className="w-full bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                      outline-none focus:border-mauve transition-colors resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={data[key]}
                    onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
                    className="w-full bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                      outline-none focus:border-mauve transition-colors"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-surface0 text-subtext0 hover:text-text rounded-lg text-sm transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={phase === 'saving'}
                className="px-4 py-2 bg-mauve text-base rounded-lg text-sm font-medium
                  hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {phase === 'saving' ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
