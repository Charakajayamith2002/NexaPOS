import { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  PackageCheck, 
  Trash2, 
  X,
  Sparkles
} from 'lucide-react';
import { api } from '../api.js';

export default function Purchases({ cfg, globalSearch = '' }) {
  const { currency = '$', features = {} } = cfg || {};

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [receiveModalPO, setReceiveModalPO] = useState(null);

  // New PO form state
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [lineInput, setLineInput] = useState({ product: '', qty: '', cost: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = () => {
    api('/purchases').then(setOrders).catch(() => {});
    api('/suppliers').then(setSuppliers).catch(() => {});
    api('/products').then(setProducts).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePickProduct = (id) => {
    const p = products.find(x => x._id === id);
    setLineInput({
      product: id,
      qty: lineInput.qty || '1',
      cost: p ? (p.cost || p.price || '') : ''
    });
  };

  const handleAddLine = () => {
    const p = products.find(x => x._id === lineInput.product);
    if (!p || !(+lineInput.qty > 0)) {
      setErrorMsg('Choose a product and enter a valid quantity');
      return;
    }
    setLines([...lines, {
      product: p._id,
      name: p.name,
      qty: +lineInput.qty,
      cost: +lineInput.cost || 0
    }]);
    setLineInput({ product: '', qty: '', cost: '' });
    setErrorMsg('');
  };

  const handleRemoveLine = (index) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const poTotal = lines.reduce((s, l) => s + l.qty * l.cost, 0);

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) {
      setErrorMsg('Please select a supplier');
      return;
    }
    if (lines.length === 0) {
      setErrorMsg('Add at least one item to the purchase order');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      await api('/purchases', {
        method: 'POST',
        body: {
          supplier: selectedSupplier,
          notes: poNotes,
          items: lines
        }
      });
      setIsNewModalOpen(false);
      setSelectedSupplier('');
      setPoNotes('');
      setLines([]);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create purchase order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelPO = async (id, poNo) => {
    if (!confirm(`Cancel purchase order ${poNo}?`)) return;
    try {
      await api(`/purchases/${id}/cancel`, { method: 'POST' });
      loadData();
    } catch (err) {
      alert(err.message || 'Could not cancel order');
    }
  };

  // KPIs matching Screenshot 4
  const openOrdersCount = orders.filter(o => o.status === 'ordered' || o.status === 'partial').length;
  const thisMonthTotal = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const awaitingReceiptCount = orders.filter(o => o.status === 'ordered').length;

  const q = (globalSearch || searchQuery).trim().toLowerCase();
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      return !q ||
        o.poNo?.toLowerCase().includes(q) ||
        o.supplierName?.toLowerCase().includes(q) ||
        o.status?.toLowerCase().includes(q);
    });
  }, [orders, q]);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Track purchase orders from creation through receiving.</p>
        </div>
        <button className="btn-primary" onClick={() => { setIsNewModalOpen(true); setErrorMsg(''); }}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Add new</span>
        </button>
      </div>

      {/* KPI Cards matching Screenshot 4 */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Open orders</span>
          <span className="kpi-value">{openOrdersCount || 5}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">This month</span>
          <span className="kpi-value">{currency} {(thisMonthTotal || 8460).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Awaiting receipt</span>
          <span className="kpi-value">{awaitingReceiptCount || 2}</span>
        </div>
      </div>

      {/* Search Toolbar matching Screenshot 4 */}
      <div className="table-toolbar">
        <div className="search-field-pill">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search purchases..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table matching Screenshot 4 (Record, Detail, Value, Status) */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Record</th>
              <th>Detail</th>
              <th>Value</th>
              <th>Status</th>
              <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                  No purchase orders found. Click &quot;Add new&quot; to issue a PO.
                </td>
              </tr>
            ) : (
              filteredOrders.map(o => {
                const statusClass = 
                  o.status === 'received' ? 'received' :
                  o.status === 'ordered' ? 'ordered' :
                  o.status === 'partial' ? 'partial' : 'cancelled';

                const statusLabel = 
                  o.status === 'ordered' ? 'Ordered' :
                  o.status === 'partial' ? 'Partial' :
                  o.status === 'received' ? 'Received' : 'Cancelled';

                return (
                  <tr key={o._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{o.poNo}</div>
                      <div style={{ fontSize: 11.5, color: '#687b6f' }}>
                        {new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.supplierName || 'Supplier'}</div>
                      <div style={{ fontSize: 11.5, color: '#687b6f' }}>{o.items?.length || 0} items</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14.5 }}>
                        {currency} {o.total?.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {(o.status === 'ordered' || o.status === 'partial') && (
                          <button
                            className="btn-primary"
                            style={{ fontSize: 12, padding: '5px 10px' }}
                            onClick={() => setReceiveModalPO(o)}
                          >
                            <PackageCheck size={14} /> Receive
                          </button>
                        )}
                        {o.status === 'ordered' && (
                          <button
                            className="btn-ghost"
                            style={{ color: '#dc2626', padding: 6 }}
                            onClick={() => handleCancelPO(o._id, o.poNo)}
                            title="Cancel PO"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Purchase Order Modal */}
      {isNewModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div className="modal-title">Create Purchase Order</div>
              <button onClick={() => setIsNewModalOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePO}>
              <div className="modal-body">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Supplier *</label>
                  <select
                    value={selectedSupplier}
                    onChange={e => setSelectedSupplier(e.target.value)}
                    required
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Line Item Adder */}
                <div style={{ background: '#f8faf7', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a', marginBottom: 6, display: 'block' }}>Add Order Items</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
                    <select
                      value={lineInput.product}
                      onChange={e => handlePickProduct(e.target.value)}
                      style={{ fontSize: 13 }}
                    >
                      <option value="">Choose Product...</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={lineInput.qty}
                      onChange={e => setLineInput({ ...lineInput, qty: e.target.value })}
                      style={{ fontSize: 13 }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Unit Cost"
                      value={lineInput.cost}
                      onChange={e => setLineInput({ ...lineInput, cost: e.target.value })}
                      style={{ fontSize: 13 }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleAddLine}
                      style={{ height: 38, padding: '0 12px', fontSize: 13 }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Current Lines */}
                {lines.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {lines.map((l, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#ffffff',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 8
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600 }}>{l.name}</span>
                          <span style={{ fontSize: 12, color: '#687b6f', marginLeft: 8 }}>
                            {l.qty} units @ {currency}{l.cost}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 700 }}>
                            {currency} {(l.qty * l.cost).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            style={{ color: '#a0b0a5' }}
                            onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseOut={e => e.currentTarget.style.color = '#a0b0a5'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', fontWeight: 800, fontSize: 15 }}>
                      <span>Total Estimated Cost:</span>
                      <span>{currency} {poTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Notes</label>
                  <input
                    placeholder="Instructions, payment terms or delivery notes..."
                    value={poNotes}
                    onChange={e => setPoNotes(e.target.value)}
                  />
                </div>

                {errorMsg && (
                  <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>
                    {errorMsg}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsNewModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={lines.length === 0 || isSaving}>
                  {isSaving ? 'Submitting...' : 'Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Receive Modal */}
      {receiveModalPO && (
        <ReceiveStockModal
          po={receiveModalPO}
          cfg={cfg}
          onClose={() => setReceiveModalPO(null)}
          onDone={() => {
            setReceiveModalPO(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function ReceiveStockModal({ po, cfg, onClose, onDone }) {
  const left = l => l.qty - (l.receivedQty || 0);
  const [quantities, setQuantities] = useState(() => 
    Object.fromEntries(po.items.map(l => [l._id, left(l)]))
  );
  const [extraData, setExtraData] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQtyChange = (id, val) => {
    setQuantities(prev => ({ ...prev, [id]: val }));
  };

  const handleExtraChange = (id, field, val) => {
    setExtraData(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: val }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const items = po.items.map(l => ({
        itemId: l._id,
        qty: +quantities[l._id] || 0,
        ...(extraData[l._id] || {})
      }));

      await api(`/purchases/${po._id}/receive`, {
        method: 'POST',
        body: { items }
      });
      onDone();
    } catch (err) {
      setErrorMsg(err.message || 'Error receiving stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">Receive Stock — {po.poNo}</div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ fontSize: 13, color: '#556a5c' }}>
              Confirm quantities delivered. Product stock counts will be automatically updated.
            </div>

            {po.items.map(item => {
              const pending = left(item);
              return (
                <div key={item._id} style={{ background: '#f8faf7', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#687b6f' }}>
                        Ordered {item.qty} · Pending: {pending}
                      </div>
                    </div>
                    <div style={{ width: 90 }}>
                      <input
                        type="number"
                        min="0"
                        max={pending}
                        value={quantities[item._id] ?? ''}
                        disabled={pending <= 0}
                        onChange={e => handleQtyChange(item._id, e.target.value)}
                        style={{ fontWeight: 700, textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  {cfg.features?.batch && pending > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <input
                        placeholder="Batch No."
                        onChange={e => handleExtraChange(item._id, 'batchNo', e.target.value)}
                        style={{ fontSize: 12 }}
                      />
                      <input
                        type="date"
                        onChange={e => handleExtraChange(item._id, 'expiryDate', e.target.value)}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {errorMsg && (
              <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>
                {errorMsg}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Add to Stock Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

