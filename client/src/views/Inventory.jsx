import { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, 
  Plus, 
  Search, 
  ArrowUpDown, 
  History, 
  X, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { api } from '../api.js';

export default function Inventory({ cfg, globalSearch = '' }) {
  const { currency = '$' } = cfg || {};

  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'low' | 'healthy' | 'out'
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ product: '', change: '', reason: 'Received' });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = () => {
    api('/products')
      .then(data => setProducts(data.filter(p => p.trackStock)))
      .catch(() => {});
    api('/stock/movements')
      .then(setMovements)
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjustForm.product) {
      setErrorMsg('Please select a product');
      return;
    }
    const delta = +adjustForm.change;
    if (!delta || isNaN(delta)) {
      setErrorMsg('Please enter a non-zero adjustment amount (+ or -)');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      await api('/stock/adjust', {
        method: 'POST',
        body: {
          product: adjustForm.product,
          change: delta,
          reason: adjustForm.reason
        }
      });
      setIsAdjustModalOpen(false);
      setAdjustForm({ product: '', change: '', reason: 'Received' });
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to adjust stock');
    } finally {
      setIsSaving(false);
    }
  };

  // KPIs matching Screenshot 2
  const totalUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;
  const stockValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.cost || p.price || 0), 0);

  // Filtered rows
  const q = (globalSearch || searchQuery).trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const isLow = p.stock > 0 && p.stock <= 5;
      const isOut = p.stock <= 0;
      const isHealthy = p.stock > 5;

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'low' && isLow) ||
        (statusFilter === 'healthy' && isHealthy) ||
        (statusFilter === 'out' && isOut);

      const matchesQuery = !q ||
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [products, statusFilter, q]);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">See stock health and recent adjustments.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => setIsHistoryModalOpen(true)}>
            <History size={16} /> Audit History
          </button>
          <button className="btn-primary" onClick={() => { setAdjustForm({ product: '', change: '', reason: 'Received' }); setIsAdjustModalOpen(true); }}>
            <Plus size={16} strokeWidth={2.5} />
            <span>Adjust stock</span>
          </button>
        </div>
      </div>

      {/* KPI Cards matching Screenshot 2 */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Units in stock</span>
          <span className="kpi-value">{totalUnits.toLocaleString()}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Low stock</span>
          <span className="kpi-value" style={{ color: lowStockCount > 0 ? '#b45309' : '#111a14' }}>
            {lowStockCount + outOfStockCount}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Stock value</span>
          <span className="kpi-value">{currency} {stockValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Search Toolbar matching Screenshot 2 */}
      <div className="table-toolbar">
        <div className="search-field-pill">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'all', label: 'All Stock' },
            { id: 'low', label: `Low (${lowStockCount})` },
            { id: 'out', label: `Out (${outOfStockCount})` },
            { id: 'healthy', label: 'Healthy' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              className={statusFilter === f.id ? 'category-chip active' : 'category-chip'}
              onClick={() => setStatusFilter(f.id)}
              style={{ fontSize: 13, padding: '5px 12px' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table matching Screenshot 2 (Record, Detail, Value, Status) */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Record</th>
              <th>Detail</th>
              <th>Value</th>
              <th>Status</th>
              <th style={{ width: 90, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                  No inventory records found.
                </td>
              </tr>
            ) : (
              filteredProducts.map(p => {
                const isOut = p.stock <= 0;
                const isLow = p.stock > 0 && p.stock <= 5;
                const statusLabel = isOut ? 'Out of stock' : isLow ? 'Low stock' : 'Healthy';
                const statusClass = isOut ? 'out-of-stock' : isLow ? 'low-stock' : 'healthy';

                return (
                  <tr key={p._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.name}</div>
                      {p.sku && <div style={{ fontSize: 11.5, color: '#687b6f' }}>SKU: {p.sku}</div>}
                    </td>
                    <td>{p.category || p.brand || 'General Item'}</td>
                    <td style={{ fontWeight: 700, fontSize: 15 }}>{p.stock}</td>
                    <td>
                      <span className={`status-pill ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 12, padding: '5px 10px', color: '#0e7047', fontWeight: 600 }}
                        onClick={() => {
                          setAdjustForm({ product: p._id, change: '', reason: 'Received' });
                          setIsAdjustModalOpen(true);
                        }}
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAdjustModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-title">Adjust Stock Level</div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjust}>
              <div className="modal-body">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Product *</label>
                  <select
                    value={adjustForm.product}
                    onChange={e => setAdjustForm({ ...adjustForm, product: e.target.value })}
                    required
                  >
                    <option value="">Select a product...</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} (Current: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>
                    Quantity Change (+ to add, - to reduce) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. +10 or -2"
                    value={adjustForm.change}
                    onChange={e => setAdjustForm({ ...adjustForm, change: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Reason *</label>
                  <select
                    value={adjustForm.reason}
                    onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  >
                    {['Received', 'Damaged', 'Expired', 'Lost / Stolen', 'Stock count correction', 'Return'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {errorMsg && (
                  <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>
                    {errorMsg}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Audit Modal */}
      {isHistoryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title">Stock Movements Ledger</div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: 420 }}>
              {movements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#889e90' }}>
                  No stock adjustments recorded yet.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Change</th>
                      <th>Balance</th>
                      <th>Reason</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.slice(0, 30).map(m => (
                      <tr key={m._id}>
                        <td style={{ fontSize: 12, color: '#687b6f' }}>
                          {new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        <td style={{ fontWeight: 700, color: m.change > 0 ? '#0e7047' : '#dc2626' }}>
                          {m.change > 0 ? `+${m.change}` : m.change}
                        </td>
                        <td>{m.balance}</td>
                        <td style={{ fontSize: 12.5 }}>{m.reason}</td>
                        <td style={{ fontSize: 12, color: '#687b6f' }}>{m.user || 'Admin'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setIsHistoryModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

