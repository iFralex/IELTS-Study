import { useTranslation } from 'react-i18next'

interface LoadingErrorStateProps {
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function LoadingErrorState({ loading, error, onRetry }: LoadingErrorStateProps) {
  const { t } = useTranslation()

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-subtext0 text-sm animate-pulse">{t('common.loading')}</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center gap-4 py-10">
      <p className="text-red text-sm">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-surface0 text-text rounded text-sm hover:bg-surface1 transition-colors"
      >
        {t('common.retry')}
      </button>
    </div>
  )

  return null
}
