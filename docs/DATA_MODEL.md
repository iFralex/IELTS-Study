# Data Model and Persistence

## Storage location

The database is named `ielts.db` and is created under Electron's `app.getPath('userData')` directory. Typical locations are:

| Platform | Typical directory |
|---|---|
| macOS | `~/Library/Application Support/IELTS Study/` |
| Windows | `%APPDATA%\IELTS Study\` |
| Linux | `~/.config/IELTS Study/` |

The exact path is controlled by Electron and the packaged product metadata. Confirm it with the running build when diagnosing a specific installation.

SQLite is configured in WAL mode. The database is opened lazily and retained as a process-wide singleton for the lifetime of the main process.

## Schema

### `sessions`

Stores all completed or in-progress practice submissions, including Writing.

| Column group | Meaning |
|---|---|
| Identity | `id`, `exercise_id`, `section`, `question_type` |
| Timing | `started_at`, `completed_at`, `time_spent_seconds` |
| Objective score | `score`, `max_score` |
| Writing | `text`, `word_count`, `band_score`, `self_score`, `notes`, `feedback_json` |

Writing attempts use `section = 'writing'` and `question_type = 'task1'` or `'task2'`. There is no separate `writing_submissions` table.

### `answers`

Stores per-question results for Listening and Reading:

- parent `session_id`;
- `question_index`;
- `user_answer`;
- `correct_answer`;
- integer `is_correct` flag.

Bulk answer insertion is wrapped in a SQLite transaction.

### `exam_runs`

Stores an aggregate exam record with start/completion timestamps, section scores, and optional notes. Detailed work remains represented by the corresponding session records.

### `flashcards`

Stores one English/native-language card per row:

- `english` and `translation`;
- `native_language` language code;
- English and native-language synonyms;
- English and native-language examples;
- SM-2-inspired scheduler state: `interval`, `ease_factor`, `repetitions`, `next_review`;
- `created_at` and optional `source`.

Decks are selected with `WHERE native_language = ?`. Existing Italian-only installations are migrated with `native_language = 'it'`.

### `flashcard_reviews`

Stores review history: card reference, timestamp, direction, submitted answer, quality score, and correctness. Directions are `en-native`, `native-en`, or `audio` for new reviews; older databases may contain the legacy `en-it` and `it-en` strings.

### `chats` and `chat_messages`

`chats` stores the conversation name and lifecycle timestamps. `chat_messages` stores ordered user/assistant content. The schema declares `ON DELETE CASCADE` for messages.

### `settings`

A string key/value store. Current keys include:

| Key | Meaning |
|---|---|
| `lang` | Renderer interface language |
| `flashcard_native_language` | Active flashcard deck and translation language |

## Relationships

```text
sessions 1 ─── * answers
flashcards 1 ─── * flashcard_reviews
chats 1 ─── * chat_messages

exam_runs is an aggregate record without foreign keys to sessions.
settings is independent key/value state.
```

Foreign-key clauses are present in the schema, but `PRAGMA foreign_keys = ON` is not currently set explicitly. Code therefore deletes dependent rows in a safe order during full reset. Before relying on cascade behavior for new features, enable and test foreign-key enforcement deliberately.

## Migrations

`migrateDb()` runs on every startup and must remain idempotent.

The current strategy is:

1. create missing tables with `CREATE TABLE IF NOT EXISTS`;
2. inspect flashcard columns with `PRAGMA table_info(flashcards)`;
3. add each missing generic-language column;
4. copy legacy `italian`, `synonyms_it`, and `examples_it` values when those columns exist.

SQLite does not provide a migration ledger in this project. For larger changes, add a `schema_version` setting or dedicated migrations table, wrap multi-step changes in a transaction, and add upgrade tests from every supported prior schema.

## Backup and restore

The application has no built-in export/import UI. To back up manually:

1. close the application so WAL state is settled;
2. copy `ielts.db` from the user-data directory;
3. keep the backup private because it may contain essays, answers, flashcards, and chat history.

Restore only while the application is closed. Preserve the existing file until the restored database has opened successfully.

For an online backup implementation, use SQLite's backup API rather than copying an active database file alone.

## Reset and retention

The reset handler deletes rows from review, card, exam, answer, session, message, and chat tables. It leaves settings in place, so UI and flashcard language preferences survive a data reset.

There is no automatic retention policy. Data remains until the user deletes individual supported objects, invokes reset, removes the database, or uninstalls it with application data cleanup.

## Analytics derivation

Analytics is calculated on demand in the main process. Important details:

- selectable windows filter sessions by start timestamp;
- active-day streak uses all completed sessions;
- Listening/Reading accuracy comes from `answers`;
- current analytics bands are averages derived from session ratios, while per-exercise result bands use the section-specific 40-question conversion tables;
- Writing bands average stored AI band values;
- coverage is all-time, regardless of the selected analytics window;
- flashcard statistics are filtered to the currently selected native-language deck;
- speed trends require at least four sessions of the same question type.

These definitions are product rules. Change tests and documentation whenever the formulas change.
