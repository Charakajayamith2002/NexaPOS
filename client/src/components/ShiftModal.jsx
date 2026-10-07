import { useState, useEffect } from 'react';
import { Clock, User, Banknote, CheckCircle2, X, Printer, ArrowRight, Plus } from 'lucide-react';
import { api } from '../api.js';

export default function ShiftModal({ isOpen, onClose, user, currency = '$', onNavigateToShifts }) {
  const [shiftData, setShiftData] = useState(null);
  const [openingFloat, setOpeningFloat] = useState('150.00');
  const [isOpening, setIsOpening] = useState(false);

  const loadCurrentShift = () => {
    api('/shifts/current').then(setShiftData).catch(() => {});
  };

  useEffect(() => {
    if (isOpen) {
      loadCurrentShift();
    }
  }, [isOpen]);

  const handleQuickOpen = async () => {
    setIsOpening(true);
    try {
      await api('/shifts/open', {
        method: 'POST',
        body: { openingFloat: +openingFloat || 0 }
      });
      loadCurrentShift();
    } catch (e) {
      alert(e.message || 'Error opening shift');
    } finally {
      setIsOpening(false);
    }
  };

  if (!isOpen) return null;

  const shift = shiftData?.shift;
  const isShiftOpen = shiftData?.open && shift;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e4f3ea', color: '#0e7047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
            <div>
              <div className="modal-title">Cashier Register Shift</div>
              <div style={{ fontSize: 12, color: '#687b6f' }}>Terminal #1 · Live Drawer Status</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {isShiftOpen ? (
            <>
              {/* Status banner */}
              <div style={{ background: '#f5f8f5', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="pulse-dot" style={{ width: 8, height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Register Open · {shift.shiftNo}</div>
                    <div style={{ fontSize: 12, color: '#687b6f' }}>
                      Started {new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {shift.cashierName}
                    </div>
                  </div>
                </div>
                <span className="status-pill healthy">Active</span>
              </div>

              {/* Drawer Cash Live Metric */}
              <div style={{ background: '#eaf4ee', border: '1px solid #c8e4d2', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0e7047' }}>LIVE EXPECTED CASH IN DRAWER</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#0e7047', marginTop: 2 }}>
                  {currency} {shift.expectedCash?.toFixed(2)}
                </div>
                <div style={{ fontSize: 11.5, color: '#556a5c', marginTop: 4 }}>
                  Starting float: {currency}{shift.openingFloat.toFixed(2)} · Cash sales: +{currency}{shift.cashSales.toFixed(2)}
                  {shift.cashRefunds > 0 && ` · Refunds: -${currency}${shift.cashRefunds.toFixed(2)}`}
                </div>
              </div>

              {/* Metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 12, color: '#687b6f' }}>Total Sales (All Tenders)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#111a14', marginTop: 2 }}>
                    {currency} {shift.totalSales?.toFixed(2)}
                  </div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 12, color: '#687b6f' }}>Transactions Processed</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#111a14', marginTop: 2 }}>
                    {shift.salesCount || 0} orders
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* No Shift Open -> Quick Float Entry */
            <div style={{ textAlign: 'center', padding: '14px 6px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 99, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Banknote size={22} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>No Active Register Shift</h3>
              <p style={{ fontSize: 13, color: '#687b6f', margin: '4px 0 16px' }}>
                Enter opening cash float to begin cashier shift and track drawer reconciliation.
              </p>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Starting cash float"
                  value={openingFloat}
                  onChange={e => setOpeningFloat(e.target.value)}
                  style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', height: 42 }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleQuickOpen}
                  disabled={isOpening}
                  style={{ height: 42, whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} /> Open Shift
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {isShiftOpen && onNavigateToShifts && (
            <button
              className="btn-secondary"
              onClick={() => {
                onClose();
                onNavigateToShifts('shifts');
              }}
              style={{ fontSize: 13 }}
            >
              Reconcile Drawer <ArrowRight size={14} />
            </button>
          )}
          <button className="btn-primary" onClick={onClose} style={{ fontSize: 13 }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
