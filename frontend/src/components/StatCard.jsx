export default function StatCard({ title, value, icon: Icon, color = 'blue', onClick, subtitle }) {
  const colorMap = {
    blue:    { border: 'border-blue-500',    icon: 'text-blue-500',    bg: 'bg-blue-50'    },
    emerald: { border: 'border-emerald-500', icon: 'text-emerald-500', bg: 'bg-emerald-50' },
    amber:   { border: 'border-amber-500',   icon: 'text-amber-500',   bg: 'bg-amber-50'   },
    red:     { border: 'border-red-500',     icon: 'text-red-500',     bg: 'bg-red-50'     },
    purple:  { border: 'border-purple-500',  icon: 'text-purple-500',  bg: 'bg-purple-50'  },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border-l-4 ${c.border} p-5 flex items-center gap-4 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      {Icon && (
        <div className={`p-3 rounded-full ${c.bg}`}>
          <Icon size={22} className={c.icon} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">
          {value !== undefined && value !== null ? Number(value).toLocaleString() : '—'}
        </p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
