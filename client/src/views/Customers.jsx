import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  FileText, 
  DollarSign, 
  Award, 
  Phone, 
  Mail, 
  X, 
  Edit2, 
  Trash2,
  Printer
} from 'lucide-react';
import { api } from '../api.js';
import ReceiptModal from '../components/ReceiptModal.jsx';

export default function Customers({ cfg, globalSearch = '' }) {
  const { currency = '$' } = cfg || {};

  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [activeStatementId, setActiveStatementId] = useState(null);

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = () => {
    api('/customers?limit=200').then(setCustomers).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingCustomer(null);
    setForm({ name: '', phone: '', email: '', address: '' });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setForm({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('Customer name is required');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      if (editingCustomer) {
        await api(`/customers/${editingCustomer._id}`, { method: 'PUT', body: form });
      } else {
        await api('/customers', { method: 'POST', body: form });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Error saving customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete customer "${name}"?`)) return;
    try {
      await api(`/customers/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message || 'Cannot delete customer');
    }
  };

  // KPIs
  const totalCustomers = customers.length;
  const totalReceivables = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);

  const q = (globalSearch || searchQuery).trim().toLowerCase();
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      return !q ||
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q);
    });
  }, [customers, q]);

  if (activeStatementId) {
    return (
      <CustomerStatementView
        id={activeStatementId}
        cfg={cfg}
        onBack={() => {
          setActiveStatementId(null);
          loadData();
        }}
      />
    );
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers &amp; Members</h1>
          <p className="page-subtitle">Track customer balances, store credit, and loyalty points.</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Add new</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total customers</span>
          <span className="kpi-value">{totalCustomers}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Outstanding balance (credit)</span>
          <span className="kpi-value" style={{ color: totalReceivables > 0 ? '#b45309' : '#111a14' }}>
            {currency} {totalReceivables.toFixed(2)}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Loyalty points outstanding</span>
          <span className="kpi-value" style={{ color: '#0e7047' }}>
            {totalPoints.toLocaleString()} pts
          </span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="table-toolbar">
        <div className="search-field-pill">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search customers by name, phone or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Contact Info</th>
              <th>Points</th>
              <th>Balance Owed</th>
              <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                  No customer records found. Click &quot;Add new&quot; to register a member.
                </td>
              </tr>
            ) : (
              filteredCustomers.map(c => {
                const initials = c.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="customer-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{c.name}</div>
                          {c.address && <div style={{ fontSize: 11.5, color: '#687b6f' }}>{c.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{c.phone || '—'}</div>
                      {c.email && <div style={{ fontSize: 11.5, color: '#687b6f' }}>{c.email}</div>}
                    </td>
                    <td>
                      <span className="status-pill active" style={{ fontSize: 12.5 }}>
                        ★ {c.points || 0} pts
                      </span>
                    </td>
                    <td>
                      {c.balance > 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>
                          {currency} {c.balance.toFixed(2)}
                        </span>
                      ) : (
                        <span style={{ color: '#0e7047', fontWeight: 600 }}>Paid in full</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn-ghost"
                          onClick={() => setActiveStatementId(c._id)}
                          style={{ fontSize: 12, padding: '5px 8px', color: '#0e7047' }}
                          title="View statement"
                        >
                          <FileText size={15} /> Statement
                        </button>
                        <button className="btn-ghost" onClick={() => openEditModal(c)} style={{ padding: 6 }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-ghost" onClick={() => handleDelete(c._id, c.name)} style={{ padding: 6, color: '#dc2626' }}>
                          <Trash2 size={14} />
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

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Full Name *</label>
                  <input
                    placeholder="e.g. Dana Reyes"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Phone Number</label>
                  <input
                    placeholder="+1 (555) 234-5678"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="dana.reyes@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Street Address</label>
                  <input
                    placeholder="City, State, Zip..."
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
                  {isSaving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerStatementView({ id, cfg, onBack }) {
  const { currency = '$' } = cfg || {};
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('purchases');
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [receiptSale, setReceiptSale] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadStatement = () => {
    api(`/customers/${id}/statement`).then(setData).catch(() => {});
  };

  useEffect(() => {
    loadStatement();
  }, [id]);

  if (!data) return null;
  const { customer, sales, txns } = data;

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!(+payAmount > 0)) {
      setErrorMsg('Please enter a valid payment amount');
      return;
    }
    setErrorMsg('');
    try {
      await api(`/customers/${id}/payment`, {
        method: 'POST',
        body: { amount: +payAmount, note: payNote }
      });
      setPayAmount('');
      setPayNote('');
      loadStatement();
    } catch (err) {
      setErrorMsg(err.message || 'Payment recording failed');
    }
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      {receiptSale && (
        <ReceiptModal
          sale={receiptSale}
          cfg={cfg}
          onClose={() => setReceiptSale(null)}
        />
      )}

      {/* Top back & print actions */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Customers
        </button>
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Print Customer Statement
        </button>
      </div>

      {/* Customer profile card */}
      <div className="printable-area" style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{customer.name}</h2>
            <div style={{ color: '#556a5c', fontSize: 13.5, marginTop: 4 }}>
              {customer.phone && <span>📞 {customer.phone} · </span>}
              {customer.email && <span>✉️ {customer.email} · </span>}
              {customer.address && <span>📍 {customer.address}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#687b6f' }}>Amount Owed</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: customer.balance > 0 ? '#dc2626' : '#0e7047' }}>
                {currency} {(customer.balance || 0).toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#687b6f' }}>Loyalty Points</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0e7047' }}>
                {customer.points || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Form (if balance owed) */}
      {customer.balance > 0 && (
        <div className="no-print" style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Receive Payment for Balance Owed</h3>
          <form onSubmit={handleRecordPayment} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="number"
              step="0.01"
              placeholder={`Amount (Owed: ${currency}${customer.balance.toFixed(2)})`}
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              style={{ width: 220 }}
              required
            />
            <input
              placeholder="Payment note / Reference (optional)"
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <button type="submit" className="btn-primary">
              Record Payment
            </button>
          </form>
          {errorMsg && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{errorMsg}</div>}
        </div>
      )}

      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className={tab === 'purchases' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('purchases')}
        >
          Purchase History
        </button>
        <button
          className={tab === 'txns' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('txns')}
        >
          Account Ledger Statement
        </button>
      </div>

      {/* Tab 1: Sales */}
      {tab === 'purchases' ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment Method</th>
                <th style={{ width: 90, textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#889e90' }}>
                    No purchase transactions recorded yet.
                  </td>
                </tr>
              ) : (
                sales.map(s => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 700 }}>{s.invoiceNo}</td>
                    <td>{new Date(s.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td style={{ fontWeight: 700 }}>{currency} {s.total.toFixed(2)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.paymentMethod}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-ghost" onClick={() => setReceiptSale(s)} style={{ padding: 6, color: '#0e7047' }}>
                        <Printer size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Tab 2: Ledger */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Sale Amount</th>
                <th>Owed Change</th>
                <th>Points</th>
                <th>Ending Balance</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 24, color: '#889e90' }}>
                    No ledger transactions recorded yet.
                  </td>
                </tr>
              ) : (
                txns.map(t => (
                  <tr key={t._id}>
                    <td>{new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{t.type}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{t.ref}</td>
                    <td>{t.total != null ? `${currency} ${t.total.toFixed(2)}` : '—'}</td>
                    <td style={{ color: t.amount > 0 ? '#dc2626' : '#0e7047', fontWeight: 600 }}>
                      {t.amount ? `${t.amount > 0 ? '+' : ''}${currency} ${t.amount.toFixed(2)}` : '—'}
                    </td>
                    <td>{t.points || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{currency} {(t.balanceAfter || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

