export default function AdminLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
          <div className="h-4 w-64 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-6 w-3/4 bg-gray-200 rounded-lg"></div>
              <div className="h-4 w-full bg-gray-100 rounded-lg"></div>
              <div className="h-4 w-5/6 bg-gray-100 rounded-lg"></div>
            </div>
            <div className="h-10 w-full bg-gray-50 rounded-xl mt-4"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
