import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrateDb } from '../main/db'

let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  migrateDb(db)
})

afterEach(() => {
  db.close()
})

describe('migrateDb', () => {
  it('creates all 6 tables', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[]
    const names = tables.map(t => t.name)
    expect(names).toContain('sessions')
    expect(names).toContain('answers')
    expect(names).toContain('exam_runs')
    expect(names).toContain('writing_submissions')
    expect(names).toContain('flashcards')
    expect(names).toContain('flashcard_reviews')
  })

  it('sessions table has required columns', () => {
    const info = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[]
    const cols = info.map(c => c.name)
    expect(cols).toContain('exercise_id')
    expect(cols).toContain('section')
    expect(cols).toContain('started_at')
    expect(cols).toContain('score')
    expect(cols).toContain('max_score')
  })

  it('flashcards table has SM2 columns', () => {
    const info = db.prepare("PRAGMA table_info(flashcards)").all() as { name: string }[]
    const cols = info.map(c => c.name)
    expect(cols).toContain('interval')
    expect(cols).toContain('ease_factor')
    expect(cols).toContain('repetitions')
    expect(cols).toContain('next_review')
  })

  it('is idempotent — migrate twice does not throw', () => {
    expect(() => migrateDb(db)).not.toThrow()
  })
})
