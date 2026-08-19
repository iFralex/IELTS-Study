export type ReviewMode = 'text-en-native' | 'text-native-en' | 'audio'

export function pickMode(): ReviewMode {
  const r = Math.random()
  if (r < 0.33) return 'text-en-native'
  if (r < 0.66) return 'text-native-en'
  return 'audio'
}

export function computeQualityFromDual(englishCorrect: boolean, translationCorrect: boolean): number {
  if (englishCorrect && translationCorrect) return 5
  if (englishCorrect || translationCorrect) return 3
  return 1
}
