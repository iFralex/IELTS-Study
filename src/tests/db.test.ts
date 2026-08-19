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
    expect(names).not.toContain('writing_submissions')
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
    expect(cols).toContain('native_language')
    expect(cols).toContain('translation')
    expect(cols).toContain('synonyms_native')
    expect(cols).toContain('examples_native')
  })

  it('migrates existing Italian flashcards to the generic native-language fields', () => {
    db.close()
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        english TEXT NOT NULL,
        italian TEXT NOT NULL,
        synonyms_en TEXT,
        synonyms_it TEXT,
        examples_en TEXT,
        examples_it TEXT,
        interval INTEGER NOT NULL DEFAULT 1,
        ease_factor REAL NOT NULL DEFAULT 2.5,
        repetitions INTEGER NOT NULL DEFAULT 0,
        next_review INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        source TEXT
      );
      INSERT INTO flashcards
        (english, italian, synonyms_en, synonyms_it, examples_en, examples_it, next_review, created_at)
      VALUES ('hello', 'ciao', 'hi', 'salve', 'Hello there.', 'Ciao.', 0, 0);
    `)

    migrateDb(db)

    const card = db.prepare(
      'SELECT translation, native_language, synonyms_native, examples_native FROM flashcards'
    ).get() as Record<string, string>
    expect(card).toEqual({
      translation: 'ciao',
      native_language: 'it',
      synonyms_native: 'salve',
      examples_native: 'Ciao.',
    })
  })

  it('is idempotent — migrate twice does not throw', () => {
    expect(() => migrateDb(db)).not.toThrow()
  })
})
