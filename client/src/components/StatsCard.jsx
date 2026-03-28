export default function StatsCard({ title, value, subtitle, icon: Icon, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  };

  return (
    <div className="card p-4 sm:p-5 transition-all duration-150 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`flex-shrink-0 rounded-xl p-2 sm:p-3 ${colors[color]}`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
