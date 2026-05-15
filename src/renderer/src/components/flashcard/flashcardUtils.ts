export type ReviewMode = 'text-en-it' | 'text-it-en' | 'audio'

export function pickMode(): ReviewMode {
  const r = Math.random()
  if (r < 0.33) return 'text-en-it'
  if (r < 0.66) return 'text-it-en'
  return 'audio'
}

export function computeQualityFromDual(englishCorrect: boolean, italianCorrect: boolean): number {
  if (englishCorrect && italianCorrect) return 5
  if (englishCorrect || italianCorrect) return 3
  return 1
}
