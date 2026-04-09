'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-[#1a2e1a] text-[#6fcf6f] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#243d24] transition-colors"
    >
      Print / Save PDF
    </button>
  )
}
