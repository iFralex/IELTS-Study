import { NavLink } from 'react-router-dom'

const PRACTICE_ROUTES = [
  { to: '/listening', label: 'Listening', icon: '🎧' },
  { to: '/reading',   label: 'Reading',   icon: '📖' },
  { to: '/writing',   label: 'Writing',   icon: '✍️' },
]

const TOP_ROUTES = [
  { to: '/exam',      label: 'Exam Simulator', icon: '📝' },
  { to: '/analytics', label: 'Analytics',      icon: '📊' },
  { to: '/library',   label: 'Library',        icon: '🗂' },
  { to: '/flashcard', label: 'Flashcard',      icon: '🃏' },
  { to: '/chat',      label: 'AI Tutor',       icon: '💬' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-surface0 text-mauve border-l-2 border-mauve -ml-px'
      : 'text-subtext0 hover:text-text hover:bg-surface0/40'
  }`

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 pl-8 pr-4 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-surface0 text-mauve border-l-2 border-mauve -ml-px'
      : 'text-subtext0 hover:text-text hover:bg-surface0/40'
  }`

export function Sidebar() {
  return (
    <nav className="w-48 shrink-0 bg-crust h-screen flex flex-col border-r border-surface0 select-none">
      <div className="px-4 py-5 text-mauve font-bold tracking-widest text-sm">
        IELTS LIZ
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        <NavLink to="/" end className={linkClass}>
          <span>🏠</span><span>Dashboard</span>
        </NavLink>

        <div className="px-4 pt-3 pb-1 text-xs text-surface2 uppercase tracking-wider">
          Practice
        </div>
        {PRACTICE_ROUTES.map(r => (
          <NavLink key={r.to} to={r.to} className={subLinkClass}>
            <span>{r.icon}</span><span>{r.label}</span>
          </NavLink>
        ))}

        {TOP_ROUTES.map(r => (
          <NavLink key={r.to} to={r.to} className={linkClass}>
            <span>{r.icon}</span><span>{r.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-4 py-3 text-xs text-surface2 border-t border-surface0">
        v1.0 · IELTS Academic
      </div>
    </nav>
  )
}
