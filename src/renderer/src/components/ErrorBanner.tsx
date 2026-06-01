interface ErrorBannerProps {
  message: string
  className?: string
}

export function ErrorBanner({ message, className = '' }: ErrorBannerProps) {
  return (
    <div className={`p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-sm ${className}`}>
      ⚠ {message}
    </div>
  )
}
