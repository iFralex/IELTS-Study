import { useTranslation } from 'react-i18next'

interface Props { onClick: () => void }

export function FloatingFlashcardButton({ onClick }: Props) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 rounded-full bg-mauve text-base
        flex items-center justify-center text-xl shadow-lg hover:scale-110 transition-transform"
      title={t('floatingFlashcard.tooltip')}
    >
      🃏
    </button>
  )
}
