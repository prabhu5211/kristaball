import { useState, useEffect, useCallback } from 'react';
import {
  PackageOpen, TrendingUp, Package, Flame,
  BarChart3, Filter, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import NetMoveModal from '../components/NetMoveModal';
import { assetsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  const [metrics, setMetrics]         = useState(null);
  const [summary, setSummary]         = useState([]);
  const [bases, setBases]             = useState([]);
  const [equipTypes, setEquipTypes]   = useState([]);
  const [showModal, setShowModal]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const [filters, setFilters] = useState({
    baseId:          user?.baseId || '',
    equipmentTypeId: '',
    startDate:       '',
    endDate:         '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.baseId)          params.baseId          = filters.baseId;
      if (filters.equipmentTypeId) params.equipmentTypeId = filters.equipmentTypeId;
      if (filters.startDate)       params.startDate       = filters.startDate;
      if (filters.endDate)         params.endDate         = filters.endDate;

      const [metricsRes, summaryRes] = await Promise.all([
        assetsAPI.getDashboard(params),
        assetsAPI.getSummary(params),
      ]);
      setMetrics(metricsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    assetsAPI.getBases().then(r => setBases(r.data)).catch(() => {});
    assetsAPI.getEquipmentTypes().then(r => setEquipTypes(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build chart data from summary
  const chartData = summary
    .filter(s => s.current_balance > 0 || s.purchased > 0)
    .slice(0, 8)
    .map(s => ({
      name:    s.equipment_name.length > 14 ? s.equipment_name.slice(0, 14) + '…' : s.equipment_name,
      Balance: Math.max(0, s.current_balance),
      Assigned: s.assigned,
      Expended: s.expended,
    }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {user?.baseName ? `Viewing: ${user.baseName}` : 'All Bases — Global View'}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <Filter size={18} className="text-gray-400 self-center" />

        {user?.role !== 'BASE_COMMANDER' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Base</label>
            <select
              value={filters.baseId}
              onChange={e => setFilters(f => ({ ...f, baseId: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">All Bases</option>
              {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Equipment Type</label>
          <select
            value={filters.equipmentTypeId}
            onChange={e => setFilters(f => ({ ...f, equipmentTypeId: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">All Equipment</option>
            {equipTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input type="date" value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <input type="date" value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <button
          onClick={() => setFilters({ baseId: user?.baseId || '', equipmentTypeId: '', startDate: '', endDate: '' })}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 h-28 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Opening Balance"
            value={metrics.opening_balance}
            icon={PackageOpen}
            color="blue"
            subtitle={filters.startDate ? `as of ${filters.startDate}` : 'All time'}
          />
          <StatCard
            title="Net Movement"
            value={metrics.net_movement}
            icon={TrendingUp}
            color="emerald"
            onClick={() => setShowModal(true)}
            subtitle="Click for breakdown"
          />
          <StatCard
            title="Assigned / Expended"
            value={(metrics.total_assigned || 0) + (metrics.total_expended || 0)}
            icon={Flame}
            color="amber"
            subtitle={`${metrics.total_assigned || 0} assigned · ${metrics.total_expended || 0} expended`}
          />
          <StatCard
            title="Closing Balance"
            value={metrics.closing_balance}
            icon={Package}
            color={metrics.closing_balance < 0 ? 'red' : 'purple'}
            subtitle="Current available stock"
          />
        </div>
      )}

      {/* Chart + Inventory Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-slate-600" />
            <h3 className="font-semibold text-gray-800">Inventory Overview</h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Balance"  fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="Assigned" fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="Expended" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data available</div>
          )}
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Stock by Equipment Type</h3>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b">
                  <th className="pb-2 pr-4">Equipment</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4 text-right">Balance</th>
                  <th className="pb-2 text-right">Expended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summary.map(row => (
                  <tr key={row.equipment_type_id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-700">{row.equipment_name}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        row.category === 'WEAPON'     ? 'bg-red-100 text-red-700' :
                        row.category === 'VEHICLE'    ? 'bg-blue-100 text-blue-700' :
                                                        'bg-amber-100 text-amber-700'
                      }`}>{row.category}</span>
                    </td>
                    <td className={`py-2 pr-4 text-right font-semibold ${row.current_balance < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                      {Number(row.current_balance).toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-red-500 font-medium">
                      {Number(row.expended).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {summary.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">No inventory data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && <NetMoveModal metrics={metrics} onClose={() => setShowModal(false)} />}
    </div>
  );
}
