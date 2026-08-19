import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getFlashcardLanguageName,
  isFlashcardLanguage,
  type AIFlashcardData,
  type FlashcardInput,
  type FlashcardLanguageCode,
} from '../../types'
import { FlashcardLanguagePicker } from './FlashcardLanguagePicker'

interface Props {
  onClose: () => void
  initialWord?: string
  initialData?: AIFlashcardData
}

type Phase = 'input' | 'loading' | 'preview' | 'saving'

export function AddCardModal({ onClose, initialWord, initialData }: Props) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>(
    initialData ? 'preview' : 'input'
  )
  const [language, setLanguage] = useState<FlashcardLanguageCode | null>(null)
  const [loadingLanguage, setLoadingLanguage] = useState(true)
  const [word, setWord] = useState(initialWord ?? '')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AIFlashcardData>(
    initialData ?? { english: '', translation: '', synonyms_en: '', synonyms_native: '', examples_en: '', examples_native: '' }
  )

  const didGenerate = useRef(false)
  useEffect(() => {
    window.api.getSetting('flashcard_native_language')
      .then(value => {
        if (value && isFlashcardLanguage(value)) setLanguage(value)
      })
      .finally(() => setLoadingLanguage(false))
  }, [])

  useEffect(() => {
    if (language && initialWord && !initialData && !didGenerate.current) {
      didGenerate.current = true
      void handleGenerate(initialWord, language)
    }
  }, [language])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Enter' && phase === 'preview' && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        void handleSave()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [phase])

  async function chooseLanguage(nextLanguage: FlashcardLanguageCode) {
    await window.api.setSetting('flashcard_native_language', nextLanguage)
    setLanguage(nextLanguage)
  }

  async function handleGenerate(w = word, selectedLanguage = language) {
    if (!w.trim() || !selectedLanguage) return
    setError(null)
    setPhase('loading')
    try {
      const result = await window.api.generateFlashcard(w.trim(), selectedLanguage)
      setData(result)
      setPhase('preview')
    } catch {
      setError(t('addCardModal.generateError'))
      setPhase('input')
    }
  }

  async function handleSave() {
    if (!language) return
    setPhase('saving')
    try {
      const card: FlashcardInput = {
        english: data.english,
        translation: data.translation,
        native_language: language,
        synonyms_en: data.synonyms_en || null,
        synonyms_native: data.synonyms_native || null,
        examples_en: data.examples_en,
        examples_native: data.examples_native,
      }
      await window.api.saveFlashcard(card)
      onClose()
    } catch {
      setError(t('addCardModal.saveError'))
      setPhase('preview')
    }
  }

  const languageName = language ? getFlashcardLanguageName(language) : ''
  const fields: { label: string; key: keyof AIFlashcardData; multiline?: boolean }[] = [
    { label: t('addCardModal.english'), key: 'english' },
    { label: t('addCardModal.translation', { language: languageName }), key: 'translation' },
    { label: t('addCardModal.synonymsEn'), key: 'synonyms_en' },
    { label: t('addCardModal.synonymsNative', { language: languageName }), key: 'synonyms_native' },
    { label: t('addCardModal.examplesEn'), key: 'examples_en', multiline: true },
    { label: t('addCardModal.examplesNative', { language: languageName }), key: 'examples_native', multiline: true },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm">
      <div className="bg-mantle border border-surface0 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">{t('addCardModal.title')}</h2>
          <button
            onClick={onClose}
            className="text-subtext0 hover:text-text transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {loadingLanguage ? (
          <p className="text-sm text-subtext0 animate-pulse text-center py-6">{t('common.loading')}</p>
        ) : !language ? (
          <FlashcardLanguagePicker value={null} onChange={chooseLanguage} onboarding />
        ) : (
          <>
            <div className="flex justify-end mb-3">
              {phase === 'input' ? (
                <FlashcardLanguagePicker value={language} onChange={chooseLanguage} />
              ) : (
                <span className="text-xs text-subtext0">
                  {t('flashcardLanguage.label')}: <span className="text-text">{languageName}</span>
                </span>
              )}
            </div>

        {phase === 'input' && (
          <div className="flex flex-col gap-3">
            {error && <p className="text-sm text-red">{error}</p>}
            <input
              type="text"
              value={word}
              onChange={e => setWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handleGenerate()}
              placeholder={t('addCardModal.englishPlaceholder')}
              autoFocus
              className="bg-surface0 border border-surface1 rounded-lg px-3 py-2 text-sm text-text
                placeholder:text-subtext0 outline-none focus:border-mauve transition-colors"
            />
            <button
              onClick={() => void handleGenerate()}
              disabled={!word.trim()}
              className="px-4 py-2 bg-mauve text-base rounded-lg text-sm font-medium
                hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('addCardModal.generate')}
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <p className="text-sm text-subtext0 animate-pulse text-center py-6">{t('addCardModal.generating')}</p>
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={phase === 'saving'}
                className="px-4 py-2 bg-mauve text-base rounded-lg text-sm font-medium
                  hover:bg-mauve/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {phase === 'saving' ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}
