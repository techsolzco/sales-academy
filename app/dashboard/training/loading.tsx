export default function Loading() {
  return (
    <div className="px-4 py-5 md:p-8 max-w-5xl animate-pulse">
      <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6" />
      <div className="space-y-3">
          <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
