import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReviewSession } from '../components/flashcard/ReviewSession'
import { CardLibrary } from '../components/flashcard/CardLibrary'
import { FlashcardLanguagePicker } from '../components/flashcard/FlashcardLanguagePicker'
import { isFlashcardLanguage, type FlashcardLanguageCode } from '../types'

type Tab = 'review' | 'library'

export function Flashcard() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('review')
  const [language, setLanguage] = useState<FlashcardLanguageCode | null>(null)
  const [loadingLanguage, setLoadingLanguage] = useState(true)

  useEffect(() => {
    window.api.getSetting('flashcard_native_language')
      .then(value => {
        if (value && isFlashcardLanguage(value)) setLanguage(value)
      })
      .finally(() => setLoadingLanguage(false))
  }, [])

  async function chooseLanguage(nextLanguage: FlashcardLanguageCode) {
    await window.api.setSetting('flashcard_native_language', nextLanguage)
    setLanguage(nextLanguage)
  }

  if (loadingLanguage) return null

  if (!language) {
    return (
      <div className="h-full flex items-center justify-center">
        <FlashcardLanguagePicker value={null} onChange={chooseLanguage} onboarding />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-surface0 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-text">{t('flashcard.title')}</h1>
          <FlashcardLanguagePicker value={language} onChange={chooseLanguage} />
        </div>
        <div className="flex gap-2 mt-3">
          {(['review', 'library'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                activeTab === tab ? 'bg-mauve text-base font-medium' : 'bg-surface0 text-subtext0 hover:text-text'
              }`}>
              {tab === 'review' ? t('flashcard.review') : t('flashcard.library')}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'review'
          ? <ReviewSession key={language} language={language} />
          : <CardLibrary key={language} language={language} onStartReview={() => setActiveTab('review')} />}
      </div>
    </div>
  )
}
