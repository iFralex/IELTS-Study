import { useTranslation } from 'react-i18next'
import { countWords, isUnderMinimum, WORD_MINIMUMS } from './writingUtils'

interface WritingEditorProps {
  taskType: 'task1' | 'task2'
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function WritingEditor({ taskType, value, onChange, disabled = false }: WritingEditorProps) {
  const { t } = useTranslation()
  const count = countWords(value)
  const under = isUnderMinimum(count, taskType)
  const minimum = WORD_MINIMUMS[taskType]

  return (
    <div className="flex flex-col h-full">
      <textarea
        className="flex-1 resize-none bg-surface0 text-text font-mono text-sm p-4
          focus:outline-none focus:ring-1 focus:ring-mauve/50 disabled:opacity-60"
        placeholder={t('writingEditor.placeholder', { min: minimum, words: t('common.words') })}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
      />
      <div className="px-4 py-2 bg-mantle border-t border-surface0 text-xs shrink-0">
        <span className={under ? 'text-yellow' : 'text-green'}>
          {count} / {minimum} {t('writingEditor.wordCount')}
        </span>
      </div>
    </div>
  )
}
