'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Language, translations, TranslationKeys } from '@/lib/translations'

type LanguageContextType = {
  lang: Language
  setLang: (lang: Language) => void
  t: Record<TranslationKeys, string>
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
)

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem('uthaan_lang') as Language | null
    if (saved === 'en' || saved === 'ur') {
      setLangState(saved)
      document.documentElement.lang = saved
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('uthaan_lang', newLang)
    document.documentElement.lang = newLang
  }

  const value = useMemo(() => {
    return {
      lang,
      setLang,
      t: translations[lang] ?? translations.en,
    }
  }, [lang])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }

  return context
}
