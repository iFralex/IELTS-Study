interface Props { onClick: () => void }

export function FloatingFlashcardButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-mauve text-base
        flex items-center justify-center text-xl shadow-lg hover:scale-110 transition-transform z-50"
      title="Aggiungi parola alle flashcard"
    >
      🃏
    </button>
  )
}
