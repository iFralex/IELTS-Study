import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Flashcard, FlashcardLanguageCode } from '../../types'
import { LoadingErrorState } from '../LoadingErrorState'

interface Props {
  language: FlashcardLanguageCode
  onStartReview: () => void
}

export function CardLibrary({ language, onStartReview }: Props) {
  const { t } = useTranslation()
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  function load() {
    setError(null)
    setCards([])
    setLoading(true)
    window.api.getFlashcards(language)
      .then(setCards)
      .catch(() => setError(t('reviewSession.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [language])

  async function handleDelete(id: number) {
    await window.api.deleteFlashcard(id)
    setCards(cs => cs.filter(c => c.id !== id))
  }

  if (loading || error) return <LoadingErrorState loading={loading} error={error} onRetry={load} />

  const now = Date.now()
  const dueCount = cards.filter(c => c.next_review <= now).length

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <span className="text-sm text-subtext0">
          {cards.length} {t('cardLibrary.card', { count: cards.length })}
          {dueCount > 0 && <span className="text-yellow"> · {dueCount} {t('cardLibrary.due')}</span>}
        </span>
        <button
          onClick={onStartReview}
          disabled={dueCount === 0}
          className="px-4 py-1.5 bg-mauve text-base rounded text-sm font-medium
            hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('cardLibrary.startReview')}
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="text-subtext0 text-sm text-center pt-10">
          {t('cardLibrary.addFirst')}
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {cards.map(card => {
            const due = card.next_review <= now
            const firstNativeSynonym = card.synonyms_native?.split(', ')[0] ?? null
            return (
              <div
                key={card.id}
                className="flex items-center justify-between bg-surface0/30 border border-surface0
                  rounded-lg px-4 py-3 hover:border-surface1 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-text">{card.english}</span>
                  <span className="text-xs text-subtext0 ml-2 truncate">
                    {card.translation}{firstNativeSynonym ? ` · ${firstNativeSynonym}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {due
                    ? <span className="text-xs bg-yellow/20 text-yellow px-2 py-0.5 rounded">{t('cardLibrary.today')}</span>
                    : <span className="text-xs bg-surface0 text-subtext0 px-2 py-0.5 rounded">{t('cardLibrary.interval')} {card.interval}</span>
                  }
                  {confirmDeleteId === card.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { void handleDelete(card.id); setConfirmDeleteId(null) }}
                        className="text-xs text-red hover:text-red/80 transition-colors px-1"
                      >
                        {t('common.delete')}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-subtext0 hover:text-text transition-colors px-1"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(card.id)}
                      className="text-subtext0 hover:text-red transition-colors text-sm px-1"
                      title={t('common.delete')}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
