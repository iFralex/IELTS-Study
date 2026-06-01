import { useState } from 'react'
import { Lightbox } from './Lightbox'

interface ExerciseImageProps {
  src: string
  alt?: string
  className?: string
}

export function ExerciseImage({ src, alt = '', className }: ExerciseImageProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className={className ?? 'w-full rounded-lg border border-surface1 object-contain cursor-zoom-in'}
      />
      {open && <Lightbox src={src} onClose={() => setOpen(false)} />}
    </>
  )
}
