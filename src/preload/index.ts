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
  evaluateAudioAnswer: (word: string, userEnglish: string, userItalian: string) =>
    ipcRenderer.invoke('evaluate-audio-answer', word, userEnglish, userItalian),
  deleteFlashcard: (id: number) =>
    ipcRenderer.invoke('delete-flashcard', id),
  evaluateWriting: (taskType: string, userText: string, prompt: string, wordCount: number) =>
    ipcRenderer.invoke('evaluate-writing', taskType, userText, prompt, wordCount),
  resetAllData:       () => ipcRenderer.invoke('reset-all-data'),
  getSetting:         (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting:         (key: string, value: string) => ipcRenderer.invoke('set-setting', key, value),
  chatMessage:        (messages: { role: string; content: string }[]) => ipcRenderer.invoke('chat-message', messages),
  getChats:           () => ipcRenderer.invoke('get-chats'),
  createChat:         (name: string) => ipcRenderer.invoke('create-chat', name),
  renameChat:         (id: number, name: string) => ipcRenderer.invoke('rename-chat', id, name),
  deleteChat:         (id: number) => ipcRenderer.invoke('delete-chat', id),
  getChatMessages:    (chatId: number) => ipcRenderer.invoke('get-chat-messages', chatId),
  appendChatMessage:  (chatId: number, role: string, content: string) => ipcRenderer.invoke('append-chat-message', chatId, role, content),
})
