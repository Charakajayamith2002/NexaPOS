import { useState, useEffect } from 'react';
import { 
  Banknote, 
  Plus, 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  DollarSign, 
  FileText, 
  X,
  CreditCard,
  Coins
} from 'lucide-react';
import { api } from '../api.js';

export default function Shifts({ cfg, user }) {
  const { currency = '$' } = cfg || {};

  const [currentShiftData, setCurrentShiftData] = useState(null);
  const [pastShifts, setPastShifts] = useState([]);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [selectedZReportShift, setSelectedZReportShift] = useState(null);

  const loadData = () => {
    api('/shifts/current').then(setCurrentShiftData).catch(() => {});
    api('/shifts').then(d => setPastShifts(Array.isArray(d) ? d : [])).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const shift = currentShiftData?.shift;
  const isShiftOpen = currentShiftData?.open && shift;

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cashier Shifts &amp; Drawer Reconciliation</h1>
          <p className="page-subtitle">Manage opening floats, register drops, and end-of-shift cash drawer balance audits.</p>
        </div>
        <div>
          {!isShiftOpen ? (
            <button className="btn-primary" onClick={() => setIsOpenShiftModalOpen(true)}>
              <Plus size={16} strokeWidth={2.5} />
              <span>Open New Shift / Float</span>
            </button>
          ) : (
            <button className="btn-danger" onClick={() => setIsReconcileModalOpen(true)}>
              <span>Reconcile &amp; Close Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Card */}
      {isShiftOpen ? (
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', marginBottom: 28, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#e4f3ea', color: '#0e7047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Banknote size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800 }}>Active Shift {shift.shiftNo}</h2>
                  <span className="status-pill healthy">Live</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#687b6f', marginTop: 2 }}>
                  Cashier: <b>{shift.cashierName}</b> · Opened {new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(shift.openedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setIsDropModalOpen(true)} style={{ fontSize: 13 }}>
                <ArrowDownRight size={15} style={{ color: '#0e7047' }} /> Cash In / Drop
              </button>
              <button className="btn-primary" onClick={() => setIsReconcileModalOpen(true)} style={{ fontSize: 13 }}>
                <CheckCircle2 size={15} /> End Shift &amp; Balance Drawer
              </button>
            </div>
          </div>

          {/* Financial Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div style={{ background: '#f8faf7', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#687b6f', fontWeight: 600 }}>Starting Cash Float</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111a14', marginTop: 4 }}>
                {currency} {shift.openingFloat.toFixed(2)}
              </div>
            </div>

            <div style={{ background: '#f8faf7', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#687b6f', fontWeight: 600 }}>Cash Sales (Register)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0e7047', marginTop: 4 }}>
                +{currency} {shift.cashSales.toFixed(2)}
              </div>
            </div>

            <div style={{ background: '#f8faf7', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#687b6f', fontWeight: 600 }}>Card Sales (Terminal)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0e7047', marginTop: 4 }}>
                +{currency} {shift.cardSales.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: '#687b6f', marginTop: 2 }}>{shift.cardCount || 0} slip(s)</div>
            </div>

            <div style={{ background: '#f8faf7', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#687b6f', fontWeight: 600 }}>Cash Refunds (Drawer)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: shift.cashRefunds > 0 ? '#dc2626' : '#111a14', marginTop: 4 }}>
                -{currency} {shift.cashRefunds.toFixed(2)}
              </div>
            </div>

            <div style={{ background: '#f8faf7', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#687b6f', fontWeight: 600 }}>Card Refunds (Terminal)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: (shift.cardRefunds || 0) > 0 ? '#dc2626' : '#111a14', marginTop: 4 }}>
                -{currency} {(shift.cardRefunds || 0).toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>Zero drawer impact</div>
            </div>

            <div style={{ background: '#eaf4ee', border: '1px solid #c8e4d2', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#0e7047', fontWeight: 700 }}>LIVE EXPECTED CASH</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0e7047', marginTop: 4 }}>
                {currency} {shift.expectedCash.toFixed(2)}
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>NET CARD SETTLEMENT</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                {currency} {((shift.cardSales || 0) - (shift.cardRefunds || 0)).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Cash Drops List if any */}
          {shift.cashDrops && shift.cashDrops.length > 0 && (
            <div style={{ marginTop: 18, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#556a5c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Cash In &amp; Cash Drops This Shift ({shift.cashDrops.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {shift.cashDrops.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fbfdfa', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`status-pill ${d.type === 'cash_in' ? 'healthy' : 'ordered'}`} style={{ fontSize: 11 }}>
                        {d.type === 'cash_in' ? '+ Cash In' : '- Cash Drop'}
                      </span>
                      <span>{d.reason}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: d.type === 'cash_in' ? '#0e7047' : '#c25e00' }}>
                      {d.type === 'cash_in' ? '+' : '-'}{currency} {d.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px dashed var(--border)', borderRadius: 16, padding: '36px 20px', textAlign: 'center', marginBottom: 28 }}>
          <Clock size={40} style={{ color: '#889e90', margin: '0 auto 10px' }} />
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>No Active Shift Open</h2>
          <p style={{ color: '#687b6f', fontSize: 13.5, maxWidth: 360, margin: '6px auto 16px' }}>
            Open a register shift with starting cash float to begin tracking cash in drawer.
          </p>
          <button className="btn-primary" onClick={() => setIsOpenShiftModalOpen(true)}>
            <Plus size={16} strokeWidth={2.5} />
            <span>Open Shift Now</span>
          </button>
        </div>
      )}

      {/* Historical Shifts Reconciliation Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Past Shift Reconciliations</h2>
          <span style={{ fontSize: 13, color: '#687b6f' }}>{pastShifts.length} shifts recorded</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Shift #</th>
                <th>Cashier</th>
                <th>Time Window</th>
                <th>Float</th>
                <th>Total Sales</th>
                <th>Expected Cash</th>
                <th>Counted Cash</th>
                <th>Over / Short</th>
                <th>Status</th>
                <th style={{ width: 90, textAlign: 'right' }}>Z-Report</th>
              </tr>
            </thead>
            <tbody>
              {pastShifts.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                    No closed shifts recorded yet. Closed shifts with cash drawer reconciliation will appear here.
                  </td>
                </tr>
              ) : (
                pastShifts.map(s => {
                  const isClosed = s.status === 'closed';
                  const statusClass = 
                    s.reconciliationStatus === 'balanced' ? 'healthy' :
                    s.reconciliationStatus === 'over' ? 'active' :
                    s.reconciliationStatus === 'short' ? 'out-of-stock' : 'ordered';

                  const diff = s.difference || 0;

                  return (
                    <tr key={s._id}>
                      <td>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.shiftNo}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.cashierName}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5, color: '#44554b' }}>
                          {new Date(s.openedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: 11, color: '#88998d' }}>
                          {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {s.closedAt ? ` – ${new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Live)'}
                        </div>
                      </td>
                      <td>{currency} {s.openingFloat.toFixed(2)}</td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{currency} {(s.totalSales || 0).toFixed(2)}</span>
                      </td>
                      <td>
                        {isClosed ? `${currency} ${s.closingExpected.toFixed(2)}` : '—'}
                      </td>
                      <td>
                        {isClosed ? <span style={{ fontWeight: 700 }}>{currency} {s.closingActual.toFixed(2)}</span> : '—'}
                      </td>
                      <td>
                        {isClosed ? (
                          <span style={{ 
                            fontWeight: 800, 
                            color: diff === 0 ? '#0e7047' : diff > 0 ? '#0e7047' : '#dc2626' 
                          }}>
                            {diff > 0 ? `+${currency}${diff.toFixed(2)}` : diff < 0 ? `-${currency}${Math.abs(diff).toFixed(2)}` : 'Exact'}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>
                          {s.reconciliationStatus === 'balanced' ? 'Balanced' :
                           s.reconciliationStatus === 'over' ? 'Over' :
                           s.reconciliationStatus === 'short' ? 'Short' : 'In Progress'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isClosed && (
                          <button
                            className="btn-ghost"
                            onClick={() => setSelectedZReportShift(s)}
                            style={{ padding: 6, color: '#0e7047' }}
                            title="Print Z-Report"
                          >
                            <Printer size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Shift Modal */}
      {isOpenShiftModalOpen && (
        <OpenShiftModal
          currency={currency}
          onClose={() => setIsOpenShiftModalOpen(false)}
          onDone={() => {
            setIsOpenShiftModalOpen(false);
            loadData();
          }}
        />
      )}

      {/* Cash In / Drop Modal */}
      {isDropModalOpen && (
        <CashDropModal
          currency={currency}
          onClose={() => setIsDropModalOpen(false)}
          onDone={() => {
            setIsDropModalOpen(false);
            loadData();
          }}
        />
      )}

      {/* Reconcile & Close Shift Modal */}
      {isReconcileModalOpen && shift && (
        <ReconciliationModal
          shift={shift}
          currency={currency}
          onClose={() => setIsReconcileModalOpen(false)}
          onDone={(closedShift) => {
            setIsReconcileModalOpen(false);
            setSelectedZReportShift(closedShift);
            loadData();
          }}
        />
      )}

      {/* Z-Report Thermal Print Modal */}
      {selectedZReportShift && (
        <ZReportModal
          shift={selectedZReportShift}
          cfg={cfg}
          onClose={() => setSelectedZReportShift(null)}
        />
      )}
    </div>
  );
}

// Subcomponent: Open Shift Modal
function OpenShiftModal({ currency = '$', onClose, onDone }) {
  const [openingFloat, setOpeningFloat] = useState('150.00');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = +openingFloat;
    if (isNaN(val) || val < 0) {
      setErrorMsg('Please enter a valid starting cash amount');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await api('/shifts/open', {
        method: 'POST',
        body: { openingFloat: val }
      });
      onDone();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to open shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Open Register Shift</div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ fontSize: 13, color: '#556a5c' }}>
              Enter the starting cash float currently in the drawer to initiate shift accounting.
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#243b2c', marginBottom: 4, display: 'block' }}>
                Opening Cash Float ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                autoFocus
                placeholder="0.00"
                value={openingFloat}
                onChange={e => setOpeningFloat(e.target.value)}
                style={{ fontSize: 18, fontWeight: 800, height: 46 }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {['50.00', '100.00', '150.00', '200.00'].map(amt => (
                <button
                  key={amt}
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOpeningFloat(amt)}
                  style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}
                >
                  {currency}{amt}
                </button>
              ))}
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
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Opening...' : 'Start Shift & Lock Float'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subcomponent: Cash In / Drop Modal
function CashDropModal({ currency = '$', onClose, onDone }) {
  const [type, setType] = useState('cash_out'); // 'cash_out' | 'cash_in'
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = +amount;
    if (!val || val <= 0) {
      setErrorMsg('Please enter a positive amount');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await api('/shifts/drop', {
        method: 'POST',
        body: { type, amount: val, reason }
      });
      onDone();
    } catch (err) {
      setErrorMsg(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div className="modal-title">Cash Drawer Movement</div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Toggle Cash Out (Drop) vs Cash In (Pay in) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className={type === 'cash_out' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setType('cash_out')}
                style={{ height: 38 }}
              >
                <ArrowDownRight size={16} /> Cash Drop (To Safe)
              </button>
              <button
                type="button"
                className={type === 'cash_in' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setType('cash_in')}
                style={{ height: 38 }}
              >
                <ArrowUpRight size={16} /> Cash In (Add Change)
              </button>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#243b2c', marginBottom: 4, display: 'block' }}>
                Amount ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ fontSize: 16, fontWeight: 700 }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>
                Reason / Note
              </label>
              <input
                placeholder={type === 'cash_out' ? 'e.g. Mid-day safe drop, Bank deposit' : 'e.g. Bank change delivery, Additional coins'}
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
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subcomponent: Drawer Reconciliation & Shift Close Modal
function ReconciliationModal({ shift, currency = '$', onClose, onDone }) {
  const [actualCash, setActualCash] = useState('');
  const [actualCard, setActualCard] = useState('');
  const [notes, setNotes] = useState('');
  const [showDenominations, setShowDenominations] = useState(false);
  const [showCardJournal, setShowCardJournal] = useState(false);
  const [cardPayments, setCardPayments] = useState(shift.cardPayments || []);
  const [denominations, setDenominations] = useState({
    100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0, coins: 0
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!shift.cardPayments?.length) {
      api(`/shifts/${shift._id}/card-payments`)
        .then(data => setCardPayments(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [shift._id]);

  const expected = shift.expectedCash || 0;
  const numActual = +actualCash || 0;
  const difference = numActual - expected;
  const isExact = Math.abs(difference) < 0.01;
  const isOver = difference > 0.01;
  const isShort = difference < -0.01;

  // Card reconciliation calculations
  const expectedCard = +(shift.cardSales - (shift.cardRefunds || 0)).toFixed(2);
  const numActualCard = actualCard !== '' ? +actualCard : expectedCard;
  const cardDiff = +(numActualCard - expectedCard).toFixed(2);
  const isCardExact = Math.abs(cardDiff) < 0.01;
  const isCardOver = cardDiff > 0.01;

  // Auto-sum denominations
  const updateDenom = (denom, count) => {
    const updated = { ...denominations, [denom]: Math.max(0, +count || 0) };
    setDenominations(updated);
    const sum = 
      (updated[100] * 100) +
      (updated[50] * 50) +
      (updated[20] * 20) +
      (updated[10] * 10) +
      (updated[5] * 5) +
      (updated[1] * 1) +
      (updated.coins * 1);
    setActualCash(sum.toFixed(2));
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (actualCash === '' || isNaN(numActual)) {
      setErrorMsg('Please enter the counted cash amount in the drawer');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const closed = await api('/shifts/close', {
        method: 'POST',
        body: {
          actualCash: numActual,
          actualCard: numActualCard,
          notes
        }
      });
      onDone(closed);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to close shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div className="modal-title">Close Shift &amp; Balance Register</div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCloseShift}>
          <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
            {/* CASH DRAWER RECONCILIATION */}
            <div style={{ background: '#f5f8f5', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2e4937' }}>Expected Cash in Drawer:</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#111a14' }}>
                  {currency} {expected.toFixed(2)}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#77887e' }}>
                Float ({currency}{shift.openingFloat.toFixed(2)}) + Cash Sales ({currency}{shift.cashSales.toFixed(2)}) - Cash Refunds ({currency}{(shift.cashRefunds || 0).toFixed(2)}) + Cash In/Out ({currency}{(shift.cashIn - shift.cashOut).toFixed(2)})
              </div>
            </div>

            {/* Actual Cash Count Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#243b2c' }}>
                  Physical Cash Counted in Drawer *
                </label>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowDenominations(!showDenominations)}
                  style={{ fontSize: 12, color: '#0e7047', fontWeight: 600, padding: '2px 6px' }}
                >
                  <Coins size={14} /> {showDenominations ? 'Simple Input' : 'Denominations Calculator'}
                </button>
              </div>

              <input
                type="number"
                step="0.01"
                autoFocus
                placeholder="0.00"
                value={actualCash}
                onChange={e => setActualCash(e.target.value)}
                style={{ fontSize: 18, fontWeight: 800, height: 42 }}
                required
              />
            </div>

            {/* Optional Bill/Coin Denomination Matrix */}
            {showDenominations && (
              <div style={{ background: '#fafcf9', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#556a5c', marginBottom: 8 }}>
                  Count by Bill / Coin
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {[100, 50, 20, 10, 5, 1].map(b => (
                    <div key={b}>
                      <span style={{ fontSize: 11, color: '#687b6f' }}>${b}s:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denominations[b] || ''}
                        onChange={e => updateDenom(b, e.target.value)}
                        style={{ height: 32, fontSize: 13, padding: '4px 6px', textAlign: 'center' }}
                      />
                    </div>
                  ))}
                  <div>
                    <span style={{ fontSize: 11, color: '#687b6f' }}>Coins $:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={denominations.coins || ''}
                      onChange={e => updateDenom('coins', e.target.value)}
                      style={{ height: 32, fontSize: 13, padding: '4px 6px', textAlign: 'center' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cash Over / Short Live Diff Indicator */}
            {actualCash !== '' && (
              <div style={{
                background: isExact ? '#e4f3ea' : isOver ? '#e4f3ea' : '#fef2f2',
                border: `1px solid ${isExact ? '#a3d9b5' : isOver ? '#a3d9b5' : '#fecaca'}`,
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isExact ? <CheckCircle2 size={18} color="#0e7047" /> : <AlertTriangle size={18} color={isOver ? '#0e7047' : '#dc2626'} />}
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    Cash Drawer: {isExact ? 'Balanced' : isOver ? 'Over' : 'Short'}
                  </span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: isExact || isOver ? '#0e7047' : '#dc2626' }}>
                  {difference > 0 ? `+${currency}${difference.toFixed(2)}` : `${currency}${difference.toFixed(2)}`}
                </span>
              </div>
            )}

            {/* CARD TERMINAL SETTLEMENT RECONCILIATION */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                    Net POS Card Expected:
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>
                    {currency} {expectedCard.toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: '#374151' }}>
                  POS Card Sales ({currency}{shift.cardSales.toFixed(2)}) - Terminal Refunds ({currency}{(shift.cardRefunds || 0).toFixed(2)}) across {shift.cardCount || cardPayments.length} slip(s)
                </div>
              </div>

              {/* Terminal Settlement Slip Total Entry */}
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#243b2c' }}>
                    Terminal Batch Settlement Slip Total ({currency})
                  </label>
                  {cardPayments.length > 0 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setShowCardJournal(!showCardJournal)}
                      style={{ fontSize: 12, color: '#0e7047', fontWeight: 600, padding: '2px 6px' }}
                    >
                      <FileText size={14} /> {showCardJournal ? 'Hide Slip Journal' : `View Slips (${cardPayments.length})`}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder={expectedCard > 0 ? expectedCard.toFixed(2) : '0.00'}
                  value={actualCard}
                  onChange={e => setActualCard(e.target.value)}
                  style={{ fontSize: 18, fontWeight: 800, height: 42 }}
                />
                <div style={{ fontSize: 11, color: '#687b6f', marginTop: 3 }}>
                  Compare with the Settlement / Batch Total printed by the physical card terminal.
                </div>
              </div>

              {/* Card Variance Indicator */}
              {actualCard !== '' && (
                <div style={{
                  background: isCardExact ? '#e4f3ea' : isCardOver ? '#e4f3ea' : '#fef2f2',
                  border: `1px solid ${isCardExact ? '#a3d9b5' : isCardOver ? '#a3d9b5' : '#fecaca'}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isCardExact ? <CheckCircle2 size={18} color="#0e7047" /> : <AlertTriangle size={18} color={isCardOver ? '#0e7047' : '#dc2626'} />}
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      Card Terminal Batch: {isCardExact ? 'Balanced' : isCardOver ? 'Over' : 'Short'}
                    </span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: isCardExact || isCardOver ? '#0e7047' : '#dc2626' }}>
                    {cardDiff > 0 ? `+${currency}${cardDiff.toFixed(2)}` : `${currency}${cardDiff.toFixed(2)}`}
                  </span>
                </div>
              )}

              {/* Shift Card Payments Slip Journal */}
              {showCardJournal && cardPayments.length > 0 && (
                <div style={{ marginTop: 10, background: '#fafcf9', border: '1px solid var(--border)', borderRadius: 10, padding: 10, maxHeight: 180, overflowY: 'auto' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#33443a', marginBottom: 6 }}>
                    Recorded Card Slips in this Shift:
                  </div>
                  <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#687b6f', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '4px 6px' }}>Invoice</th>
                        <th style={{ padding: '4px 6px' }}>Card / Last 4</th>
                        <th style={{ padding: '4px 6px' }}>Approval Code</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cardPayments.map(p => (
                        <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 6px', fontWeight: 600 }}>{p.invoiceNo}</td>
                          <td style={{ padding: '4px 6px' }}>{p.cardType || 'Card'} *{p.last4 || '***'}</td>
                          <td style={{ padding: '4px 6px', fontFamily: 'monospace', fontWeight: 700, color: '#0e7047' }}>{p.approvalCode}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: p.amount < 0 ? '#dc2626' : '#111a14' }}>
                            {currency} {p.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>
                Closing Notes &amp; Discrepancy Explanation
              </label>
              <textarea
                rows={2}
                placeholder="Reason for any cash or card variance, notes for store manager..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
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
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Closing & Generating Z-Report...' : 'Confirm Reconciliation & Close Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subcomponent: Z-Report Thermal Modal
function ZReportModal({ shift, cfg, onClose }) {
  if (!shift) return null;
  const cur = cfg?.currency || '$';
  const f = n => (n || 0).toFixed(2);
  const diff = shift.difference || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 390 }}>
        <div className="modal-header no-print">
          <div className="modal-title">Official Shift Z-Report</div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ background: '#f5f7f4', padding: '16px 20px' }}>
          <div className="receipt-wrapper printable-area">
            <div className="receipt-title">{cfg?.shopName || 'Verdant Supply Co.'}</div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#555' }}>
              DAILY REGISTER Z-REPORT (AUDIT CLOSE)
            </div>
            <div style={{ textAlign: 'center', fontWeight: 700, margin: '4px 0' }}>
              Shift ID: {shift.shiftNo}
            </div>

            <div className="receipt-divider" />

            <div style={{ fontSize: 11 }}>
              <div><b>Cashier:</b> {shift.cashierName}</div>
              <div><b>Opened:</b> {new Date(shift.openedAt).toLocaleString()}</div>
              <div><b>Closed:</b> {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : 'In Progress'}</div>
              <div><b>Orders Count:</b> {shift.salesCount || 0} sales</div>
            </div>

            <div className="receipt-divider" />

            {/* Sales Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
              <div className="receipt-row">
                <span>Cash Sales</span>
                <span>{cur} {f(shift.cashSales)}</span>
              </div>
              <div className="receipt-row">
                <span>Card Sales</span>
                <span>{cur} {f(shift.cardSales)}</span>
              </div>
              {shift.creditSales > 0 && (
                <div className="receipt-row">
                  <span>Store Credit Sales</span>
                  <span>{cur} {f(shift.creditSales)}</span>
                </div>
              )}
              {shift.cashRefunds > 0 && (
                <div className="receipt-row" style={{ color: '#dc2626' }}>
                  <span>Cash Refunds</span>
                  <span>-{cur} {f(shift.cashRefunds)}</span>
                </div>
              )}
              <div className="receipt-row" style={{ fontWeight: 800 }}>
                <span>TOTAL REVENUE</span>
                <span>{cur} {f(shift.totalSales)}</span>
              </div>
            </div>

            <div className="receipt-divider" />

            {/* Drawer Cash Reconciliation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>CASH DRAWER RECONCILIATION:</div>
              <div className="receipt-row">
                <span>Starting Cash Float</span>
                <span>{cur} {f(shift.openingFloat)}</span>
              </div>
              <div className="receipt-row">
                <span>+ Cash Sales</span>
                <span>+{cur} {f(shift.cashSales)}</span>
              </div>
              {shift.cashIn > 0 && (
                <div className="receipt-row">
                  <span>+ Cash Drops (In)</span>
                  <span>+{cur} {f(shift.cashIn)}</span>
                </div>
              )}
              {shift.cashRefunds > 0 && (
                <div className="receipt-row">
                  <span>- Cash Refunds</span>
                  <span>-{cur} {f(shift.cashRefunds)}</span>
                </div>
              )}
              {shift.cashOut > 0 && (
                <div className="receipt-row">
                  <span>- Cash Drops (Out)</span>
                  <span>-{cur} {f(shift.cashOut)}</span>
                </div>
              )}

              <div className="receipt-divider" />

              <div className="receipt-row" style={{ fontWeight: 700 }}>
                <span>EXPECTED IN DRAWER</span>
                <span>{cur} {f(shift.closingExpected)}</span>
              </div>
              <div className="receipt-row" style={{ fontWeight: 800 }}>
                <span>ACTUAL COUNTED CASH</span>
                <span>{cur} {f(shift.closingActual)}</span>
              </div>

              <div className="receipt-row" style={{ fontWeight: 800, marginTop: 4, color: diff === 0 ? '#0e7047' : diff > 0 ? '#0e7047' : '#dc2626' }}>
                <span>VARIANCE (OVER/SHORT)</span>
                <span>{diff > 0 ? `+${cur}${f(diff)}` : `${cur}${f(diff)}`}</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                STATUS: {shift.reconciliationStatus?.toUpperCase() || 'BALANCED'}
              </div>

              {shift.closingNotes && (
                <div style={{ fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
                  Notes: {shift.closingNotes}
                </div>
              )}
            </div>

            <div className="receipt-divider" />

            {/* Card Terminal Settlement Reconciliation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>CARD TERMINAL SETTLEMENT:</div>
              <div className="receipt-row">
                <span>POS Card Sales ({shift.cardCount || 0} slips)</span>
                <span>{cur} {f(shift.cardSales)}</span>
              </div>
              {shift.cardRefunds > 0 && (
                <div className="receipt-row" style={{ color: '#dc2626' }}>
                  <span>- Card Terminal Refunds</span>
                  <span>-{cur} {f(shift.cardRefunds)}</span>
                </div>
              )}
              <div className="receipt-row" style={{ fontWeight: 700 }}>
                <span>NET POS CARD TOTAL</span>
                <span>{cur} {f((shift.cardSales || 0) - (shift.cardRefunds || 0))}</span>
              </div>
              <div className="receipt-row" style={{ fontWeight: 800 }}>
                <span>TERMINAL SETTLEMENT COUNT</span>
                <span>{cur} {f(shift.cardTerminalActual !== undefined ? shift.cardTerminalActual : ((shift.cardSales || 0) - (shift.cardRefunds || 0)))}</span>
              </div>
              <div className="receipt-row" style={{ fontWeight: 800, marginTop: 2, color: (shift.cardDifference || 0) === 0 ? '#0e7047' : '#dc2626' }}>
                <span>TERMINAL VARIANCE</span>
                <span>{(shift.cardDifference || 0) > 0 ? `+${cur}${f(shift.cardDifference)}` : `${cur}${f(shift.cardDifference || 0)}`}</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                SETTLEMENT: {(shift.cardReconciliationStatus || 'BALANCED').toUpperCase()}
              </div>
            </div>

            <div className="receipt-divider" />

            <div style={{ fontSize: 11, marginTop: 12 }}>
              <div>Manager Signature: __________________</div>
              <div style={{ marginTop: 8 }}>Cashier Signature: __________________</div>
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Print Z-Report
          </button>
        </div>
      </div>
    </div>
  );
}
