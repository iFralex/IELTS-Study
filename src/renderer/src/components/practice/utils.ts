import type { Question } from '../../types'

export function normalizeAnswer(s: string): string {
  return s.toLowerCase().trim()
}

export function scoreAnswers(
  questions: Question[],
  answers: Record<number, string>
): { correctCount: number; maxScore: number } {
  let correctCount = 0
  for (const q of questions) {
    if (normalizeAnswer(answers[q.index] ?? '') === normalizeAnswer(q.answer)) {
      correctCount++
    }
  }
  return { correctCount, maxScore: questions.length }
}

export function estimateBand(correctCount: number, maxScore: number): number {
  if (maxScore === 0) return 0
  const pct = correctCount / maxScore
  if (pct >= 0.85) return 8
  if (pct >= 0.70) return 7
  if (pct >= 0.55) return 6
  return 5
}

export function filterExercises<T extends { id: string; question_type: string }>(
  exercises: T[],
  completedIds: Set<string>,
  typeFilter: string,
  showCompleted: boolean
): T[] {
  return exercises.filter(e => {
    if (!showCompleted && completedIds.has(e.id)) return false
    if (typeFilter !== 'all' && e.question_type !== typeFilter) return false
    return true
  })
}

export function buildSeries<T extends { id: string; question_type: string }>(
  exercises: T[],
  mode: 'type' | 'random',
  typeFilter: string,
  completedIds: Set<string>,
  max = 10
): T[] {
  const undone = exercises.filter(e => !completedIds.has(e.id))
  if (mode === 'type') {
    return typeFilter === 'all' ? undone : undone.filter(e => e.question_type === typeFilter)
  }
  return [...undone].sort(() => Math.random() - 0.5).slice(0, max)
}

export function highlightPassage(passage: string, searchText: string): string | null {
  if (!searchText.trim()) return null
  const idx = passage.toLowerCase().indexOf(searchText.toLowerCase())
  if (idx === -1) return null
  const start = Math.max(0, idx - 150)
  const end = Math.min(passage.length, idx + searchText.length + 150)
  return passage.slice(start, end)
}

// Question types where the answer is an actual phrase from the passage
const LITERAL_ANSWER_TYPES = new Set(['sentence_completion', 'summary_completion', 'short_answer'])

const STOP_WORDS = new Set(['the','a','an','is','are','was','were','be','been','being','have',
  'has','had','do','does','did','will','would','could','should','may','might','shall','can',
  'not','no','nor','so','yet','both','either','neither','for','and','but','or','in','on',
  'at','to','of','by','with','from','that','this','these','those','it','its','they','them',
  'their','there','than','then','when','which','who','what','how','if','as','up','out','into'])

export function findPassageExcerpt(
  passage: string,
  questionText: string,
  answer: string,
  questionType: string
): { excerpt: string; term: string } | null {
  // For types where answer IS literal passage text, search the answer directly
  if (LITERAL_ANSWER_TYPES.has(questionType)) {
    const excerpt = highlightPassage(passage, answer)
    return excerpt ? { excerpt, term: answer } : null
  }

  // For matching_headings, extract the heading name after the dash
  if (questionType === 'matching_headings') {
    const match = answer.match(/[-–—]\s*(.+)/)
    const term = match ? match[1].trim() : answer
    const excerpt = highlightPassage(passage, term)
    return excerpt ? { excerpt, term } : null
  }

  // For true_false_ng, multiple_choice, matching_paragraph_info:
  // find content words (4+ chars, not stop words) from the question text
  const words = (questionText.match(/\b[a-zA-Z]{4,}\b/g) ?? [])
    .filter(w => !STOP_WORDS.has(w.toLowerCase()))
  for (const word of words) {
    const excerpt = highlightPassage(passage, word)
    if (excerpt) return { excerpt, term: word }
  }
  return null
}
