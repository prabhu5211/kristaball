import { X, TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';

export default function NetMoveModal({ metrics, onClose }) {
  if (!metrics) return null;

  const rows = [
    { label: 'Purchases',     value: metrics.total_purchases,    icon: ShoppingCart, color: 'text-blue-600',    sign: '+' },
    { label: 'Transfers In',  value: metrics.total_transfer_in,  icon: TrendingUp,   color: 'text-emerald-600', sign: '+' },
    { label: 'Transfers Out', value: metrics.total_transfer_out, icon: TrendingDown, color: 'text-red-500',     sign: '-' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Net Movement Breakdown</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          {rows.map(({ label, value, icon: Icon, color, sign }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <Icon size={18} className={color} />
                <span className="text-gray-700 text-sm font-medium">{label}</span>
              </div>
              <span className={`font-bold text-sm ${color}`}>
                {sign}{Number(value || 0).toLocaleString()}
              </span>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between pt-3 mt-1">
            <span className="font-bold text-gray-800">Total Net Movement</span>
            <span className={`text-xl font-extrabold ${
              (metrics.net_movement || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {(metrics.net_movement || 0) >= 0 ? '+' : ''}
              {Number(metrics.net_movement || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
