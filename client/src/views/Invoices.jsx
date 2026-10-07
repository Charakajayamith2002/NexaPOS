import { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Printer, 
  RotateCcw, 
  X, 
  Calendar, 
  User, 
  CreditCard,
  Banknote,
  DollarSign
} from 'lucide-react';
import { api } from '../api.js';
import ReceiptModal from '../components/ReceiptModal.jsx';

export default function Invoices({ cfg, globalSearch = '', user }) {
  const { currency = '$' } = cfg || {};

  const [sales, setSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [refundSale, setRefundSale] = useState(null);

  const loadData = () => {
    api('/sales').then(setSales).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalRevenue = sales.reduce((s, x) => s + (x.total || 0), 0);
  const totalRefunded = sales.reduce((s, x) => s + (x.refunded || 0), 0);
  const netRevenue = totalRevenue - totalRefunded;

  const q = (globalSearch || searchQuery).trim().toLowerCase();
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      return !q ||
        s.invoiceNo?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.cashierName?.toLowerCase().includes(q) ||
        s.paymentMethod?.toLowerCase().includes(q);
    });
  }, [sales, q]);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices &amp; Receipts</h1>
          <p className="page-subtitle">Review sales transactions, reprint tickets, and issue customer returns.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Completed sales</span>
          <span className="kpi-value">{sales.length}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Gross revenue</span>
          <span className="kpi-value">{currency} {totalRevenue.toFixed(2)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Net revenue (after returns)</span>
          <span className="kpi-value" style={{ color: '#0e7047' }}>{currency} {netRevenue.toFixed(2)}</span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="table-toolbar">
        <div className="search-field-pill">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by invoice #, customer, or cashier..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date &amp; Time</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Refunded</th>
              <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                  No completed sales found. Sales completed at the register will appear here.
                </td>
              </tr>
            ) : (
              filteredSales.map(s => {
                const hasRefundAuth = !user || user.role === 'admin' || user.permissions?.canRefund === true || user.role === 'senior_cashier' || user.role === 'supervisor';
                const canReturn = hasRefundAuth && s.items?.some(it => it.qty - (it.returnedQty || 0) > 0);
                return (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.invoiceNo}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, color: '#44544a' }}>
                        {new Date(s.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: 11, color: '#88998e' }}>
                        {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{s.customerName || 'Walk-in'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: '#556a5c' }}>{s.cashierName || 'Staff'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 12.5 }}>
                          {s.paymentMethod || 'Cash'}
                        </span>
                        {s.paymentMethod === 'card' && s.approvalCode && (
                          <span style={{ fontSize: 11, color: '#0e7047', fontWeight: 700 }}>
                            {s.cardType || 'Card'} *{s.last4 || '***'} ({s.approvalCode})
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: 14.5 }}>
                        {currency} {s.total.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      {s.refunded > 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>
                          -{currency} {s.refunded.toFixed(2)}
                        </span>
                      ) : (
                        <span style={{ color: '#889e90' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn-ghost"
                          onClick={() => setSelectedReceipt(s)}
                          style={{ fontSize: 12, padding: '5px 8px', color: '#0e7047' }}
                          title="View receipt"
                        >
                          <Printer size={15} />
                        </button>
                        {canReturn && (
                          <button
                            className="btn-ghost"
                            onClick={() => setRefundSale(s)}
                            style={{ fontSize: 12, padding: '5px 8px', color: '#b45309' }}
                            title="Return items"
                          >
                            <RotateCcw size={15} />
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

      {/* Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          sale={selectedReceipt}
          cfg={cfg}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Return / Refund Modal */}
      {refundSale && (
        <RefundModal
          sale={refundSale}
          currency={currency}
          onClose={() => setRefundSale(null)}
          onDone={() => {
            setRefundSale(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function RefundModal({ sale, currency = '$', onClose, onDone }) {
  const [quantities, setQuantities] = useState({});
  const [refundMethod, setRefundMethod] = useState(sale.paymentMethod || 'cash');
  const [approvalCode, setApprovalCode] = useState('');
  const [last4, setLast4] = useState(sale.last4 || '');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const left = it => it.qty - (it.returnedQty || 0);

  const itemsToReturn = sale.items
    .filter(it => +quantities[it._id] > 0)
    .map(it => ({ itemId: it._id, qty: +quantities[it._id] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (itemsToReturn.length === 0) {
      setErrorMsg('Choose at least one item to return');
      return;
    }

    if (refundMethod === 'card' && !approvalCode.trim()) {
      setErrorMsg('Terminal Refund Approval / Auth Code is required from printed slip.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await api(`/sales/${sale._id}/return`, {
        method: 'POST',
        body: {
          items: itemsToReturn,
          reason,
          refundMethod,
          approvalCode: refundMethod === 'card' ? approvalCode.trim() : undefined,
          last4: refundMethod === 'card' ? last4.trim() : undefined,
        }
      });
      onDone();
    } catch (err) {
      setErrorMsg(err.message || 'Refund processing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title">Return Items — {sale.invoiceNo}</div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ fontSize: 13, color: '#556a5c' }}>
              Select the returned quantity for each line item. Items will be restored to inventory.
            </div>

            {sale.items.map(item => {
              const maxReturn = left(item);
              return (
                <div key={item._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8faf7', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#687b6f' }}>
                      Purchased: {item.qty} · Returnable: {maxReturn}
                    </div>
                  </div>
                  <div style={{ width: 80 }}>
                    <input
                      type="number"
                      min="0"
                      max={maxReturn}
                      disabled={maxReturn <= 0}
                      placeholder="0"
                      value={quantities[item._id] || ''}
                      onChange={e => setQuantities({ ...quantities, [item._id]: e.target.value })}
                      style={{ textAlign: 'center', fontWeight: 700 }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Refund Tender Method Selection */}
            <div style={{ marginTop: 4 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a', marginBottom: 6, display: 'block' }}>
                Refund Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setRefundMethod('card')}
                  style={{
                    padding: '8px 10px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    borderRadius: 8,
                    border: refundMethod === 'card' ? '1.5px solid #0e7047' : '1px solid #cbd5e1',
                    background: refundMethod === 'card' ? '#e4f3ea' : '#ffffff',
                    color: refundMethod === 'card' ? '#0e7047' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Card Terminal Refund
                </button>
                <button
                  type="button"
                  onClick={() => setRefundMethod('cash')}
                  style={{
                    padding: '8px 10px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    borderRadius: 8,
                    border: refundMethod === 'cash' ? '1.5px solid #0e7047' : '1px solid #cbd5e1',
                    background: refundMethod === 'cash' ? '#e4f3ea' : '#ffffff',
                    color: refundMethod === 'cash' ? '#0e7047' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cash Drawer Refund
                </button>
              </div>

              {refundMethod === 'card' ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10, marginTop: 8 }}>
                  <div style={{ fontSize: 11.5, color: '#166534', fontWeight: 600, marginBottom: 8 }}>
                    Perform refund on standalone terminal. Cash drawer float is unaffected.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 6 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 2 }}>
                        Terminal Refund Code *
                      </label>
                      <input
                        placeholder="e.g. APPR-9921"
                        value={approvalCode}
                        onChange={e => setApprovalCode(e.target.value)}
                        style={{ height: 32, fontSize: 12, fontWeight: 700, background: '#ffffff' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 2 }}>
                        Card Last 4
                      </label>
                      <input
                        maxLength={4}
                        placeholder="4242"
                        value={last4}
                        onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={{ height: 32, fontSize: 12, fontWeight: 700, textAlign: 'center', background: '#ffffff' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, padding: '8px 10px', marginTop: 8, fontSize: 11.5, color: '#b45309', fontWeight: 600 }}>
                  Deducts refund amount from physical cash drawer expected float.
                </div>
              )}
            </div>

            <div style={{ marginTop: 4 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Reason for Return</label>
              <input
                placeholder="e.g. Customer return, Defective, Wrong item"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

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
            <button type="submit" className="btn-danger" disabled={itemsToReturn.length === 0 || isSubmitting}>
              {isSubmitting ? 'Refunding...' : 'Confirm Return & Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

