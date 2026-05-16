import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import { getDb } from './db'
import { getModel, generateText } from './keyStore'
import type {
  SessionInput, AnswerInput, WritingInput,
  ExamRunInput, FlashcardInput, ReviewInput
} from '../renderer/src/types'

const dataDir = app.isPackaged
  ? path.join(process.resourcesPath, 'data')
  : path.join(app.getAppPath(), 'data')

function readJson<T>(relPath: string): T[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, relPath), 'utf-8'))
  } catch {
    return []
  }
}


export function registerIpcHandlers(): void {
  const db = getDb(app.getPath('userData'))

  // ── Exercises ───────────────────────────────────────────────────────────────
  ipcMain.handle('get-exercises', (_e, section: string) => {
    const map: Record<string, string> = {
      listening: 'listening/exercises.json',
      reading:   'reading/exercises.json',
      'writing/task1': 'writing/task1.json',
      'writing/task2': 'writing/task2.json',
    }
    return readJson(map[section] ?? `${section}/exercises.json`)
  })

  ipcMain.handle('get-exercise', (_e, id: string) => {
    for (const p of ['listening/exercises.json', 'reading/exercises.json', 'writing/task1.json', 'writing/task2.json']) {
      const found = (readJson<{ id: string }>(p)).find(e => e.id === id)
      if (found) return found
    }
    return null
  })

  // ── Sessions ─────────────────────────────────────────────────────────────────
  ipcMain.handle('save-session', (_e, s: SessionInput) =>
    db.prepare(
      'INSERT INTO sessions (exercise_id, section, started_at, completed_at, score, max_score, time_spent_seconds) VALUES (?,?,?,?,?,?,?)'
    ).run(s.exercise_id, s.section, s.started_at, s.completed_at ?? null, s.score ?? null, s.max_score ?? null, s.time_spent_seconds ?? null).lastInsertRowid
  )

  ipcMain.handle('save-answers', (_e, rows: AnswerInput[]) => {
    const stmt = db.prepare(
      'INSERT INTO answers (session_id, question_index, user_answer, correct_answer, is_correct) VALUES (?,?,?,?,?)'
    )
    db.transaction((rows: AnswerInput[]) => {
      for (const r of rows) stmt.run(r.session_id, r.question_index, r.user_answer, r.correct_answer, r.is_correct ? 1 : 0)
    })(rows)
  })

  ipcMain.handle('get-recent-sessions', (_e, limit: number) =>
    db.prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?').all(limit)
  )

  ipcMain.handle('get-completed-exercise-ids', (_e, section: string) =>
    (db.prepare(
      'SELECT DISTINCT exercise_id FROM sessions WHERE section = ? AND completed_at IS NOT NULL'
    ).all(section) as { exercise_id: string }[]).map(r => r.exercise_id)
  )

  // ── Writing ──────────────────────────────────────────────────────────────────
  ipcMain.handle('save-writing-submission', (_e, s: WritingInput) =>
    db.prepare(
      'INSERT INTO writing_submissions (task_id, task_type, submitted_at, text, word_count, self_score, notes) VALUES (?,?,?,?,?,?,?)'
    ).run(s.task_id, s.task_type, s.submitted_at, s.text, s.word_count, s.self_score ?? null, s.notes ?? null)
  )

  // ── Exam ─────────────────────────────────────────────────────────────────────
  ipcMain.handle('save-exam-run', (_e, r: ExamRunInput) =>
    db.prepare(
      'INSERT INTO exam_runs (started_at, completed_at, listening_score, reading_score, writing_score, notes) VALUES (?,?,?,?,?,?)'
    ).run(r.started_at, r.completed_at ?? null, r.listening_score ?? null, r.reading_score ?? null, r.writing_score ?? null, r.notes ?? null)
  )

  ipcMain.handle('get-exam-runs', () =>
    db.prepare('SELECT * FROM exam_runs ORDER BY started_at DESC').all()
  )

  // ── Analytics ────────────────────────────────────────────────────────────────
  ipcMain.handle('get-analytics', (_e, days: number) => {
    const since = days === 0 ? 0 : Date.now() - days * 86_400_000
    const sessions = db.prepare(
      'SELECT * FROM sessions WHERE started_at >= ? AND completed_at IS NOT NULL'
    ).all(since) as (SessionInput & { id: number })[]

    const answers = db.prepare(
      `SELECT a.is_correct, s.section, s.started_at
       FROM answers a JOIN sessions s ON a.session_id = s.id
       WHERE s.started_at >= ? AND s.completed_at IS NOT NULL`
    ).all(since) as { is_correct: number; section: string; started_at: number }[]

    const weekMap = new Map<string, { l: number[]; r: number[]; w: number[] }>()
    for (const s of sessions) {
      const week = new Date(s.started_at).toISOString().slice(0, 10)
      if (!weekMap.has(week)) weekMap.set(week, { l: [], r: [], w: [] })
      const pct = s.max_score ? (s.score ?? 0) / s.max_score : 0
      const key = s.section.startsWith('listening') ? 'l' : s.section.startsWith('reading') ? 'r' : 'w'
      weekMap.get(week)![key].push(pct)
    }

    const sessions_by_week = [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({
        week,
        listening: v.l.length ? +(avg(v.l) * 9).toFixed(1) : 0,
        reading:   v.r.length ? +(avg(v.r) * 9).toFixed(1) : 0,
        writing:   v.w.length ? +(avg(v.w) * 9).toFixed(1) : 0,
      }))

    const total_time_seconds = sessions.reduce((s, r) => s + ((r as unknown as { time_spent_seconds?: number }).time_spent_seconds ?? 0), 0)
    const correct = answers.filter(a => a.is_correct).length
    const exam_count = (db.prepare('SELECT COUNT(*) as c FROM exam_runs').get() as { c: number }).c

    return {
      sessions_by_week,
      accuracy_by_type: [],
      total_sessions: sessions.length,
      total_time_seconds,
      average_accuracy: answers.length ? correct / answers.length : 0,
      exam_count,
    }
  })

  // ── Flashcards ───────────────────────────────────────────────────────────────
  ipcMain.handle('get-flashcards', () =>
    db.prepare('SELECT * FROM flashcards ORDER BY created_at DESC').all()
  )

  ipcMain.handle('get-due-flashcards', () =>
    db.prepare('SELECT * FROM flashcards WHERE next_review <= ? ORDER BY next_review ASC').all(Date.now())
  )

  ipcMain.handle('save-flashcard', (_e, c: FlashcardInput) =>
    db.prepare(
      'INSERT INTO flashcards (english, italian, synonyms_en, synonyms_it, examples_en, examples_it, next_review, created_at, source) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(c.english, c.italian, c.synonyms_en ?? null, c.synonyms_it ?? null, c.examples_en, c.examples_it, Date.now(), Date.now(), c.source ?? 'manual').lastInsertRowid
  )

  ipcMain.handle('update-flashcard-sm2', (_e, id: number, quality: number) => {
    const card = db.prepare('SELECT interval, ease_factor, repetitions FROM flashcards WHERE id = ?').get(id) as
      { interval: number; ease_factor: number; repetitions: number } | undefined
    if (!card) return

    let { interval, ease_factor, repetitions } = card
    if (quality < 3) {
      repetitions = 0
      interval = 1
    } else {
      if (repetitions === 0)      interval = 1
      else if (repetitions === 1) interval = 3
      else                        interval = Math.round(interval * ease_factor)
      repetitions++
    }
    ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    const next_review = Date.now() + interval * 86_400_000

    db.prepare(
      'UPDATE flashcards SET interval=?, ease_factor=?, repetitions=?, next_review=? WHERE id=?'
    ).run(interval, ease_factor, repetitions, next_review, id)
  })

  ipcMain.handle('save-flashcard-review', (_e, r: ReviewInput) =>
    db.prepare(
      'INSERT INTO flashcard_reviews (flashcard_id, reviewed_at, direction, user_answer, quality, is_correct) VALUES (?,?,?,?,?,?)'
    ).run(r.flashcard_id, r.reviewed_at, r.direction, r.user_answer, r.quality, r.is_correct ? 1 : 0)
  )

  // ── AI (Flashcard) ───────────────────────────────────────────────────────────
  ipcMain.handle('generate-flashcard', async (_e, word: string) => {
    const { text } = await generateText({
      model: getModel(),
      maxOutputTokens: 1200,
      prompt: `Generate a flashcard for the English word: "${word}"\n\nReturn ONLY valid JSON, no markdown:\n{"english":"word","italian":"main translation","synonyms_en":"syn1, syn2, syn3","synonyms_it":"sin1, sin2, sin3","examples_en":"Ex 1\\n\\nEx 2\\n\\nEx 3","examples_it":"Es 1\\n\\nEs 2\\n\\nEs 3"}`,
    })
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  })

  ipcMain.handle('evaluate-answer', async (_e, word: string, correct: string, userAnswer: string, direction: string) => {
    const { text } = await generateText({
      model: getModel(),
      maxOutputTokens: 500,
      prompt: `Evaluate this translation answer:\nWord: ${word}\nDirection: ${direction}\nUser answer: "${userAnswer}"\nCorrect: "${correct}"\n\nAccept variants and synonyms. Return ONLY valid JSON:\n{"is_correct":true,"quality":5,"explanation":"brief","alternatives":["alt1"]}`,
    })
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  })

  ipcMain.handle('evaluate-audio-answer', async (_e, word: string, userEnglish: string, userItalian: string) => {
    const { text } = await generateText({
      model: getModel(),
      maxOutputTokens: 600,
      prompt: `Evaluate these two answers for the word "${word}":\nSpelling: "${userEnglish}" (correct: "${word}")\nTranslation: "${userItalian}"\n\nAccept minor spelling variants for the translation. Return ONLY valid JSON:\n{"english_correct":true,"italian_correct":true,"quality":5,"english_explanation":"brief","italian_explanation":"brief"}`,
    })
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  })

  ipcMain.handle('delete-flashcard', (_e, id: number) =>
    db.prepare('DELETE FROM flashcards WHERE id = ?').run(id)
  )

  ipcMain.handle('evaluate-writing', async (_e, taskType: string, userText: string, prompt: string, wordCount: number) => {
    const taskLabel = taskType === 'task1' ? 'Task 1 (graph/chart/map description)' : 'Task 2 (essay)'
    const { text } = await generateText({
      model: getModel(),
      maxOutputTokens: 1000,
      prompt: `You are an IELTS examiner. Evaluate this IELTS Writing ${taskLabel} response.\n\nPrompt: ${prompt}\n\nWord count: ${wordCount}\n\nResponse:\n${userText}\n\nReturn ONLY valid JSON, no markdown:\n{"band":6.5,"overall":"2-3 sentence summary","strengths":["point 1","point 2"],"improvements":["point 1","point 2"],"vocab_suggestions":["word 1","word 2","word 3"]}`,
    })
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  })

  // ── Chat ─────────────────────────────────────────────────────────────────────
  ipcMain.handle('get-chats', () =>
    db.prepare('SELECT * FROM chats ORDER BY updated_at DESC').all()
  )

  ipcMain.handle('create-chat', (_e, name: string) => {
    const now = Date.now()
    return db.prepare('INSERT INTO chats (name, created_at, updated_at) VALUES (?,?,?)').run(name, now, now).lastInsertRowid
  })

  ipcMain.handle('rename-chat', (_e, id: number, name: string) =>
    db.prepare('UPDATE chats SET name=?, updated_at=? WHERE id=?').run(name, Date.now(), id)
  )

  ipcMain.handle('delete-chat', (_e, id: number) =>
    db.prepare('DELETE FROM chats WHERE id=?').run(id)
  )

  ipcMain.handle('get-chat-messages', (_e, chatId: number) =>
    db.prepare('SELECT * FROM chat_messages WHERE chat_id=? ORDER BY created_at ASC').all(chatId)
  )

  ipcMain.handle('append-chat-message', (_e, chatId: number, role: string, content: string) => {
    const now = Date.now()
    const id = db.prepare('INSERT INTO chat_messages (chat_id, role, content, created_at) VALUES (?,?,?,?)').run(chatId, role, content, now).lastInsertRowid
    db.prepare('UPDATE chats SET updated_at=? WHERE id=?').run(now, chatId)
    return id
  })

  ipcMain.handle('chat-message', async (_e, messages: { role: 'user' | 'assistant'; content: string }[]) => {
    const { text } = await generateText({
      model: getModel(),
      system: `You are an expert IELTS tutor and English language teacher. Help students with English grammar, vocabulary, pronunciation, IELTS strategies, writing, reading, and listening skills. Be concise and clear. When the student writes in Italian, respond in Italian.`,
      messages,
      maxOutputTokens: 1500,
    })
    return text
  })

  ipcMain.handle('reset-all-data', () => {
    const tables = ['flashcard_reviews', 'flashcards', 'writing_submissions', 'exam_runs', 'answers', 'sessions']
    for (const t of tables) db.prepare(`DELETE FROM ${t}`).run()
  })
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}
