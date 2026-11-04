export default function AdminCourseDetailLoading() {
  return (
    <div className="px-4 py-5 md:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-4 w-96 bg-gray-100 dark:bg-gray-700/60 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-gray-200 dark:border-gray-700 pb-2">
        <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-9 w-28 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-8 w-20 bg-gray-100 dark:bg-gray-700 rounded-lg" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl" />
              <div className="h-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
