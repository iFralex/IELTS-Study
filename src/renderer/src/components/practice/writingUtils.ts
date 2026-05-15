import type { WritingTask1, WritingTask2 } from '../../types'

export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export const WORD_MINIMUMS: Record<'task1' | 'task2', number> = {
  task1: 150,
  task2: 250,
}

export function isUnderMinimum(count: number, taskType: 'task1' | 'task2'): boolean {
  return count < WORD_MINIMUMS[taskType]
}

export function bandColor(band: number): string {
  if (band >= 7) return 'text-green'
  if (band >= 6) return 'text-yellow'
  return 'text-red'
}

export function isTask1(exercise: WritingTask1 | WritingTask2): exercise is WritingTask1 {
  return 'chart_type' in exercise
}
