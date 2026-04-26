'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

type InViewOptions = {
  root?: Element | Document | null
  rootMargin?: string
  threshold?: number | number[]
  once?: boolean
  initialInView?: boolean
}

export function useReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

      mediaQuery.addEventListener('change', onStoreChange)

      return () => mediaQuery.removeEventListener('change', onStoreChange)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  )
}

export function useInView<T extends Element>({
  root = null,
  rootMargin = '0px',
  threshold = 0,
  once = false,
  initialInView = false,
}: InViewOptions = {}) {
  const ref = useRef<T | null>(null)
  const [isInView, setIsInView] = useState(initialInView)
  const reducedMotion = useReducedMotion()
  const thresholdKey = useMemo(() => JSON.stringify(threshold), [threshold])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)

        if (once && entry.isIntersecting) {
          observer.disconnect()
        }
      },
      { root, rootMargin, threshold }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [root, rootMargin, thresholdKey, once, threshold])

  return { ref, isInView, reducedMotion }
}
