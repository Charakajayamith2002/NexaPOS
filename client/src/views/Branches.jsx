import { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Star, 
  Edit3, 
  Trash2, 
  X, 
  Building2,
  Check,
  Search
} from 'lucide-react';
import { api } from '../api.js';

export default function Branches({ cfg, onBranchChanged }) {
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(() => localStorage.activeBranchId || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadBranches = () => {
    setLoading(true);
    api('/branches')
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setBranches(list);
        if (!activeBranchId && list.length > 0) {
          const def = list.find(b => b.isDefault) || list[0];
          setActiveBranchId(def._id);
          localStorage.activeBranchId = def._id;
          localStorage.activeBranchName = def.name;
          localStorage.activeBranchCode = def.code;
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleSelectActiveBranch = (b) => {
    setActiveBranchId(b._id);
    localStorage.activeBranchId = b._id;
    localStorage.activeBranchName = b.name;
    localStorage.activeBranchCode = b.code;
    if (onBranchChanged) onBranchChanged(b);
  };

  const handleDelete = async (b) => {
    if (b.isDefault) {
      alert('Cannot delete the default headquarters branch');
      return;
    }
    if (!confirm(`Are you sure you want to delete branch "${b.name}" (${b.code})?`)) return;
    try {
      await api(`/branches/${b._id}`, { method: 'DELETE' });
      loadBranches();
    } catch (e) {
      alert(e.message || 'Error deleting branch');
    }
  };

  const filtered = branches.filter(b => {
    const q = search.toLowerCase();
    return b.name?.toLowerCase().includes(q) || 
           b.code?.toLowerCase().includes(q) || 
           b.address?.toLowerCase().includes(q);
  });

  const defaultBranch = branches.find(b => b.isDefault);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Store Branches &amp; Locations</h1>
          <p className="page-subtitle">Manage multi-store retail locations, store codes, and regional register attribution.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => {
            setEditingBranch(null);
            setIsModalOpen(true);
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Store Locations</span>
          <span className="kpi-value">{branches.length}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Active Operational Branches</span>
          <span className="kpi-value" style={{ color: '#0e7047' }}>
            {branches.filter(b => b.active !== false).length}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Default Headquarters</span>
          <span className="kpi-value" style={{ fontSize: 17, marginTop: 4, color: '#111a14' }}>
            {defaultBranch ? defaultBranch.name : 'Not set'}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Current Terminal Branch</span>
          <span className="kpi-value" style={{ fontSize: 17, marginTop: 4, color: '#0e7047' }}>
            {branches.find(b => b._id === activeBranchId)?.name || 'Default Store'}
          </span>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="search-field-pill">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search branches by name, store code, or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="btn-ghost" style={{ padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Branches Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 120 }}>Store Code</th>
              <th>Branch Details</th>
              <th>Address / Location</th>
              <th>Contact Info</th>
              <th style={{ width: 130 }}>Status</th>
              <th style={{ width: 160, textAlign: 'center' }}>Active Terminal</th>
              <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px', color: '#687b6f' }}>
                  <Store size={36} style={{ color: '#c4d3c9', margin: '0 auto 10px', display: 'block' }} />
                  {loading ? 'Loading store branches...' : 'No store branches found matching your search.'}
                </td>
              </tr>
            ) : (
              filtered.map(b => {
                const isCurrent = b._id === activeBranchId;
                return (
                  <tr key={b._id}>
                    <td>
                      <span style={{ 
                        display: 'inline-block',
                        background: '#f0f5f2', 
                        border: '1px solid #d7e3dc', 
                        padding: '4px 8px', 
                        borderRadius: 6, 
                        fontWeight: 800, 
                        fontFamily: 'JetBrains Mono, monospace', 
                        fontSize: 12.5,
                        color: '#1b3223'
                      }}>
                        {b.code}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                        {b.isDefault && (
                          <span style={{ 
                            background: '#fef3c7', 
                            color: '#b45309', 
                            fontSize: 11, 
                            fontWeight: 700, 
                            padding: '2px 6px', 
                            borderRadius: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            <Star size={11} fill="#b45309" /> HQ Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#556a5c', fontSize: 13 }}>
                        <MapPin size={14} style={{ color: '#88998d', flexShrink: 0 }} />
                        <span>{b.address || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, color: '#556a5c' }}>
                        {b.phone && <div>📞 {b.phone}</div>}
                        {b.email && <div style={{ color: '#687b6f' }}>✉️ {b.email}</div>}
                        {!b.phone && !b.email && '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${b.active !== false ? 'healthy' : 'danger'}`}>
                        {b.active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isCurrent ? (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 5, 
                          color: '#0e7047', 
                          fontWeight: 700, 
                          fontSize: 12.5,
                          background: '#e4f3ea',
                          padding: '4px 10px',
                          borderRadius: 99
                        }}>
                          <Check size={14} strokeWidth={3} /> Current Active
                        </span>
                      ) : (
                        <button 
                          className="btn-secondary"
                          onClick={() => handleSelectActiveBranch(b)}
                          style={{ fontSize: 12, padding: '4px 10px', height: 'auto' }}
                        >
                          Switch Here
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button 
                          className="btn-ghost"
                          onClick={() => {
                            setEditingBranch(b);
                            setIsModalOpen(true);
                          }}
                          style={{ padding: 6 }}
                          title="Edit branch"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          className="btn-ghost"
                          onClick={() => handleDelete(b)}
                          disabled={b.isDefault}
                          style={{ padding: 6, color: b.isDefault ? '#ccc' : '#ef4444' }}
                          title="Delete branch"
                        >
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

      {/* Branch Create / Edit Modal */}
      {isModalOpen && (
        <BranchModal
          branch={editingBranch}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBranch(null);
          }}
          onSaved={() => {
            setIsModalOpen(false);
            setEditingBranch(null);
            loadBranches();
          }}
        />
      )}
    </div>
  );
}

// Modal Component
function BranchModal({ branch, onClose, onSaved }) {
  const isEdit = !!branch;
  const [form, setForm] = useState({
    name: branch?.name || '',
    code: branch?.code || '',
    address: branch?.address || '',
    phone: branch?.phone || '',
    email: branch?.email || '',
    isDefault: !!branch?.isDefault,
    active: branch?.active !== false
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setErrorMsg('Store name and store code are required');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      if (isEdit) {
        await api(`/branches/${branch._id}`, {
          method: 'PUT',
          body: form
        });
      } else {
        await api('/branches', {
          method: 'POST',
          body: form
        });
      }
      onSaved();
    } catch (err) {
      setErrorMsg(err.message || 'Error saving branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e4f3ea', color: '#0e7047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={18} />
            </div>
            <div>
              <div className="modal-title">{isEdit ? 'Edit Store Branch' : 'Add Store Branch Location'}</div>
              <div style={{ fontSize: 12, color: '#687b6f' }}>Multi-store retail network configuration</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#243b2c', marginBottom: 4, display: 'block' }}>
                  Branch / Store Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Uptown Plaza Express"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#243b2c', marginBottom: 4, display: 'block' }}>
                  Store Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. UP-03"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#243b2c', marginBottom: 4, display: 'block' }}>
                Store Physical Address
              </label>
              <input
                type="text"
                placeholder="Street address, unit/mall suite, city"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#243b2c', marginBottom: 4, display: 'block' }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#243b2c', marginBottom: 4, display: 'block' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="store@domain.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                />
                <span>Set as Default Headquarters Branch</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                />
                <span>Active Store (Accept transactions and shifts)</span>
              </label>
            </div>

            {errorMsg && (
              <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '10px 12px', borderRadius: 8 }}>
                {errorMsg}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Branch')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

