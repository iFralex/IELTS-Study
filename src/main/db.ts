import Database from 'better-sqlite3'
import path from 'path'

export function migrateDb(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id         TEXT    NOT NULL,
      section             TEXT    NOT NULL,
      question_type       TEXT,
      started_at          INTEGER NOT NULL,
      completed_at        INTEGER,
      score               REAL,
      max_score           REAL,
      time_spent_seconds  INTEGER,
      text                TEXT,
      word_count          INTEGER,
      band_score          REAL,
      self_score          REAL,
      notes               TEXT,
      feedback_json       TEXT
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
    CREATE TABLE IF NOT EXISTS flashcards (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      english      TEXT    NOT NULL,
      translation  TEXT    NOT NULL,
      native_language TEXT NOT NULL DEFAULT 'it',
      synonyms_en  TEXT,
      synonyms_native TEXT,
      examples_en  TEXT,
      examples_native TEXT,
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id    INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role       TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Column migrations
  const flashcardColumns = new Set(
    (db.prepare('PRAGMA table_info(flashcards)').all() as { name: string }[]).map(column => column.name)
  )
  const addFlashcardColumn = (name: string, definition: string) => {
    if (!flashcardColumns.has(name)) {
      db.exec(`ALTER TABLE flashcards ADD COLUMN ${name} ${definition}`)
      flashcardColumns.add(name)
    }
  }

  addFlashcardColumn('native_language', "TEXT NOT NULL DEFAULT 'it'")
  addFlashcardColumn('translation', 'TEXT')
  addFlashcardColumn('synonyms_en', 'TEXT')
  addFlashcardColumn('synonyms_native', 'TEXT')
  addFlashcardColumn('examples_native', 'TEXT')

  // Existing installations stored every native-language value in Italian columns.
  if (flashcardColumns.has('italian')) {
    db.exec("UPDATE flashcards SET translation = italian WHERE translation IS NULL OR translation = ''")
  }
  if (flashcardColumns.has('synonyms_it')) {
    db.exec("UPDATE flashcards SET synonyms_native = synonyms_it WHERE synonyms_native IS NULL")
  }
  if (flashcardColumns.has('examples_it')) {
    db.exec("UPDATE flashcards SET examples_native = examples_it WHERE examples_native IS NULL")
  }
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
