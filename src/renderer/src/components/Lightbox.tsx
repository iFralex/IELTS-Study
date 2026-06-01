import { useEffect } from 'react'

interface Props {
  src: string
  onClose: () => void
}

export function Lightbox({ src, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-base/90 cursor-zoom-out"
      onClick={onClose}
    >
      <img src={src} alt="" className="w-full h-full object-contain p-6" />
    </div>
  )
}
