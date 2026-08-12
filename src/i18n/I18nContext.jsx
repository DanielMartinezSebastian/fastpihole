import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANGUAGE, LANGUAGES, translations } from './translations'

const STORAGE_KEY = 'fastpihole-lang'
const I18nContext = createContext(null)

function readStoredLanguage() {
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
  return stored && translations[stored] ? stored : DEFAULT_LANGUAGE
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = (code) => {
    if (!translations[code]) return
    setLanguageState(code)
    window.localStorage.setItem(STORAGE_KEY, code)
  }

  const value = useMemo(() => {
    const dict = translations[language]
    const t = (key) => dict[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key
    return { language, setLanguage, t, languages: LANGUAGES }
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider')
  return ctx
}
