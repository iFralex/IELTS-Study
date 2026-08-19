import { describe, it, expect } from 'vitest'
import {
  normalizeAnswer,
  scoreAnswers,
  estimateBand,
  filterExercises,
  buildSeries,
  highlightPassage,
} from '../../renderer/src/components/practice/utils'
import type { Question } from '../../renderer/src/types'

const q = (index: number, answer: string): Question => ({ index, text: 'Q?', answer })

describe('normalizeAnswer', () => {
  it('lowercases and trims', () => {
    expect(normalizeAnswer('  TRUE  ')).toBe('true')
    expect(normalizeAnswer('False')).toBe('false')
    expect(normalizeAnswer('  B  ')).toBe('b')
  })
})

describe('scoreAnswers', () => {
  it('counts correct answers case-insensitively', () => {
    const questions = [q(0, 'TRUE'), q(1, 'FALSE'), q(2, 'rivers')]
    const answers = { 0: 'true', 1: 'FALSE', 2: 'Rivers' }
    expect(scoreAnswers(questions, answers)).toEqual({ correctCount: 3, maxScore: 3 })
  })

  it('treats missing answers as wrong', () => {
    const questions = [q(0, 'TRUE'), q(1, 'FALSE')]
    const answers = { 0: 'TRUE' }
    expect(scoreAnswers(questions, answers)).toEqual({ correctCount: 1, maxScore: 2 })
  })

  it('returns 0/0 for empty questions', () => {
    expect(scoreAnswers([], {})).toEqual({ correctCount: 0, maxScore: 0 })
  })
})

describe('estimateBand', () => {
  it('returns 0 when maxScore is 0', () => {
    expect(estimateBand(0, 0, 'listening')).toBe(0)
  })

  it('scales a perfect score to band 9', () => {
    expect(estimateBand(10, 10, 'listening')).toBe(9)
    expect(estimateBand(10, 10, 'reading')).toBe(9)
  })

  it('returns half bands from the conversion tables', () => {
    expect(estimateBand(7, 10, 'listening')).toBe(6.5)
    expect(estimateBand(7, 10, 'reading')).toBe(6.5)
  })

  it('uses different Listening and Academic Reading thresholds', () => {
    expect(estimateBand(8, 10, 'listening')).toBe(7.5)
    expect(estimateBand(8, 10, 'reading')).toBe(7)
  })

  it('maps lower scaled scores through the selected table', () => {
    expect(estimateBand(6, 10, 'listening')).toBe(6)
    expect(estimateBand(4, 10, 'reading')).toBe(5)
  })
})

describe('filterExercises', () => {
  const exs = [
    { id: 'a', question_type: 'gap_fill' },
    { id: 'b', question_type: 'multiple_choice' },
    { id: 'c', question_type: 'gap_fill' },
  ]

  it('filters by specific type', () => {
    expect(filterExercises(exs, new Set(), 'gap_fill', true).map(e => e.id)).toEqual(['a', 'c'])
  })

  it('type=all returns all when showCompleted=true', () => {
    expect(filterExercises(exs, new Set(['a']), 'all', true)).toHaveLength(3)
  })

  it('hides completed when showCompleted=false', () => {
    expect(filterExercises(exs, new Set(['a']), 'all', false).map(e => e.id)).toEqual(['b', 'c'])
  })

  it('combines type filter and showCompleted', () => {
    const result = filterExercises(exs, new Set(['a']), 'gap_fill', false)
    expect(result.map(e => e.id)).toEqual(['c'])
  })
})

describe('buildSeries', () => {
  const exs = [
    { id: 'a', question_type: 'gap_fill' },
    { id: 'b', question_type: 'multiple_choice' },
    { id: 'c', question_type: 'gap_fill' },
    { id: 'd', question_type: 'gap_fill' },
  ]

  it('type mode + specific type returns undone of that type', () => {
    expect(buildSeries(exs, 'type', 'gap_fill', new Set(['a'])).map(e => e.id)).toEqual(['c', 'd'])
  })

  it('type mode + all returns all undone in order', () => {
    expect(buildSeries(exs, 'type', 'all', new Set(['a'])).map(e => e.id)).toEqual(['b', 'c', 'd'])
  })

  it('random mode returns at most max exercises', () => {
    expect(buildSeries(exs, 'random', 'all', new Set(), 2)).toHaveLength(2)
  })

  it('random mode excludes completed', () => {
    expect(buildSeries(exs, 'random', 'all', new Set(['a', 'b', 'c', 'd']))).toHaveLength(0)
  })
})

describe('highlightPassage', () => {
  const passage = 'The quick brown fox jumps over the lazy dog near the river bank.'

  it('returns excerpt containing the match', () => {
    const result = highlightPassage(passage, 'fox')
    expect(result).not.toBeNull()
    expect(result).toContain('fox')
  })

  it('returns null when not found', () => {
    expect(highlightPassage(passage, 'elephant')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(highlightPassage(passage, 'FOX')).not.toBeNull()
  })

  it('returns null for empty searchText', () => {
    expect(highlightPassage(passage, '   ')).toBeNull()
  })
})
