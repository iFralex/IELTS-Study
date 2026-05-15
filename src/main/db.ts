import Database from 'better-sqlite3'
import path from 'path'

export function migrateDb(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id         TEXT    NOT NULL,
      section             TEXT    NOT NULL,
      started_at          INTEGER NOT NULL,
      completed_at        INTEGER,
      score               INTEGER,
      max_score           INTEGER,
      time_spent_seconds  INTEGER
    );
    CREATE TABLE IF NOT EXISTS answers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id      INTEGER NOT NULL REFERENCES sessions(id),
      question_index  INTEGER NOT NULL,
      user_answer     TEXT,
      correct_answer  TEXT,
      is_correct      INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exam_runs (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at       INTEGER NOT NULL,
      completed_at     INTEGER,
      listening_score  REAL,
      reading_score    REAL,
      writing_score    REAL,
      notes            TEXT
    );
    CREATE TABLE IF NOT EXISTS writing_submissions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id       TEXT    NOT NULL,
      task_type     TEXT    NOT NULL,
      submitted_at  INTEGER NOT NULL,
      text          TEXT    NOT NULL,
      word_count    INTEGER,
      self_score    REAL,
      notes         TEXT
    );
    CREATE TABLE IF NOT EXISTS flashcards (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      english      TEXT    NOT NULL,
      italian      TEXT    NOT NULL,
      examples_en  TEXT,
      examples_it  TEXT,
      interval     INTEGER NOT NULL DEFAULT 1,
      ease_factor  REAL    NOT NULL DEFAULT 2.5,
      repetitions  INTEGER NOT NULL DEFAULT 0,
      next_review  INTEGER NOT NULL,
      created_at   INTEGER NOT NULL,
      source       TEXT
    );
    CREATE TABLE IF NOT EXISTS flashcard_reviews (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      flashcard_id  INTEGER NOT NULL REFERENCES flashcards(id),
      reviewed_at   INTEGER NOT NULL,
      direction     TEXT    NOT NULL,
      user_answer   TEXT,
      quality       INTEGER NOT NULL,
      is_correct    INTEGER NOT NULL
    );
  `)
}

let _db: Database.Database | null = null

export function getDb(userDataPath: string): Database.Database {
  if (!_db) {
    const dbPath = path.join(userDataPath, 'ielts.db')
    _db = new Database(dbPath)
    migrateDb(_db)
  }
  return _db
}
