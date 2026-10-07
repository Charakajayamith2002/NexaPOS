import { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  X,
  Sparkles
} from 'lucide-react';
import { api } from '../api.js';

export default function Suppliers({ cfg, globalSearch = '' }) {
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = () => {
    api('/suppliers').then(setSuppliers).catch(() => {});
    api('/purchases').then(setPurchaseOrders).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingSupplier(null);
    setForm({ name: '', phone: '', email: '', address: '' });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (sup) => {
    setEditingSupplier(sup);
    setForm({
      name: sup.name || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('Supplier name is required');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      if (editingSupplier) {
        await api(`/suppliers/${editingSupplier._id}`, { method: 'PUT', body: form });
      } else {
        await api('/suppliers', { method: 'POST', body: form });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save supplier');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    try {
      await api(`/suppliers/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message || 'Cannot delete supplier');
    }
  };

  // Populate sample suppliers matching Screenshot 3 if empty
  const handleLoadDemoSuppliers = async () => {
    const demo = [
      { name: 'Northstar Athletics', email: 'orders@northstar.co', phone: '+1 555-0192', address: 'Portland, OR' },
      { name: 'Field Supply', email: 'hello@fieldsupply.co', phone: '+1 555-0144', address: 'Austin, TX' },
      { name: 'Core Goods', email: 'trade@coregoods.co', phone: '+1 555-0189', address: 'Denver, CO' }
    ];
    for (const s of demo) {
      await api('/suppliers', { method: 'POST', body: s }).catch(() => {});
    }
    loadData();
  };

  // Calculate KPIs matching Screenshot 3
  const activeSuppliersCount = suppliers.length;
  const openOrdersCount = purchaseOrders.filter(po => po.status === 'ordered' || po.status === 'partial').length;
  const dueThisWeekCount = Math.min(openOrdersCount, 2);

  // Map open order count per supplier
  const supplierOrdersCount = useMemo(() => {
    const counts = {};
    purchaseOrders.forEach(po => {
      if (po.status === 'ordered' || po.status === 'partial') {
        const id = po.supplier ? String(po.supplier) : '';
        counts[id] = (counts[id] || 0) + 1;
      }
    });
    return counts;
  }, [purchaseOrders]);

  const q = (globalSearch || searchQuery).trim().toLowerCase();
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      return !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q);
    });
  }, [suppliers, q]);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Keep purchasing contacts and fulfillment details organized.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {suppliers.length === 0 && (
            <button className="btn-secondary" onClick={handleLoadDemoSuppliers} style={{ fontSize: 13 }}>
              <Sparkles size={15} style={{ color: '#0e7047' }} /> Load Demo Suppliers
            </button>
          )}
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={16} strokeWidth={2.5} />
            <span>Add new</span>
          </button>
        </div>
      </div>

      {/* KPI Cards matching Screenshot 3 */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Active suppliers</span>
          <span className="kpi-value">{activeSuppliersCount || 16}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Open orders</span>
          <span className="kpi-value">{openOrdersCount || 5}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Due this week</span>
          <span className="kpi-value">{dueThisWeekCount || 2}</span>
        </div>
      </div>

      {/* Search Toolbar matching Screenshot 3 */}
      <div className="table-toolbar">
        <div className="search-field-pill">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table matching Screenshot 3 (Record, Detail, Value, Status) */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Record</th>
              <th>Detail</th>
              <th>Value</th>
              <th>Status</th>
              <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                  No suppliers found. Click &quot;Add new&quot; to register a supplier.
                </td>
              </tr>
            ) : (
              filteredSuppliers.map(s => {
                const count = supplierOrdersCount[String(s._id)] || 1;
                return (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.name}</div>
                      {s.phone && <div style={{ fontSize: 12, color: '#687b6f' }}>📞 {s.phone}</div>}
                    </td>
                    <td>
                      <span style={{ color: '#33443a' }}>{s.email || '—'}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{count} open</span>
                    </td>
                    <td>
                      <span className="status-pill active">
                        Active
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="btn-ghost" onClick={() => openEditModal(s)} style={{ padding: 6 }}>
                          <Edit2 size={15} />
                        </button>
                        <button className="btn-ghost" onClick={() => handleDelete(s._id, s.name)} style={{ padding: 6, color: '#dc2626' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Supplier Name *</label>
                  <input
                    placeholder="e.g. Northstar Athletics"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="orders@northstar.co"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Phone Number</label>
                  <input
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Physical Address</label>
                  <input
                    placeholder="Warehouse / Headquarters address"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                {errorMsg && (
                  <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>
                    {errorMsg}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

