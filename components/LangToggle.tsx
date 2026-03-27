'use client'

import { useEffect, useState } from 'react'

export function useLang() {
  const [lang, setLangState] = useState<'en' | 'ur'>('en')
  useEffect(() => {
    const saved = localStorage.getItem('uthaan_lang') as 'en' | 'ur' | null
    if (saved) setLangState(saved)
  }, [])
  function setLang(l: 'en' | 'ur') {
    setLangState(l)
    localStorage.setItem('uthaan_lang', l)
    document.documentElement.dir = l === 'ur' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
  }
  return { lang, setLang }
}

export default function LangToggle() {
  const { lang, setLang } = useLang()
  useEffect(() => {
    const saved = localStorage.getItem('uthaan_lang') as 'en' | 'ur' | null
    if (saved === 'ur') {
      document.documentElement.dir = 'rtl'
      document.documentElement.lang = 'ur'
    }
  }, [])
  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
      <button onClick={() => setLang('en')}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${lang === 'en' ? 'bg-[#6fcf6f] text-[#1a2e1a]' : 'text-white/50 hover:text-white/80'}`}>
        EN
      </button>
      <button onClick={() => setLang('ur')}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${lang === 'ur' ? 'bg-[#6fcf6f] text-[#1a2e1a]' : 'text-white/50 hover:text-white/80'}`}
        style={{ fontFamily: 'serif' }}>
        اردو
      </button>
    </div>
  )
}
