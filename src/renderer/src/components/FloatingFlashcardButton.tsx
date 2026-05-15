export function FloatingFlashcardButton() {
  return (
    <button
      className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-mauve text-base flex items-center justify-center text-xl shadow-lg hover:scale-110 transition-transform z-50"
      title="Add word to flashcards (⌘K)"
      onClick={() => {/* Plan 5 */}}
    >
      🃏
    </button>
  )
}
