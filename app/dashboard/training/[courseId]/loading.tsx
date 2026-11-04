export default function CourseDetailLoading() {
  return (
    <div className="px-4 py-5 md:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* Header bar skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>

      {/* Hero card skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4">
        <div className="h-8 w-2/3 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 w-full bg-gray-100 dark:bg-gray-700/60 rounded" />
        <div className="h-4 w-4/5 bg-gray-100 dark:bg-gray-700/60 rounded" />
        <div className="flex gap-4 pt-2">
          <div className="h-6 w-24 bg-gray-100 dark:bg-gray-700 rounded-full" />
          <div className="h-6 w-32 bg-gray-100 dark:bg-gray-700 rounded-full" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-3 border-b border-gray-200 dark:border-gray-700 pb-2">
        <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-9 w-28 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>

      {/* Modules list skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3"
          >
            <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-700/60 rounded" />
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
