'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

export default function RouteTransitionIndicator() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [settling, setSettling] = useState(false)
  const visibleRef = useRef(false)
  const previousPathname = useRef(pathname)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  useEffect(() => {
    const clearTimers = () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return

      const target = event.target
      if (!(target instanceof Element)) return

      const link = target.closest('a[href]')
      if (!link) return

      const anchor = link as HTMLAnchorElement
      const linkTarget = anchor.getAttribute('target')
      if (linkTarget && linkTarget !== '_self') return
      if (anchor.hasAttribute('download')) return

      const nextUrl = new URL(anchor.href, window.location.href)
      if (nextUrl.origin !== window.location.origin) return
      if (nextUrl.href === window.location.href) return
      if (nextUrl.pathname === window.location.pathname && nextUrl.hash) return

      clearTimers()
      setSettling(false)
      setVisible(true)
      fallbackTimer.current = setTimeout(() => {
        setSettling(true)
        settleTimer.current = setTimeout(() => setVisible(false), 220)
      }, 4500)
    }

    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
      clearTimers()
    }
  }, [])

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return
    }

    previousPathname.current = pathname
    if (!visibleRef.current) return

    if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
    if (settleTimer.current) clearTimeout(settleTimer.current)

    setSettling(true)
    settleTimer.current = setTimeout(() => {
      setVisible(false)
      setSettling(false)
    }, 260)
  }, [pathname])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={`uthaan-route-progress ${settling ? 'uthaan-route-progress-settling' : ''}`}
    >
      <div className="uthaan-route-progress-bar" />
    </div>
  )
}
