export default function StudentsLoading() {
  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex-shrink-0" />
        <main className="flex-1 p-6">
          <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse mb-4" />
          <div className="bg-white rounded-xl border border-gray-100 h-64 animate-pulse" />
        </main>
      </div>
    </div>
  )
}
