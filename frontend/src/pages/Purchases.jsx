import { useState, useEffect, useCallback } from 'react';
import { Plus, ShoppingCart, Trash2, X, CheckCircle } from 'lucide-react';
import { purchasesAPI, assetsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  baseId: '', equipmentTypeId: '', quantity: '', unitCost: '', supplier: '', notes: '',
};

export default function Purchases() {
  const { user } = useAuth();

  const [purchases, setPurchases]   = useState([]);
  const [bases, setBases]           = useState([]);
  const [equipTypes, setEquipTypes] = useState([]);
  const [total, setTotal]           = useState(0);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [filterBase, setFilterBase] = useState(user?.baseId || '');

  const canCreate = ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'].includes(user?.role);
  const canDelete = user?.role === 'ADMIN';

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterBase) params.baseId = filterBase;
      const res = await purchasesAPI.getAll(params);
      setPurchases(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load purchases.');
    } finally {
      setLoading(false);
    }
  }, [filterBase]);

  useEffect(() => {
    assetsAPI.getBases().then(r => setBases(r.data)).catch(() => {});
    assetsAPI.getEquipmentTypes().then(r => setEquipTypes(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  // Pre-fill base for scoped users
  useEffect(() => {
    if (user?.baseId) setForm(f => ({ ...f, baseId: String(user.baseId) }));
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await purchasesAPI.create({
        baseId:          parseInt(form.baseId),
        equipmentTypeId: parseInt(form.equipmentTypeId),
        quantity:        parseInt(form.quantity),
        unitCost:        parseFloat(form.unitCost) || 0,
        supplier:        form.supplier,
        notes:           form.notes,
      });
      setSuccess('Purchase recorded successfully.');
      setForm(f => ({ ...initialForm, baseId: user?.baseId ? String(user.baseId) : '' }));
      setShowForm(false);
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this purchase record?')) return;
    try {
      await purchasesAPI.remove(id);
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Purchases</h2>
          <p className="text-gray-500 text-sm mt-0.5">{total} records total</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Cancel' : 'New Purchase'}
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingCart size={18} /> Record New Purchase
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base *</label>
              <select required value={form.baseId}
                onChange={e => setForm(f => ({ ...f, baseId: e.target.value }))}
                disabled={user?.role === 'BASE_COMMANDER'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-50"
              >
                <option value="">Select base…</option>
                {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Equipment Type *</label>
              <select required value={form.equipmentTypeId}
                onChange={e => setForm(f => ({ ...f, equipmentTypeId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select type…</option>
                {equipTypes.map(et => <option key={et.id} value={et.id}>{et.name} ({et.category})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
              <input required type="number" min="1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="e.g. 100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost</label>
              <input type="number" min="0" step="0.01" value={form.unitCost}
                onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
              <input type="text" value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Supplier name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Optional notes"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="px-6 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg transition disabled:opacity-50">
                {submitting ? 'Saving…' : 'Record Purchase'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      {user?.role !== 'BASE_COMMANDER' && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Filter by base:</label>
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
                <th className="px-5 py-3">Base</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3">By</th>
                {canDelete && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                : purchases.length === 0
                ? <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">No purchase records found.</td></tr>
                : purchases.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{p.equipment_name}</td>
                      <td className="px-5 py-3 text-gray-600">{p.base_name}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.category === 'WEAPON'     ? 'bg-red-100 text-red-700' :
                          p.category === 'VEHICLE'    ? 'bg-blue-100 text-blue-700' :
                                                        'bg-amber-100 text-amber-700'
                        }`}>{p.category}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">{Number(p.quantity).toLocaleString()}</td>
                      <td className="px-5 py-3 text-gray-500">{p.supplier || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{p.created_by_username || '—'}</td>
                      {canDelete && (
                        <td className="px-5 py-3">
                          <button onClick={() => handleDelete(p.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
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
