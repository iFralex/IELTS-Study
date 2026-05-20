import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage, type Language } from '../i18n'

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
  const { t, i18n } = useTranslation()

  return (
    <nav className="w-48 shrink-0 bg-crust h-screen flex flex-col border-r border-surface0 select-none">
      <div className="px-4 py-5 text-mauve font-bold tracking-widest text-sm">
        {t('sidebar.title')}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        <NavLink to="/" end className={linkClass}>
          <span>🏠</span><span>{t('sidebar.dashboard')}</span>
        </NavLink>

        <div className="px-4 pt-3 pb-1 text-xs text-surface2 uppercase tracking-wider">
          {t('sidebar.practice')}
        </div>
        <NavLink to="/listening" className={subLinkClass}>
          <span>🎧</span><span>{t('sidebar.listening')}</span>
        </NavLink>
        <NavLink to="/reading" className={subLinkClass}>
          <span>📖</span><span>{t('sidebar.reading')}</span>
        </NavLink>
        <NavLink to="/writing" className={subLinkClass}>
          <span>✍️</span><span>{t('sidebar.writing')}</span>
        </NavLink>

        <NavLink to="/exam" className={linkClass}>
          <span>📝</span><span>{t('sidebar.examSimulator')}</span>
        </NavLink>
        <NavLink to="/analytics" className={linkClass}>
          <span>📊</span><span>{t('sidebar.analytics')}</span>
        </NavLink>
        <NavLink to="/flashcard" className={linkClass}>
          <span>🃏</span><span>{t('sidebar.flashcard')}</span>
        </NavLink>
        <NavLink to="/chat" className={linkClass}>
          <span>💬</span><span>{t('sidebar.aiTutor')}</span>
        </NavLink>
      </div>

      {/* Language switcher */}
      <div className="px-3 py-2 border-t border-surface0">
        <p className="text-xs text-surface2 mb-1.5">{t('sidebar.language')}</p>
        <div className="flex gap-1">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code as Language)}
              title={lang.label}
              className={`flex-1 text-xs py-0.5 rounded transition-colors ${
                i18n.language === lang.code
                  ? 'bg-mauve text-base font-semibold'
                  : 'text-subtext0 hover:text-text hover:bg-surface0'
              }`}
            >
              {lang.flag}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 text-xs text-surface2 border-t border-surface0">
        {t('sidebar.version')}
      </div>
    </nav>
  )
}
