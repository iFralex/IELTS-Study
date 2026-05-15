import { contextBridge, ipcRenderer } from 'electron'
import type {
  SessionInput, AnswerInput, WritingInput, ExamRunInput,
  FlashcardInput, ReviewInput
} from '../renderer/src/types'

contextBridge.exposeInMainWorld('api', {
  getExercises:          (section: string)   => ipcRenderer.invoke('get-exercises', section),
  getExercise:           (id: string)        => ipcRenderer.invoke('get-exercise', id),
  saveSession:           (s: SessionInput)   => ipcRenderer.invoke('save-session', s),
  saveAnswers:           (a: AnswerInput[])  => ipcRenderer.invoke('save-answers', a),
  getAnalytics:          (days: number)      => ipcRenderer.invoke('get-analytics', days),
  getRecentSessions:     (limit: number)     => ipcRenderer.invoke('get-recent-sessions', limit),
  getCompletedExerciseIds: (section: string) => ipcRenderer.invoke('get-completed-exercise-ids', section),
  saveWritingSubmission: (s: WritingInput)   => ipcRenderer.invoke('save-writing-submission', s),
  saveExamRun:           (r: ExamRunInput)   => ipcRenderer.invoke('save-exam-run', r),
  getExamRuns:           ()                  => ipcRenderer.invoke('get-exam-runs'),
  getFlashcards:         ()                  => ipcRenderer.invoke('get-flashcards'),
  getDueFlashcards:      ()                  => ipcRenderer.invoke('get-due-flashcards'),
  saveFlashcard:         (c: FlashcardInput) => ipcRenderer.invoke('save-flashcard', c),
  updateFlashcardSM2:    (id: number, q: number) => ipcRenderer.invoke('update-flashcard-sm2', id, q),
  saveFlashcardReview:   (r: ReviewInput)    => ipcRenderer.invoke('save-flashcard-review', r),
  generateFlashcard:     (word: string)      => ipcRenderer.invoke('generate-flashcard', word),
  evaluateAnswer:        (word: string, correct: string, userAnswer: string, direction: string) =>
                           ipcRenderer.invoke('evaluate-answer', word, correct, userAnswer, direction),
  evaluateWriting: (taskType: string, userText: string, prompt: string, wordCount: number) =>
    ipcRenderer.invoke('evaluate-writing', taskType, userText, prompt, wordCount),
})
