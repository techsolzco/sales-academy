export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
        <div className="h-4 w-80 bg-gray-100 rounded-lg"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="h-10 w-10 bg-gray-100 rounded-xl mb-4"></div>
            <div className="h-6 w-1/2 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>

      <div className="h-96 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
         <div className="h-6 w-48 bg-gray-200 rounded-lg mb-6"></div>
         <div className="space-y-4">
           {[1, 2, 3, 4].map((i) => (
             <div key={i} className="h-16 bg-gray-50 rounded-xl"></div>
           ))}
         </div>
      </div>
    </div>
  )
}
