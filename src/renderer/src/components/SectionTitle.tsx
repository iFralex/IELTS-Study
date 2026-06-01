import type { ReactNode } from 'react'

export function SectionTitle({ children, className = 'mb-3' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-xs font-semibold text-subtext0 uppercase tracking-wide ${className}`}>
      {children}
    </h2>
  )
}
