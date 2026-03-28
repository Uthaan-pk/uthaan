export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#f8f7f4]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[#6fcf6f] border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-[#4b6350]">Loading timetable...</p>
      </div>
    </div>
  )
}