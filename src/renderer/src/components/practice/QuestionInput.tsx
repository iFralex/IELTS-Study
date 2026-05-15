import type { Question } from '../../types'

interface QuestionInputProps {
  question: Question
  questionType: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  paragraphLabels?: string[]
}

export function QuestionInput({
  question,
  questionType,
  value,
  onChange,
  disabled = false,
  paragraphLabels = [],
}: QuestionInputProps) {
  const inputClass = `bg-surface0 text-text border border-surface1 rounded px-2 py-1 text-sm
    focus:outline-none focus:border-mauve disabled:opacity-60`

  if (
    questionType === 'sentence_completion' ||
    questionType === 'summary_completion' ||
    questionType === 'short_answer' ||
    questionType === 'gap_fill' ||
    questionType === 'form_completion' ||
    questionType === 'map_diagram' ||
    questionType === 'table'
  ) {
    return (
      <input
        type="text"
        className={inputClass}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Your answer…"
      />
    )
  }

  if (questionType === 'true_false_ng') {
    return (
      <div className="flex gap-4">
        {['True', 'False', 'Not Given'].map(opt => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
            <input
              type="radio"
              name={`q-${question.index}`}
              value={opt.toUpperCase().replace(' ', '_')}
              checked={value === opt.toUpperCase().replace(' ', '_')}
              onChange={e => onChange(e.target.value)}
              disabled={disabled}
              className="accent-mauve"
            />
            <span className="text-text">{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (questionType === 'multiple_choice') {
    const options = question.options ?? []
    return (
      <div className="flex flex-col gap-1.5">
        {options.map(opt => (
          <label key={opt} className="flex items-start gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name={`q-${question.index}`}
              value={opt}
              checked={value === opt}
              onChange={e => onChange(e.target.value)}
              disabled={disabled}
              className="accent-mauve mt-0.5 shrink-0"
            />
            <span className="text-text">{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (questionType === 'matching_headings') {
    const options = question.options ?? []
    return (
      <select
        className={`${inputClass} w-full`}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">— Select heading —</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  if (questionType === 'matching_paragraph_info') {
    return (
      <select
        className={`${inputClass} w-48`}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">— Paragraph —</option>
        {paragraphLabels.map(label => (
          <option key={label} value={label}>{label}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      type="text"
      className={inputClass}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Your answer…"
    />
  )
}
