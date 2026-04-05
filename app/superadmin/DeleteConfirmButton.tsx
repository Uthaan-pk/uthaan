'use client'

export default function DeleteConfirmButton({ schoolName }: { schoolName: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(`Delete "${schoolName}"? This cannot be undone.`)) {
          e.preventDefault()
        }
      }}
      className="text-xs text-red-500 hover:text-red-700 border border-red-100 hover:border-red-300 px-2.5 py-1 rounded-lg transition-colors"
    >
      Delete
    </button>
  )
}
