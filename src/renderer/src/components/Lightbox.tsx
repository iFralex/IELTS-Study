interface Props {
  src: string
  onClose: () => void
}

export function Lightbox({ src, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-base/90 cursor-zoom-out"
      onClick={onClose}
    >
      <img src={src} alt="" className="w-full h-full object-contain p-6" />
    </div>
  )
}
