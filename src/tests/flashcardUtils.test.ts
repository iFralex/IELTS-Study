import { describe, it, expect } from 'vitest'
import { pickMode, computeQualityFromDual } from '../renderer/src/components/flashcard/flashcardUtils'

describe('pickMode', () => {
  it('always returns a valid mode', () => {
    const valid = new Set(['text-en-it', 'text-it-en', 'audio'])
    for (let i = 0; i < 100; i++) expect(valid.has(pickMode())).toBe(true)
  })
  it('returns all three modes across many calls', () => {
    const seen = new Set(Array.from({ length: 300 }, () => pickMode()))
    expect(seen.size).toBe(3)
  })
})

describe('computeQualityFromDual', () => {
  it('both correct → 5', () => expect(computeQualityFromDual(true, true)).toBe(5))
  it('english only → 3', () => expect(computeQualityFromDual(true, false)).toBe(3))
  it('italian only → 3', () => expect(computeQualityFromDual(false, true)).toBe(3))
  it('both wrong → 1', () => expect(computeQualityFromDual(false, false)).toBe(1))
})
