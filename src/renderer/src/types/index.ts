export interface ListeningExercise {
  id: string
  title: string
  source_url: string
  audio_url: string
  image_url?: string
  question_type: 'gap_fill' | 'form_completion' | 'multiple_choice' | 'map_diagram' | 'table'
  difficulty: 'medium' | 'hard'
  questions: Question[]
  transcript?: string
}

export interface ReadingExercise {
  id: string
  title: string
  source_url: string
  passage: string
  question_type: 'matching_headings' | 'true_false_ng' | 'yes_no_ng' | 'multiple_choice' | 'sentence_completion' | 'summary_completion' | 'short_answer' | 'matching_paragraph_info'
  difficulty: 'medium' | 'hard'
  questions: Question[]
}

export interface WritingTask1 {
  id: string
  chart_type: 'bar' | 'line' | 'pie' | 'table' | 'map' | 'process'
  prompt: string
  image_url: string
  model_answer: string
  band_target: number
  key_vocab: string[]
}

export interface WritingTask2 {
  id: string
  topic: string
  essay_type: 'opinion' | 'discussion' | 'problem_solution' | 'direct_question' | 'advantages_disadvantages'
  question: string
  model_answer: string
  band_target: number
  key_phrases: string[]
}

export interface Question {
  index: number
  text: string
  answer: string
  options?: string[]
  paragraph?: string
  explanation?: string
}

export interface SessionInput {
  exercise_id: string
  section: string
  question_type?: string
  started_at: number
  completed_at?: number
  score?: number
  max_score?: number
  time_spent_seconds?: number
}

export interface Session extends SessionInput {
  id: number
  text?: string | null
  band_score?: number | null
  word_count?: number | null
}

export interface AnswerInput {
  session_id: number
  question_index: number
  user_answer: string
  correct_answer: string
  is_correct: boolean
}

export interface WritingInput {
  task_id: string
  task_type: 'task1' | 'task2'
  submitted_at: number
  completed_at?: number
  text: string
  word_count: number
  band_score?: number
  self_score?: number
  notes?: string
}

export interface ExamRunInput {
  started_at: number
  completed_at?: number
  listening_score?: number
  reading_score?: number
  writing_score?: number
  notes?: string
}

export interface ExamRun extends ExamRunInput {
  id: number
}

export interface Flashcard {
  id: number
  english: string
  italian: string
  synonyms_en: string | null
  synonyms_it: string | null
  examples_en: string
  examples_it: string
  interval: number
  ease_factor: number
  repetitions: number
  next_review: number
  created_at: number
  source: string
}

export interface FlashcardInput {
  english: string
  italian: string
  synonyms_en?: string | null
  synonyms_it?: string | null
  examples_en: string
  examples_it: string
  source?: string
}

export interface ReviewInput {
  flashcard_id: number
  reviewed_at: number
  direction: 'en-it' | 'it-en' | 'audio'
  user_answer: string
  quality: number
  is_correct: boolean
}

export interface AIFlashcardData {
  english: string
  italian: string
  synonyms_en: string
  synonyms_it: string
  examples_en: string
  examples_it: string
}

export interface AIEvalResult {
  is_correct: boolean
  quality: number
  explanation: string
  alternatives: string[]
  rawOutput?: string
}

export interface AIAudioEvalResult {
  english_correct: boolean
  italian_correct: boolean
  quality: number
  english_explanation: string
  italian_explanation: string
}

export interface WordAnnotation {
  word: string
  type: 'grammar' | 'context'
  correction: string
  explanation: string
}

export interface SentenceRewrite {
  original: string
  rewritten: string
  explanation: string
}

export interface AIWritingFeedback {
  band: number
  overall: string
  strengths: string[]
  improvements: string[]
  vocab_suggestions: string[]
  word_annotations?: WordAnnotation[]
  sentence_rewrites?: SentenceRewrite[]
}

export interface AnalyticsData {
  sessions_by_week: { week: string; listening: number; reading: number; writing: number }[]
  accuracy_by_type: { question_type: string; accuracy: number; attempts: number; avg_time_per_question: number }[]
  by_section: { section: string; accuracy: number; sessions: number; total_time_seconds: number }[]
  accuracy_trend: { date: string; listening: number | null; reading: number | null }[]
  estimated_bands: { listening: number; reading: number; writing: number; overall: number }
  flashcard_stats: { total: number; mastered: number; due_today: number; retention_rate: number }
  writing_bands: { task1_avg: number; task1_count: number; task2_avg: number; task2_count: number }
  exercise_coverage: { section: string; done: number; total: number }[]
  speed_trend: { question_type: string; older_avg: number; recent_avg: number }[]
  total_sessions: number
  total_time_seconds: number
  average_accuracy: number
  exam_count: number
  days_active: number
  current_streak: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StoredChat {
  id: number
  name: string
  created_at: number
  updated_at: number
}

export interface StoredChatMessage {
  id: number
  chat_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: number
}

export interface IElectronAPI {
  getExercises: (section: string) => Promise<ListeningExercise[] | ReadingExercise[] | WritingTask1[] | WritingTask2[]>
  getExercise: (id: string) => Promise<ListeningExercise | ReadingExercise | WritingTask1 | WritingTask2 | null>
  saveSession: (session: SessionInput) => Promise<number>
  saveAnswers: (answers: AnswerInput[]) => Promise<void>
  getAnalytics: (days: number) => Promise<AnalyticsData>
  getRecentSessions: (limit: number) => Promise<Session[]>
  getSessionAnswers: (sessionId: number) => Promise<{ question_index: number; user_answer: string }[]>
  getCompletedExerciseIds: (section: string) => Promise<string[]>
  saveWritingSubmission: (sub: WritingInput) => Promise<void>
  saveExamRun: (run: ExamRunInput) => Promise<void>
  getExamRuns: () => Promise<ExamRun[]>
  getFlashcards: () => Promise<Flashcard[]>
  getDueFlashcards: () => Promise<Flashcard[]>
  saveFlashcard: (card: FlashcardInput) => Promise<number>
  updateFlashcardSM2: (id: number, quality: number) => Promise<void>
  saveFlashcardReview: (review: ReviewInput) => Promise<void>
  generateFlashcard: (word: string) => Promise<AIFlashcardData>
  evaluateAnswer: (word: string, correct: string, userAnswer: string, direction: string) => Promise<AIEvalResult>
  evaluateAudioAnswer: (word: string, userEnglish: string, userItalian: string) => Promise<AIAudioEvalResult>
  deleteFlashcard: (id: number) => Promise<void>
  evaluateWriting: (taskType: 'task1' | 'task2', userText: string, prompt: string, wordCount: number) => Promise<AIWritingFeedback>
  resetAllData: () => Promise<void>
  chatMessage: (messages: ChatMessage[]) => Promise<string>
  getChats: () => Promise<StoredChat[]>
  createChat: (name: string) => Promise<number>
  renameChat: (id: number, name: string) => Promise<void>
  deleteChat: (id: number) => Promise<void>
  getChatMessages: (chatId: number) => Promise<StoredChatMessage[]>
  appendChatMessage: (chatId: number, role: string, content: string) => Promise<number>
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>
}

declare global {
  interface Window { api: IElectronAPI }
}
