import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowLeftRight, X, CheckCircle, AlertCircle } from 'lucide-react';
import { transfersAPI, assetsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  sourceBaseId: '', destinationBaseId: '', equipmentTypeId: '', quantity: '', notes: '',
};

export default function Transfers() {
  const { user } = useAuth();

  const [transfers, setTransfers]   = useState([]);
  const [bases, setBases]           = useState([]);
  const [equipTypes, setEquipTypes] = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [filterBase, setFilterBase] = useState(user?.baseId || '');

  const canCreate = ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'].includes(user?.role);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterBase) params.baseId = filterBase;
      const res = await transfersAPI.getAll(params);
      setTransfers(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load transfers.');
    } finally {
      setLoading(false);
    }
  }, [filterBase]);

  useEffect(() => {
    assetsAPI.getBases().then(r => setBases(r.data)).catch(() => {});
    assetsAPI.getEquipmentTypes().then(r => setEquipTypes(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  useEffect(() => {
    if (user?.baseId) setForm(f => ({ ...f, sourceBaseId: String(user.baseId) }));
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await transfersAPI.create({
        sourceBaseId:      parseInt(form.sourceBaseId),
        destinationBaseId: parseInt(form.destinationBaseId),
        equipmentTypeId:   parseInt(form.equipmentTypeId),
        quantity:          parseInt(form.quantity),
        notes:             form.notes,
      });
      setSuccess('Transfer completed successfully.');
      setForm(f => ({ ...initialForm, sourceBaseId: user?.baseId ? String(user.baseId) : '' }));
      setShowForm(false);
      fetchTransfers();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = {
    COMPLETED:  'bg-emerald-100 text-emerald-700',
    IN_TRANSIT: 'bg-blue-100 text-blue-700',
    PENDING:    'bg-amber-100 text-amber-700',
    CANCELLED:  'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Transfers</h2>
          <p className="text-gray-500 text-sm mt-0.5">Cross-base asset movements</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Cancel' : 'New Transfer'}
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ArrowLeftRight size={18} /> Initiate Transfer
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Source Base *</label>
              <select required value={form.sourceBaseId}
                onChange={e => setForm(f => ({ ...f, sourceBaseId: e.target.value }))}
                disabled={user?.role === 'BASE_COMMANDER'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-50"
              >
                <option value="">Select source…</option>
                {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Destination Base *</label>
              <select required value={form.destinationBaseId}
                onChange={e => setForm(f => ({ ...f, destinationBaseId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select destination…</option>
                {bases.filter(b => b.id !== parseInt(form.sourceBaseId)).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Equipment Type *</label>
              <select required value={form.equipmentTypeId}
                onChange={e => setForm(f => ({ ...f, equipmentTypeId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select type…</option>
                {equipTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
              <input required type="number" min="1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="e.g. 10"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Reason for transfer…"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="px-6 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition disabled:opacity-50">
                {submitting ? 'Processing…' : 'Execute Transfer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      {user?.role !== 'BASE_COMMANDER' && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Filter by base (source or destination):</label>
          <select value={filterBase} onChange={e => setFilterBase(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
            <option value="">All Bases</option>
            {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Equipment</th>
                <th className="px-5 py-3">From</th>
                <th className="px-5 py-3">To</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Initiated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                : transfers.length === 0
                ? <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No transfer records found.</td></tr>
                : transfers.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{t.equipment_name}</td>
                      <td className="px-5 py-3 text-gray-600">{t.source_base_name}</td>
                      <td className="px-5 py-3 text-gray-600">{t.destination_base_name}</td>
                      <td className="px-5 py-3 text-right font-semibold">{Number(t.quantity).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[t.status] || 'bg-gray-100 text-gray-600'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{t.initiated_by_username || '—'}</td>
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
