import { Printer, Check, X, ArrowLeft } from 'lucide-react';

export default function ReceiptModal({ sale, cfg, onClose }) {
  if (!sale) return null;

  const f = n => (n || 0).toFixed(2);
  const cur = cfg?.currency || '$';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e4f3ea', color: '#0e7047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: 16 }}>Sale Completed</div>
              <div style={{ fontSize: 12, color: '#687b6f' }}>{sale.invoiceNo}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ background: '#f5f7f4', padding: '16px 20px' }}>
          {/* Printable Thermal Receipt Box */}
          <div className="receipt-wrapper printable-area">
            <div className="receipt-title">{cfg?.shopName || 'Verdant Supply Co.'}</div>
            {(sale.branchName || cfg?.activeBranchName) && (
              <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#0e7047' }}>
                Store: {sale.branchName || cfg?.activeBranchName} {sale.branchCode ? `(${sale.branchCode})` : ''}
              </div>
            )}
            <div style={{ textAlign: 'center', fontSize: 11, color: '#555', marginBottom: 6 }}>
              {cfg?.businessType ? cfg.businessType.toUpperCase() : 'STORE'} · OFFICIAL RECEIPT
            </div>
            {sale.isOffline && (
              <div style={{ textAlign: 'center', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: 10, margin: '4px 0' }}>
                [ OFFLINE STORED — QUEUED FOR SYNC ]
              </div>
            )}
            <div style={{ textAlign: 'center', fontWeight: 600 }}>Invoice: {sale.invoiceNo}</div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#666' }}>
              {new Date(sale.createdAt || sale.queuedAt || Date.now()).toLocaleString()}
            </div>

            <div className="receipt-divider" />

            <div style={{ fontSize: 11, marginBottom: 4 }}>
              <div><b>Cashier:</b> {sale.cashierName || 'Staff'}</div>
              {sale.customerName && <div><b>Customer:</b> {sale.customerName}</div>}
              {sale.orderType && <div><b>Order Type:</b> {sale.orderType} {sale.tableNo ? `(Table ${sale.tableNo})` : ''}</div>}
              {sale.prescriptionNo && <div><b>Rx No:</b> {sale.prescriptionNo}</div>}
            </div>

            <div className="receipt-divider" />

            {/* Line Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' }}>
              {(sale.items || []).map((it, idx) => (
                <div key={idx} style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{it.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444' }}>
                    <span>{it.qty} × {cur} {f(it.price)}</span>
                    <span style={{ fontWeight: 600 }}>{cur} {f(it.qty * it.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="receipt-divider" />

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
              <div className="receipt-row">
                <span>Subtotal</span>
                <span>{cur} {f(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="receipt-row" style={{ color: '#0e7047' }}>
                  <span>Discount</span>
                  <span>-{cur} {f(sale.discount)}</span>
                </div>
              )}
              {sale.pointsRedeemed > 0 && (
                <div className="receipt-row" style={{ color: '#0e7047' }}>
                  <span>Points Redeemed ({sale.pointsRedeemed})</span>
                  <span>-{cur} {f(sale.pointsValue)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="receipt-row">
                  <span>Tax</span>
                  <span>{cur} {f(sale.tax)}</span>
                </div>
              )}
              
              <div className="receipt-divider" />

              <div className="receipt-row" style={{ fontSize: 15, fontWeight: 800 }}>
                <span>TOTAL</span>
                <span>{cur} {f(sale.total)}</span>
              </div>

              <div className="receipt-row" style={{ marginTop: 4 }}>
                <span>Paid ({sale.paymentMethod?.toUpperCase() || 'CASH'})</span>
                <span>{cur} {f(sale.paid || sale.total)}</span>
              </div>

              {sale.paymentMethod === 'card' && (
                <div style={{ background: '#f8faf7', border: '1px dashed #cbd5e1', borderRadius: 4, padding: '4px 6px', margin: '4px 0', fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Card:</span>
                    <b>{sale.cardType || 'Card'} {sale.last4 ? `**** ${sale.last4}` : ''}</b>
                  </div>
                  {sale.approvalCode && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Slip Auth / Code:</span>
                      <b>{sale.approvalCode}</b>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 10 }}>
                    <span>Terminal Mode:</span>
                    <span>Standalone POS Terminal</span>
                  </div>
                </div>
              )}

              {sale.change > 0 && (
                <div className="receipt-row" style={{ fontWeight: 700, color: '#0e7047' }}>
                  <span>Change Due</span>
                  <span>{cur} {f(sale.change)}</span>
                </div>
              )}

              {sale.pointsEarned > 0 && (
                <div style={{ textAlign: 'center', margin: '6px 0', fontSize: 11, background: '#f0f9f4', padding: 4, borderRadius: 4, color: '#0e7047', fontWeight: 600 }}>
                  + {sale.pointsEarned} loyalty points earned!
                </div>
              )}
            </div>

            <div className="receipt-divider" />

            <div style={{ textAlign: 'center', fontSize: 11, color: '#555', marginTop: 8 }}>
              Thank you for shopping with us!
              <br />
              Please retain receipt for exchanges.
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: 13 }}>
            New Sale
          </button>
          <button className="btn-primary" onClick={() => window.print()} style={{ fontSize: 13 }}>
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

