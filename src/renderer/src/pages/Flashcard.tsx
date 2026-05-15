import { useState } from 'react'
import { ReviewSession } from '../components/flashcard/ReviewSession'
import { CardLibrary } from '../components/flashcard/CardLibrary'

type Tab = 'review' | 'library'

export function Flashcard() {
  const [activeTab, setActiveTab] = useState<Tab>('review')

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-surface0 shrink-0">
        <h1 className="text-xl font-bold text-text">Flashcard</h1>
        <div className="flex gap-2 mt-3">
          {(['review', 'library'] as Tab[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                activeTab === t ? 'bg-mauve text-base font-medium' : 'bg-surface0 text-subtext0 hover:text-text'
              }`}>
              {t === 'review' ? 'Ripasso' : 'Le mie card'}
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
