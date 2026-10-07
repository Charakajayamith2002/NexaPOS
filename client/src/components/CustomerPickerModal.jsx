import { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Check, X, Phone, Award } from 'lucide-react';
import { api } from '../api.js';

export default function CustomerPickerModal({ isOpen, onClose, onSelect, currentCustomer, currency = '$' }) {
  const [q, setQ] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api('/customers?q=' + encodeURIComponent(q))
      .then(d => {
        setCustomers(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, q]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCust.name.trim()) {
      setError('Customer name is required');
      return;
    }
    setError('');
    try {
      const created = await api('/customers', { method: 'POST', body: newCust });
      onSelect(created);
      setShowAddForm(false);
      setNewCust({ name: '', phone: '', email: '' });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save customer');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e4f3ea', color: '#0e7047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
            <div>
              <div className="modal-title">Select Customer</div>
              <div style={{ fontSize: 12, color: '#687b6f' }}>Attach to order for loyalty points & credit</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Option: Walk-in (No customer) */}
          <div 
            onClick={() => { onSelect(null); onClose(); }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '10px 14px', 
              borderRadius: 10, 
              border: !currentCustomer ? '2px solid #0e7047' : '1px solid var(--border)', 
              background: !currentCustomer ? '#eef7f2' : '#ffffff',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 99, background: '#e5e9e6', color: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                WI
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Walk-in Customer</div>
                <div style={{ fontSize: 11.5, color: '#667' }}>Standard sale without account tracking</div>
              </div>
            </div>
            {!currentCustomer && <Check size={18} color="#0e7047" strokeWidth={2.5} />}
          </div>

          {/* Search bar & Add button */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#88998d' }} />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={q}
                onChange={e => setQ(e.target.value)}
                style={{ paddingLeft: 34, height: 38 }}
              />
            </div>
            <button
              type="button"
              className={showAddForm ? 'btn-secondary' : 'btn-primary'}
              onClick={() => setShowAddForm(!showAddForm)}
              style={{ height: 38, padding: '0 12px', fontSize: 13 }}
            >
              <UserPlus size={15} />
              <span>{showAddForm ? 'Cancel' : 'New'}</span>
            </button>
          </div>

          {/* New Customer Form */}
          {showAddForm && (
            <form onSubmit={handleCreate} style={{ background: '#f8faf7', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#111a14' }}>Create New Customer</div>
              <input
                placeholder="Full Name *"
                value={newCust.name}
                onChange={e => setNewCust({ ...newCust, name: e.target.value })}
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  placeholder="Phone"
                  value={newCust.phone}
                  onChange={e => setNewCust({ ...newCust, phone: e.target.value })}
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={newCust.email}
                  onChange={e => setNewCust({ ...newCust, email: e.target.value })}
                />
              </div>
              {error && <div style={{ color: '#dc2626', fontSize: 12 }}>{error}</div>}
              <button type="submit" className="btn-primary" style={{ height: 36, fontSize: 13, marginTop: 4 }}>
                Save & Select Customer
              </button>
            </form>
          )}

          {/* Customer list */}
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {customers.map(c => {
              const isSelected = currentCustomer?._id === c._id;
              const initials = c.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div
                  key={c._id}
                  onClick={() => { onSelect(c); onClose(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: isSelected ? '2px solid #0e7047' : '1px solid var(--border)',
                    background: isSelected ? '#edf7f1' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 99, background: '#e3ece4', color: '#0e7047', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: '#687b6f', display: 'flex', gap: 8 }}>
                        {c.phone && <span>📞 {c.phone}</span>}
                        <span>★ {c.points || 0} pts</span>
                        {c.balance > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>Owes {currency} {c.balance.toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check size={18} color="#0e7047" strokeWidth={2.5} />}
                </div>
              );
            })}
            {!loading && !customers.length && !showAddForm && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#889e90', fontSize: 13 }}>
                No customers found matching &quot;{q}&quot;. Click &quot;New&quot; to add one.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

