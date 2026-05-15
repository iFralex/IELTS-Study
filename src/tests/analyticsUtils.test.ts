import { describe, it, expect } from 'vitest'
import { formatDuration, formatAccuracy } from '../renderer/src/components/analyticsUtils'

describe('formatDuration', () => {
  it('returns 0s for zero', () => expect(formatDuration(0)).toBe('0s'))
  it('returns seconds for < 60', () => expect(formatDuration(45)).toBe('45s'))
  it('returns minutes for exactly 60', () => expect(formatDuration(60)).toBe('1m'))
  it('floors to minutes (no seconds shown)', () => expect(formatDuration(90)).toBe('1m'))
  it('returns hours only when no remaining minutes', () => expect(formatDuration(3600)).toBe('1h'))
  it('returns hours and minutes', () => expect(formatDuration(3660)).toBe('1h 1m'))
  it('returns hours and minutes for 5400s', () => expect(formatDuration(5400)).toBe('1h 30m'))
})

describe('formatAccuracy', () => {
  it('returns 0% for zero', () => expect(formatAccuracy(0)).toBe('0%'))
  it('rounds to nearest integer', () => expect(formatAccuracy(0.724)).toBe('72%'))
  it('returns 100% for 1', () => expect(formatAccuracy(1)).toBe('100%'))
})
