interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
}

export function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex items-start gap-4 hover:shadow-md transition-shadow">
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0 text-brand-500 dark:text-brand-400">
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
        {description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </div>
  )
}
