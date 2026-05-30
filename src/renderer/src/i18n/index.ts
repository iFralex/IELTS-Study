import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import it from './locales/it'
import en from './locales/en'
import fr from './locales/fr'
import es from './locales/es'

export type Language = 'it' | 'en' | 'fr' | 'es'

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
]

i18n
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export function setLanguage(lang: Language) {
  i18n.changeLanguage(lang)
  window.api.setSetting('lang', lang)
}

export default i18n
