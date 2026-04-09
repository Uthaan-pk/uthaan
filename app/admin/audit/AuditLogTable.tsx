'use client'

import { Fragment, useState } from 'react'
import type { AuditEntry } from './page'

function actionBadge(action: string) {
  if (action === 'insert') return 'bg-green-50 text-green-700'
  if (action === 'update') return 'bg-amber-50 text-amber-700'
  if (action === 'delete') return 'bg-red-50 text-red-600'
  return 'bg-gray-50 text-gray-600'
}

export default function AuditLogTable({
  logs,
  actorMap,
}: {
  logs: AuditEntry[]
  actorMap: Record<string, string>
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-16 text-center text-sm text-gray-400">
        No audit log entries yet.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Timestamp', 'Actor', 'Action', 'Entity', 'ID', 'Changes'].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const isOpen = expanded === log.id
              const hasChanges = log.old_value != null || log.new_value != null
              return (
                <Fragment key={log.id}>
                  <tr
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {log.actor_user_id ? (
                        <span className="font-mono text-[11px]">
                          {actorMap[log.actor_user_id] ?? 'user'}
                        </span>
                      ) : (
                        <span className="text-gray-300">system</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase ${actionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{log.entity_type}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-gray-400 max-w-[120px] truncate">
                      {log.entity_id}
                    </td>
                    <td className="px-4 py-3">
                      {hasChanges ? (
                        <button
                          onClick={() => setExpanded(isOpen ? null : log.id)}
                          className="text-[11px] text-[#1a2e1a] hover:underline"
                        >
                          {isOpen ? 'Hide ▲' : 'Show ▼'}
                        </button>
                      ) : (
                        <span className="text-gray-300 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-gray-50 border-b border-gray-50">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                          {log.old_value != null && (
                            <div>
                              <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">Before</div>
                              <pre className="text-[11px] text-gray-600 bg-white border border-gray-100 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
                                {JSON.stringify(log.old_value, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_value != null && (
                            <div>
                              <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">After</div>
                              <pre className="text-[11px] text-gray-600 bg-white border border-gray-100 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
                                {JSON.stringify(log.new_value, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
