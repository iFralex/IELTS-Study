import type { WordAnnotation } from '../../types'

interface Segment {
  text: string
  annotation?: WordAnnotation
}

function buildSegments(text: string, annotations: WordAnnotation[]): Segment[] {
  type Range = { start: number; end: number; annotation: WordAnnotation }
  const ranges: Range[] = []

  for (const ann of annotations) {
    const escaped = ann.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'i')
    const match = regex.exec(text)
    if (!match || match.index === undefined) continue
    const start = match.index
    const end = start + match[0].length
    if (ranges.some(r => start < r.end && end > r.start)) continue
    ranges.push({ start, end, annotation: ann })
  }

  ranges.sort((a, b) => a.start - b.start)

  const segments: Segment[] = []
  let cursor = 0
  for (const r of ranges) {
    if (r.start > cursor) segments.push({ text: text.slice(cursor, r.start) })
    segments.push({ text: text.slice(r.start, r.end), annotation: r.annotation })
    cursor = r.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}

interface AnnotatedTextProps {
  text: string
  annotations: WordAnnotation[]
}

export function AnnotatedText({ text, annotations }: AnnotatedTextProps) {
  const paragraphs = text.split(/\n\n+/)

  return (
    <div className="flex flex-col gap-3">
      {paragraphs.map((para, pi) => {
        const segments = buildSegments(para, annotations)
        return (
          <p key={pi} className="text-sm text-text leading-7">
            {segments.map((seg, si) =>
              seg.annotation ? (
                <span key={si} className="relative group inline-block">
                  <span className={`cursor-help underline decoration-2 underline-offset-2 ${
                    seg.annotation.type === 'grammar'
                      ? 'decoration-red text-red/90'
                      : 'decoration-yellow text-yellow/90'
                  }`}>
                    {seg.text}
                  </span>
                  <span className="hidden group-hover:flex flex-col gap-0.5
                    absolute bottom-full left-0 mb-1.5 z-50
                    bg-mantle border border-surface1 rounded-lg px-3 py-2 shadow-xl
                    min-w-max max-w-xs text-xs">
                    <span className="absolute top-full left-0 w-full h-2" />
                    <span className="font-semibold text-text">{seg.annotation.correction}</span>
                    <span className="text-subtext0">{seg.annotation.explanation}</span>
                  </span>
                </span>
              ) : (
                <span key={si}>{seg.text}</span>
              )
            )}
          </p>
        )
      })}
    </div>
  )
}
