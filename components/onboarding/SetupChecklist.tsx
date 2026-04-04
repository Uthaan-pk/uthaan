'use client'

/**
 * SetupChecklist
 *
 * A lightweight, persistent onboarding checklist for first-time admins.
 * - Shows setup progress with a visual progress bar
 * - Each item deep-links to the relevant page
 * - Items can be manually ticked (or auto-ticked if you wire up events)
 * - Collapsible so it stays out of the way once admin is comfortable
 * - Dismissible once all items are complete (or manually)
 * - No AI, no chatbot, no floating assistant
 */

import Link from 'next/link'
import { useState } from 'react'
import { useOnboardingChecklist } from './useOnboardingChecklist'

export default function SetupChecklist() {
  const {
    items,
    completed,
    totalCount,
    completedCount,
    isAllDone,
    isDismissed,
    markDone,
    markUndone,
    dismiss,
  } = useOnboardingChecklist()

  const [isExpanded, setIsExpanded] = useState(true)

  // Don't render anything if dismissed
  if (isDismissed) return null

  const progressPercent = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-6">

      {/* Header — always visible, click to collapse */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="setup-checklist-body"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            {isAllDone ? (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">
                ✅
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1a2e1a]/10 flex items-center justify-center">
                <span className="text-xs font-bold text-[#1a2e1a]">
                  {completedCount}/{totalCount}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {isAllDone ? 'School setup complete!' : 'Finish setting up your school'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isAllDone
                ? "You're all set. Dismiss this when ready."
                : `${totalCount - completedCount} step${totalCount - completedCount === 1 ? '' : 's'} remaining`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Progress bar */}
          <div className="hidden sm:block w-24">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6fcf6f] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{progressPercent}%</p>
          </div>

          {/* Collapse chevron */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Checklist body */}
      {isExpanded && (
        <div id="setup-checklist-body">

          {/* Mobile progress bar */}
          <div className="sm:hidden px-5 pb-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6fcf6f] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {items.map(item => {
              const done = completed.has(item.id)
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-4 px-5 py-3.5 transition-colors ${
                    done ? 'bg-gray-50/60' : 'hover:bg-gray-50/40'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => done ? markUndone(item.id) : markDone(item.id)}
                    aria-label={done ? `Mark "${item.title}" as not done` : `Mark "${item.title}" as done`}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all min-w-[20px] min-h-[20px] ${
                      done
                        ? 'bg-[#6fcf6f] border-[#6fcf6f]'
                        : 'border-gray-300 hover:border-[#6fcf6f]'
                    }`}
                  >
                    {done && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium leading-snug ${
                          done ? 'text-gray-400 line-through' : 'text-gray-800'
                        }`}>
                          <span className="mr-1.5" aria-hidden="true">{item.emoji}</span>
                          {item.title}
                        </p>
                        {!done && (
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Deep link — only when not done */}
                      {!done && (
                        <Link
                          href={item.href}
                          className="flex-shrink-0 text-xs font-medium text-[#1a2e1a] hover:underline whitespace-nowrap mt-0.5"
                        >
                          Go →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {isAllDone
                ? 'Great work! Your school is ready to use Uthaan.'
                : 'Tick each step when done, or click Go → to open that page.'}
            </p>
            {isAllDone && (
              <button
                onClick={dismiss}
                className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
