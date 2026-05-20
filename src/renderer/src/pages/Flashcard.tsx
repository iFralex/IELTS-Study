import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReviewSession } from '../components/flashcard/ReviewSession'
import { CardLibrary } from '../components/flashcard/CardLibrary'

type Tab = 'review' | 'library'

export function Flashcard() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('review')

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-surface0 shrink-0">
        <h1 className="text-xl font-bold text-text">{t('flashcard.title')}</h1>
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
          ? <ReviewSession />
          : <CardLibrary onStartReview={() => setActiveTab('review')} />}
      </div>
    </div>
  )
}
