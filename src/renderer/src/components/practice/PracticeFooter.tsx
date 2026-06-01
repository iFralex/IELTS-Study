import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface PracticeFooterProps {
  onBack: () => void
  children: ReactNode
}

export function PracticeFooter({ onBack, children }: PracticeFooterProps) {
  const { t } = useTranslation()
  return (
    <div className="px-5 py-3 border-t border-surface0 shrink-0 flex items-center justify-between gap-3">
      <button onClick={onBack} className="text-sm text-subtext0 hover:text-text transition-colors">
        ← {t('practice.abandon')}
      </button>
      {children}
    </div>
  )
}
