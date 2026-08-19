import { useTranslation } from 'react-i18next'
import {
  FLASHCARD_LANGUAGES,
  type FlashcardLanguageCode,
} from '../../types'

interface Props {
  value: FlashcardLanguageCode | null
  onChange: (language: FlashcardLanguageCode) => void
  onboarding?: boolean
}

export function FlashcardLanguagePicker({ value, onChange, onboarding = false }: Props) {
  const { t } = useTranslation()

  if (onboarding) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-5 p-8">
        <span className="text-4xl">🗣️</span>
        <div>
          <h2 className="text-lg font-bold text-text">{t('flashcardLanguage.title')}</h2>
          <p className="text-sm text-subtext0 mt-1 max-w-md">{t('flashcardLanguage.description')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md">
          {FLASHCARD_LANGUAGES.map(language => (
            <button
              key={language.code}
              onClick={() => onChange(language.code)}
              className="flex items-center gap-2 px-4 py-3 bg-surface0 border border-surface1 rounded-lg
                text-sm text-text hover:border-mauve hover:bg-surface1 transition-colors"
            >
              <span className="text-xl">{language.flag}</span>
              <span>{language.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-subtext0">{t('flashcardLanguage.existingCards')}</p>
      </div>
    )
  }

  return (
    <label className="flex items-center gap-2 text-xs text-subtext0">
      {t('flashcardLanguage.label')}
      <select
        value={value ?? ''}
        onChange={event => onChange(event.target.value as FlashcardLanguageCode)}
        className="bg-surface0 border border-surface1 rounded px-2 py-1.5 text-sm text-text outline-none focus:border-mauve"
      >
        {FLASHCARD_LANGUAGES.map(language => (
          <option key={language.code} value={language.code}>
            {language.flag} {language.name}
          </option>
        ))}
      </select>
    </label>
  )
}
