import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { type Locale, type TranslationKey, getTranslations } from './i18n'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
  dir: 'rtl' | 'ltr'
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'archion-locale'

function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'he' || stored === 'en') return stored
  const browserLang = navigator.language.slice(0, 2)
  return browserLang === 'he' ? 'he' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      return detectLocale()
    } catch {
      return 'he'
    }
  })

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
  }, [])

  const dir: 'rtl' | 'ltr' = locale === 'he' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', locale)
  }, [locale, dir])

  const translations = getTranslations(locale)
  const t = useCallback(
    (key: TranslationKey): string => translations[key] as string,
    [translations]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
