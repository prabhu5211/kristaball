import { useState, useEffect } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { assetsAPI } from '../services/api';

const actionColor = {
  PURCHASE:    'bg-blue-100 text-blue-700',
  TRANSFER:    'bg-purple-100 text-purple-700',
  ASSIGNMENT:  'bg-amber-100 text-amber-700',
  EXPENDITURE: 'bg-red-100 text-red-700',
  LOGIN:       'bg-gray-100 text-gray-600',
  USER_CREATED:'bg-emerald-100 text-emerald-700',
};

export default function AuditLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await assetsAPI.getAuditLogs({ limit: 200 });
      setLogs(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Audit Logs</h2>
          <p className="text-gray-500 text-sm mt-0.5">Complete system activity trail</p>
        </div>
        <button onClick={fetchLogs} disabled={loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Details</th>
                <th className="px-5 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                : logs.length === 0
                ? <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No audit records.</td></tr>
                : logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-700">{log.username || `User #${log.user_id}` || 'System'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor[log.action] || 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 max-w-xs truncate" title={log.details}>{log.details}</td>
                      <td className="px-5 py-3 text-gray-400">{log.ip_address || '—'}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
