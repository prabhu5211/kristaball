import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Flame, X, CheckCircle } from 'lucide-react';
import { assignmentsAPI, expendituresAPI, assetsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const initAssign = { baseId: '', equipmentTypeId: '', quantity: '', assignedTo: '', notes: '' };
const initExpend = { baseId: '', equipmentTypeId: '', quantity: '', reason: '', notes: '' };

export default function Assignments() {
  const { user } = useAuth();

  const [tab, setTab]               = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [bases, setBases]           = useState([]);
  const [equipTypes, setEquipTypes] = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [aForm, setAForm]           = useState(initAssign);
  const [eForm, setEForm]           = useState(initExpend);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(true);

  const canCreate = ['ADMIN', 'BASE_COMMANDER'].includes(user?.role);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = user?.baseId ? { baseId: user.baseId } : {};
      const [ar, er] = await Promise.all([
        assignmentsAPI.getAll(params),
        expendituresAPI.getAll(params),
      ]);
      setAssignments(ar.data.data);
      setExpenditures(er.data.data);
    } catch (err) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    assetsAPI.getBases().then(r => setBases(r.data)).catch(() => {});
    assetsAPI.getEquipmentTypes().then(r => setEquipTypes(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (user?.baseId) {
      setAForm(f => ({ ...f, baseId: String(user.baseId) }));
      setEForm(f => ({ ...f, baseId: String(user.baseId) }));
    }
  }, [user]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError(''); setSuccess('');
    try {
      await assignmentsAPI.create({
        baseId:          parseInt(aForm.baseId),
        equipmentTypeId: parseInt(aForm.equipmentTypeId),
        quantity:        parseInt(aForm.quantity),
        assignedTo:      aForm.assignedTo,
        notes:           aForm.notes,
      });
      setSuccess('Assignment recorded.');
      setAForm(f => ({ ...initAssign, baseId: user?.baseId ? String(user.baseId) : '' }));
      setShowForm(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed.');
    } finally { setSubmitting(false); }
  };

  const handleExpendSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError(''); setSuccess('');
    try {
      await expendituresAPI.create({
        baseId:          parseInt(eForm.baseId),
        equipmentTypeId: parseInt(eForm.equipmentTypeId),
        quantity:        parseInt(eForm.quantity),
        reason:          eForm.reason,
        notes:           eForm.notes,
      });
      setSuccess('Expenditure recorded.');
      setEForm(f => ({ ...initExpend, baseId: user?.baseId ? String(user.baseId) : '' }));
      setShowForm(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Assignments & Expenditures</h2>
          <p className="text-gray-500 text-sm mt-0.5">Personnel assignments and consumed assets</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Cancel' : 'New Record'}
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

      {/* Form */}
      {showForm && canCreate && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          {/* Toggle */}
          <div className="flex gap-2 mb-5">
            <button onClick={() => setTab('assignments')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'assignments' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Users size={14} className="inline mr-1.5" />Assignment
            </button>
            <button onClick={() => setTab('expenditures')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'expenditures' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Flame size={14} className="inline mr-1.5" />Expenditure
            </button>
          </div>

          {tab === 'assignments' ? (
            <form onSubmit={handleAssignSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Base *</label>
                <select required value={aForm.baseId} onChange={e => setAForm(f => ({ ...f, baseId: e.target.value }))}
                  disabled={user?.role === 'BASE_COMMANDER'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-50">
                  <option value="">Select base…</option>
                  {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Equipment Type *</label>
                <select required value={aForm.equipmentTypeId} onChange={e => setAForm(f => ({ ...f, equipmentTypeId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">Select type…</option>
                  {equipTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                <input required type="number" min="1" value={aForm.quantity} onChange={e => setAForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. 5" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To *</label>
                <input required type="text" value={aForm.assignedTo} onChange={e => setAForm(f => ({ ...f, assignedTo: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. 1st Infantry Platoon" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" value={aForm.notes} onChange={e => setAForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg disabled:opacity-50">
                  {submitting ? 'Saving…' : 'Record Assignment'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleExpendSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Base *</label>
                <select required value={eForm.baseId} onChange={e => setEForm(f => ({ ...f, baseId: e.target.value }))}
                  disabled={user?.role === 'BASE_COMMANDER'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-50">
                  <option value="">Select base…</option>
                  {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Equipment Type *</label>
                <select required value={eForm.equipmentTypeId} onChange={e => setEForm(f => ({ ...f, equipmentTypeId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">Select type…</option>
                  {equipTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                <input required type="number" min="1" value={eForm.quantity} onChange={e => setEForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. 500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <input type="text" value={eForm.reason} onChange={e => setEForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="e.g. Live-fire training" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" value={eForm.notes} onChange={e => setEForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg disabled:opacity-50">
                  {submitting ? 'Saving…' : 'Record Expenditure'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {['assignments', 'expenditures'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${tab === t ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {t === 'assignments' ? <><Users size={14} className="inline mr-1.5" />Assignments ({assignments.length})</> : <><Flame size={14} className="inline mr-1.5" />Expenditures ({expenditures.length})</>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Equipment</th>
                <th className="px-5 py-3">Base</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3">{tab === 'assignments' ? 'Assigned To' : 'Reason'}</th>
                <th className="px-5 py-3">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(4)].map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                : (tab === 'assignments' ? assignments : expenditures).length === 0
                ? <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No records found.</td></tr>
                : (tab === 'assignments' ? assignments : expenditures).map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{r.equipment_name}</td>
                      <td className="px-5 py-3 text-gray-600">{r.base_name}</td>
                      <td className="px-5 py-3 text-right font-semibold">{Number(r.quantity).toLocaleString()}</td>
                      <td className="px-5 py-3 text-gray-600">{(tab === 'assignments' ? r.assigned_to : r.reason) || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{r.created_by_username || '—'}</td>
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
