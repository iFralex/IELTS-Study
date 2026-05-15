import { describe, it, expect } from 'vitest'
import {
  countWords,
  isUnderMinimum,
  bandColor,
} from '../../renderer/src/components/practice/writingUtils'

describe('countWords', () => {
  it('returns 0 for empty string', () => expect(countWords('')).toBe(0))
  it('returns 0 for whitespace only', () => expect(countWords('   ')).toBe(0))
  it('counts words correctly', () => expect(countWords('hello world foo')).toBe(3))
  it('handles extra spaces', () => expect(countWords('  a  b  c  ')).toBe(3))
})

describe('isUnderMinimum', () => {
  it('task1: 149 is under minimum', () => expect(isUnderMinimum(149, 'task1')).toBe(true))
  it('task1: 150 is not under minimum', () => expect(isUnderMinimum(150, 'task1')).toBe(false))
  it('task2: 249 is under minimum', () => expect(isUnderMinimum(249, 'task2')).toBe(true))
  it('task2: 250 is not under minimum', () => expect(isUnderMinimum(250, 'task2')).toBe(false))
})

describe('bandColor', () => {
  it('returns text-green for band >= 7', () => expect(bandColor(7)).toBe('text-green'))
  it('returns text-green for band 9', () => expect(bandColor(9)).toBe('text-green'))
  it('returns text-yellow for band 6', () => expect(bandColor(6)).toBe('text-yellow'))
  it('returns text-yellow for band 6.5', () => expect(bandColor(6.5)).toBe('text-yellow'))
  it('returns text-red for band 5.5', () => expect(bandColor(5.5)).toBe('text-red'))
  it('returns text-red for band 4', () => expect(bandColor(4)).toBe('text-red'))
})
