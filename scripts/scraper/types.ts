export interface ListeningExercise {
  id: string
  title: string
  source_url: string
  youtube_url: string
  question_type: 'gap_fill' | 'form_completion' | 'multiple_choice' | 'map_diagram' | 'table'
  difficulty: 'medium' | 'hard'
  questions: Question[]
}

export interface ReadingExercise {
  id: string
  title: string
  source_url: string
  passage: string
  question_type: string
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
  essay_type: string
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
}
