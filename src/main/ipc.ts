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
      'INSERT INTO sessions (exercise_id, section, question_type, started_at, completed_at, score, max_score, time_spent_seconds) VALUES (?,?,?,?,?,?,?,?)'
    ).run(s.exercise_id, s.section, s.question_type ?? null, s.started_at, s.completed_at ?? null, s.score ?? null, s.max_score ?? null, s.time_spent_seconds ?? null).lastInsertRowid
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
    db.prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?').all(limit > 0 ? limit : -1)
  )

  ipcMain.handle('get-session-answers', (_e, sessionId: number) =>
    db.prepare('SELECT question_index, user_answer FROM answers WHERE session_id = ? ORDER BY question_index')
      .all(sessionId) as { question_index: number; user_answer: string }[]
  )

  ipcMain.handle('get-completed-exercise-ids', (_e, section: string) =>
    (db.prepare(
      'SELECT DISTINCT exercise_id FROM sessions WHERE section = ? AND completed_at IS NOT NULL'
    ).all(section) as { exercise_id: string }[]).map(r => r.exercise_id)
  )

  // ── Writing ──────────────────────────────────────────────────────────────────
  ipcMain.handle('save-writing-submission', (_e, s: WritingInput) => {
    const completedAt = s.completed_at ?? s.submitted_at
    const timeSpent = Math.round((completedAt - s.submitted_at) / 1000)
    return db.prepare(
      `INSERT INTO sessions
       (exercise_id, section, question_type, started_at, completed_at, time_spent_seconds,
        band_score, text, word_count, self_score, notes, feedback_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      s.task_id, 'writing', s.task_type, s.submitted_at, completedAt, timeSpent,
      s.band_score ?? null, s.text, s.word_count ?? null,
      s.self_score ?? null, s.notes ?? null, s.feedback_json ?? null
    )
  })

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

    type SessionRow = SessionInput & { id: number; question_type: string | null; time_spent_seconds: number | null }
    const sessions = db.prepare(
      'SELECT * FROM sessions WHERE started_at >= ? AND completed_at IS NOT NULL'
    ).all(since) as SessionRow[]

    const answers = db.prepare(
      `SELECT a.is_correct, s.section, s.question_type
       FROM answers a JOIN sessions s ON a.session_id = s.id
       WHERE s.started_at >= ? AND s.completed_at IS NOT NULL`
    ).all(since) as { is_correct: number; section: string; question_type: string | null }[]

    // Weekly band chart
    const weekMap = new Map<string, { l: number[]; r: number[]; w: number[] }>()
    for (const s of sessions) {
      const week = new Date(s.started_at).toISOString().slice(0, 10)
      if (!weekMap.has(week)) weekMap.set(week, { l: [], r: [], w: [] })
      const pct = s.section === 'writing'
        ? (s.band_score ?? 0) / 9
        : s.max_score ? (s.score ?? 0) / s.max_score : 0
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

    // Accuracy + avg time per question type (reading/listening)
    const typeMap = new Map<string, { correct: number; total: number }>()
    for (const a of answers) {
      if (!a.question_type) continue
      const e = typeMap.get(a.question_type) ?? { correct: 0, total: 0 }
      e.total++
      if (a.is_correct) e.correct++
      typeMap.set(a.question_type, e)
    }
    const timeByType = new Map<string, number[]>()
    for (const s of sessions) {
      if (!s.question_type || !s.time_spent_seconds) continue
      const arr = timeByType.get(s.question_type) ?? []
      arr.push(s.section === 'writing'
        ? s.time_spent_seconds
        : s.max_score ? s.time_spent_seconds / s.max_score : 0)
      timeByType.set(s.question_type, arr)
    }
    // Writing: band_score as accuracy proxy, time per exercise
    const writingTypeMap = new Map<string, { bandSum: number; total: number }>()
    for (const s of sessions) {
      if (s.section !== 'writing' || !s.question_type) continue
      const e = writingTypeMap.get(s.question_type) ?? { bandSum: 0, total: 0 }
      e.total++
      e.bandSum += s.band_score ?? 0
      writingTypeMap.set(s.question_type, e)
    }
    const accuracy_by_type = [
      ...[...typeMap.entries()]
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([qt, { correct, total }]) => ({
          question_type: qt,
          accuracy: total ? correct / total : 0,
          attempts: total,
          avg_time_per_question: avg(timeByType.get(qt) ?? []),
        })),
      ...[...writingTypeMap.entries()]
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([qt, { bandSum, total }]) => ({
          question_type: qt,
          accuracy: total ? (bandSum / total) / 9 : 0,
          attempts: total,
          avg_time_per_question: avg(timeByType.get(qt) ?? []),
        })),
    ]

    // Per-section breakdown
    const sectionMap = new Map<string, { correct: number; total: number; sessions: number; time: number }>()
    for (const a of answers) {
      const sec = a.section.startsWith('listening') ? 'listening' : a.section.startsWith('reading') ? 'reading' : 'writing'
      const e = sectionMap.get(sec) ?? { correct: 0, total: 0, sessions: 0, time: 0 }
      e.total++
      if (a.is_correct) e.correct++
      sectionMap.set(sec, e)
    }
    for (const s of sessions) {
      const sec = s.section.startsWith('listening') ? 'listening' : s.section.startsWith('reading') ? 'reading' : 'writing'
      const e = sectionMap.get(sec) ?? { correct: 0, total: 0, sessions: 0, time: 0 }
      e.sessions++
      e.time += s.time_spent_seconds ?? 0
      sectionMap.set(sec, e)
    }
    const by_section = ['listening', 'reading', 'writing']
      .filter(sec => sectionMap.has(sec))
      .map(sec => {
        const e = sectionMap.get(sec)!
        return { section: sec, accuracy: e.total ? e.correct / e.total : 0, sessions: e.sessions, total_time_seconds: e.time }
      })

    // Days active + streak (all-time, not filtered)
    const allSessions = days === 0 ? sessions : db.prepare(
      'SELECT started_at FROM sessions WHERE completed_at IS NOT NULL'
    ).all() as { started_at: number }[]
    const daySet = new Set(allSessions.map(s => new Date(s.started_at).toISOString().slice(0, 10)))
    const days_active = daySet.size
    let current_streak = 0
    const d = new Date()
    while (true) {
      const key = d.toISOString().slice(0, 10)
      if (!daySet.has(key)) break
      current_streak++
      d.setDate(d.getDate() - 1)
    }

    // Accuracy trend by day (listening + reading only, writing has no score)
    const trendMap = new Map<string, { l: number[]; r: number[] }>()
    for (const s of sessions) {
      if (!s.max_score) continue
      const date = new Date(s.started_at).toISOString().slice(0, 10)
      if (!trendMap.has(date)) trendMap.set(date, { l: [], r: [] })
      const pct = Math.round(((s.score ?? 0) / s.max_score) * 100)
      if (s.section.startsWith('listening')) trendMap.get(date)!.l.push(pct)
      else if (s.section.startsWith('reading')) trendMap.get(date)!.r.push(pct)
    }
    const accuracy_trend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        listening: v.l.length ? Math.round(avg(v.l)) : null,
        reading:   v.r.length ? Math.round(avg(v.r)) : null,
      }))

    // Estimated current bands (from filtered sessions)
    const bandBySection = { l: [] as number[], r: [] as number[] }
    for (const s of sessions) {
      if (!s.max_score) continue
      const pct = (s.score ?? 0) / s.max_score
      if (s.section.startsWith('listening')) bandBySection.l.push(pct)
      else if (s.section.startsWith('reading')) bandBySection.r.push(pct)
    }
    const writingBandsRaw = db.prepare(
      `SELECT question_type as task_type, AVG(band_score) as avg_band, COUNT(*) as cnt
       FROM sessions WHERE section = 'writing' AND band_score IS NOT NULL AND started_at >= ?
       GROUP BY question_type`
    ).all(since) as { task_type: string; avg_band: number; cnt: number }[]
    const wBand = writingBandsRaw.reduce((acc, r) => acc + r.avg_band * r.cnt, 0) /
      (writingBandsRaw.reduce((acc, r) => acc + r.cnt, 0) || 1)
    const estL = bandBySection.l.length ? +(avg(bandBySection.l) * 9).toFixed(1) : 0
    const estR = bandBySection.r.length ? +(avg(bandBySection.r) * 9).toFixed(1) : 0
    const estW = writingBandsRaw.length ? +wBand.toFixed(1) : 0
    const overallParts = [estL, estR, estW].filter(x => x > 0)
    const estimated_bands = {
      listening: estL,
      reading: estR,
      writing: estW,
      overall: overallParts.length ? +(avg(overallParts)).toFixed(1) : 0,
    }

    // Flashcard stats
    const fcTotal = (db.prepare('SELECT COUNT(*) as c FROM flashcards').get() as { c: number }).c
    const fcMastered = (db.prepare('SELECT COUNT(*) as c FROM flashcards WHERE interval >= 21').get() as { c: number }).c
    const fcDue = (db.prepare('SELECT COUNT(*) as c FROM flashcards WHERE next_review <= ?').get(Date.now()) as { c: number }).c
    const fcReviews = db.prepare('SELECT COUNT(*) as total, SUM(is_correct) as correct FROM flashcard_reviews').get() as { total: number; correct: number }
    const flashcard_stats = {
      total: fcTotal,
      mastered: fcMastered,
      due_today: fcDue,
      retention_rate: fcReviews.total ? fcReviews.correct / fcReviews.total : 0,
    }

    // Writing bands by task type
    const wBandRows = db.prepare(
      `SELECT question_type as task_type, AVG(band_score) as avg_band, COUNT(*) as cnt
       FROM sessions WHERE section = 'writing' AND band_score IS NOT NULL AND started_at >= ?
       GROUP BY question_type`
    ).all(since) as { task_type: string; avg_band: number; cnt: number }[]
    const wMap = Object.fromEntries(wBandRows.map(r => [r.task_type, r]))
    const writing_bands = {
      task1_avg: wMap['task1']?.avg_band ?? 0,
      task1_count: wMap['task1']?.cnt ?? 0,
      task2_avg: wMap['task2']?.avg_band ?? 0,
      task2_count: wMap['task2']?.cnt ?? 0,
    }

    // Exercise coverage (all-time)
    const listeningTotal = readJson<{ id: string }>('listening/exercises.json').length
    const readingTotal   = readJson<{ id: string }>('reading/exercises.json').length
    const writingTotal   = readJson<{ id: string }>('writing/task1.json').length + readJson<{ id: string }>('writing/task2.json').length
    const allSessionsAll = db.prepare('SELECT exercise_id, section FROM sessions WHERE completed_at IS NOT NULL').all() as { exercise_id: string; section: string }[]
    const doneL = new Set(allSessionsAll.filter(s => s.section === 'listening').map(s => s.exercise_id)).size
    const doneR = new Set(allSessionsAll.filter(s => s.section === 'reading').map(s => s.exercise_id)).size
    const doneW = new Set(allSessionsAll.filter(s => s.section === 'writing').map(s => s.exercise_id)).size
    const exercise_coverage = [
      { section: 'listening', done: doneL, total: listeningTotal },
      { section: 'reading',   done: doneR, total: readingTotal   },
      { section: 'writing',   done: doneW, total: writingTotal   },
    ]

    // Speed trend: compare first-half vs second-half sessions per type
    const speedMap = new Map<string, { time: number; date: number }[]>()
    for (const s of sessions) {
      if (!s.question_type || !s.time_spent_seconds) continue
      const time = s.section === 'writing'
        ? s.time_spent_seconds
        : s.max_score ? s.time_spent_seconds / s.max_score : 0
      if (!time) continue
      const arr = speedMap.get(s.question_type) ?? []
      arr.push({ time, date: s.started_at })
      speedMap.set(s.question_type, arr)
    }
    const speed_trend = [...speedMap.entries()]
      .filter(([, arr]) => arr.length >= 4)
      .map(([qt, arr]) => {
        arr.sort((a, b) => a.date - b.date)
        const half = Math.floor(arr.length / 2)
        return {
          question_type: qt,
          older_avg: avg(arr.slice(0, half).map(x => x.time)),
          recent_avg: avg(arr.slice(half).map(x => x.time)),
        }
      })

    const total_time_seconds = sessions.reduce((s, r) => s + (r.time_spent_seconds ?? 0), 0)
    const correct = answers.filter(a => a.is_correct).length
    const exam_count = (db.prepare('SELECT COUNT(*) as c FROM exam_runs').get() as { c: number }).c

    return {
      sessions_by_week,
      accuracy_by_type,
      by_section,
      accuracy_trend,
      estimated_bands,
      flashcard_stats,
      writing_bands,
      exercise_coverage,
      speed_trend,
      total_sessions: sessions.length,
      total_time_seconds,
      average_accuracy: answers.length ? correct / answers.length : 0,
      exam_count,
      days_active,
      current_streak,
    }
  })

  // ── Flashcards ───────────────────────────────────────────────────────────────
  ipcMain.handle('get-flashcards', () =>
    db.prepare('SELECT * FROM flashcards ORDER BY created_at DESC').all()
  )

  ipcMain.handle('get-due-flashcards', () =>
    db.prepare('SELECT * FROM flashcards WHERE next_review <= ? ORDER BY next_review ASC, RANDOM()').all(Date.now())
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
      prompt: `Generate a flashcard for the English word or phrase: "${word}"\n\nFor single words: fill synonyms_en/synonyms_it with synonyms.\nFor multi-word phrases: fill synonyms_en/synonyms_it with equivalent expressions or paraphrases.\nKeep each example sentence SHORT (max 12 words).\n\nReturn ONLY valid JSON, no markdown, no explanation:\n{"english":"${word}","italian":"traduzione principale","synonyms_en":"syn1, syn2","synonyms_it":"sin1, sin2","examples_en":"Short sentence 1.\\n\\nShort sentence 2.\\n\\nShort sentence 3.","examples_it":"Frase breve 1.\\n\\nFrase breve 2.\\n\\nFrase breve 3."}`,
    })
    return parseAiJson(text)
  })

  ipcMain.handle('evaluate-answer', async (_e, word: string, correct: string, userAnswer: string, direction: string) => {
    const { text } = await generateText({
      model: getModel(),
      prompt: `Evaluate this translation answer:\nWord: ${word}\nDirection: ${direction}\nUser answer: "${userAnswer}"\nCorrect: "${correct}"\n\nAccept variants and synonyms. Return ONLY valid JSON:\n{"is_correct":true,"quality":5,"explanation":"brief","alternatives":["alt1"]}`,
    })
    try {
      return parseAiJson(text)
    } catch {
      return { rawOutput: text }
    }
  })

  ipcMain.handle('evaluate-audio-answer', async (_e, word: string, userEnglish: string, userItalian: string) => {
    const { text } = await generateText({
      model: getModel(),
      prompt: `Evaluate these two answers for the word "${word}":\nSpelling: "${userEnglish}" (correct: "${word}")\nTranslation: "${userItalian}"\n\nAccept minor spelling variants for the translation. Return ONLY valid JSON:\n{"english_correct":true,"italian_correct":true,"quality":5,"english_explanation":"brief","italian_explanation":"brief"}`,
    })
    try {
      return parseAiJson(text)
    } catch {
      return { rawOutput: text }
    }
  })

  ipcMain.handle('delete-flashcard', (_e, id: number) =>
    db.prepare('DELETE FROM flashcards WHERE id = ?').run(id)
  )

  ipcMain.handle('evaluate-writing', async (_e, taskType: string, userText: string, prompt: string, wordCount: number) => {
    const taskLabel = taskType === 'task1' ? 'Task 1 (graph/chart/map description)' : 'Task 2 (essay)'
    const { text } = await generateText({
      model: getModel(),
      prompt: `You are an IELTS examiner. Evaluate this IELTS Writing ${taskLabel} response.\n\nPrompt: ${prompt}\n\nWord count: ${wordCount}\n\nResponse:\n${userText}\n\nReturn ONLY valid JSON, no markdown:\n{"band":6.5,"overall":"2-3 sentence summary","strengths":["point 1","point 2"],"improvements":["point 1","point 2"],"vocab_suggestions":["word 1","word 2","word 3"],"word_annotations":[{"word":"exact word as written in text","type":"grammar","correction":"corrected word","explanation":"brief reason under 12 words"},{"word":"another word","type":"context","correction":"better word","explanation":"brief reason under 12 words"}],"sentence_rewrites":[{"original":"exact sentence as written","rewritten":"improved version","explanation":"brief structural reason under 15 words"}]}\n\nRules:\n- word_annotations: annotate individual words only (not phrases). type "grammar" = grammatical error; type "context" = grammatically correct but not the best word choice for academic IELTS writing. Only annotate words that actually appear verbatim in the response.\n- sentence_rewrites: only sentences with structural, syntactic or coherence issues. Max 5. Include only sentences actually present in the response.`,
    })
    return parseAiJson(text)
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
    })
    return text
  })

  ipcMain.handle('reset-all-data', () => {
    const tables = ['flashcard_reviews', 'flashcards', 'exam_runs', 'answers', 'sessions', 'chat_messages', 'chats']
    for (const t of tables) db.prepare(`DELETE FROM ${t}`).run()
  })

  // ── Settings ─────────────────────────────────────────────────────────────────
  ipcMain.handle('get-setting', (_e, key: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  })

  ipcMain.handle('set-setting', (_e, key: string, value: string) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  })
}

function parseAiJson<T>(text: string): T {
  const stripped = text.replace(/```json|```/g, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in AI response')
  let inStr = false, esc = false, fixed = ''
  for (const ch of match[0]) {
    if (esc) { fixed += ch; esc = false }
    else if (ch === '\\' && inStr) { fixed += ch; esc = true }
    else if (ch === '"') { fixed += ch; inStr = !inStr }
    else if (inStr && (ch === '\n' || ch === '\r')) { fixed += '\\n' }
    else fixed += ch
  }
  return JSON.parse(fixed)
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}
