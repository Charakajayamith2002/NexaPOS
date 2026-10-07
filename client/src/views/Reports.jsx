import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Percent, 
  CreditCard, 
  Users,
  Filter
} from 'lucide-react';
import { api } from '../api.js';

const fm = n => (n || 0).toFixed(2);
const ymd = d => {
  const x = new Date(d);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
};
const daysAgo = n => ymd(Date.now() - n * 864e5);

const downloadCsv = (file, cols, rows) => {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const text = [
    cols.map(c => q(c[0])).join(','),
    ...rows.map(r => cols.map(c => q(typeof c[1] === 'function' ? c[1](r) : r[c[1]])).join(','))
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = file + '.csv';
  a.click();
};

export default function Reports({ cfg }) {
  const { currency = '$' } = cfg || {};
  // Default to 7 Days for quick, compact loading
  const [range, setRange] = useState({ from: daysAgo(6), to: ymd(Date.now()) });
  const [activePreset, setActivePreset] = useState(6);
  const [onlyActiveDays, setOnlyActiveDays] = useState(false);
  const [tab, setTab] = useState('sales');
  const [data, setData] = useState(null);
  const [invData, setInvData] = useState(null);
  const [cardPaymentsData, setCardPaymentsData] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setErrorMsg('');
    api(`/reports/summary?from=${range.from}&to=${range.to}`)
      .then(setData)
      .catch(e => setErrorMsg(e.message));
  }, [range]);

  useEffect(() => {
    if (tab === 'inventory') {
      api('/reports/inventory').then(setInvData).catch(() => {});
    } else if (tab === 'payments') {
      api(`/payments?method=card&from=${range.from}&to=${range.to}`).then(setCardPaymentsData).catch(() => {});
    }
  }, [tab, range]);

  const totals = data?.totals || {};

  // Sort daily breakdown: Current date (Today) FIRST, older dates at the bottom
  const sortedDaily = useMemo(() => {
    if (!data?.daily) return [];
    const list = [...data.daily].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (onlyActiveDays) {
      return list.filter(d => (d.orders || 0) > 0 || (d.revenue || 0) > 0);
    }
    return list;
  }, [data?.daily, onlyActiveDays]);

  const tabs = [
    { id: 'sales', label: 'Sales Overview' },
    { id: 'profit', label: 'Profit & Margins' },
    { id: 'inventory', label: 'Inventory Valuation' },
    { id: 'payments', label: 'Payment Methods' },
    { id: 'employees', label: 'Staff Performance' },
    { id: 'customers', label: 'Top Customers' }
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics &amp; Reports</h1>
          <p className="page-subtitle">Business intelligence, performance charts, and accounting exports.</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18, background: '#ffffff', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'Today', n: 0 },
            { label: '7 Days', n: 6 },
            { label: '30 Days', n: 29 },
            { label: '90 Days', n: 89 }
          ].map(b => {
            const isActive = activePreset === b.n;
            return (
              <button
                key={b.label}
                className={isActive ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: 13, padding: '6px 12px' }}
                onClick={() => {
                  setActivePreset(b.n);
                  setRange({ from: daysAgo(b.n), to: ymd(Date.now()) });
                }}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <span style={{ fontSize: 13, color: '#687b6f' }}>From:</span>
          <input
            type="date"
            value={range.from}
            onChange={e => {
              setActivePreset(null);
              setRange({ ...range, from: e.target.value });
            }}
            style={{ width: 145, height: 34, padding: '4px 8px', fontSize: 13 }}
          />
          <span style={{ fontSize: 13, color: '#687b6f' }}>To:</span>
          <input
            type="date"
            value={range.to}
            onChange={e => {
              setActivePreset(null);
              setRange({ ...range, to: e.target.value });
            }}
            style={{ width: 145, height: 34, padding: '4px 8px', fontSize: 13 }}
          />
        </div>
      </div>

      {/* Report Categories Tabs */}
      <div className="category-chips-bar hide-scrollbar" style={{ marginBottom: 18 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`category-chip ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div style={{ color: '#dc2626', background: '#fef2f2', padding: 12, borderRadius: 10, marginBottom: 16 }}>
          {errorMsg}
        </div>
      )}

      {/* TAB 1: Sales Overview */}
      {data && tab === 'sales' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Orders</span>
              <span className="kpi-value">{totals.orders || 0}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Net Sales</span>
              <span className="kpi-value" style={{ color: '#0e7047' }}>{currency} {fm(totals.net)}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Discounts &amp; Points</span>
              <span className="kpi-value">{currency} {fm(totals.discounts)}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Refunds</span>
              <span className="kpi-value" style={{ color: totals.refunds > 0 ? '#dc2626' : 'inherit' }}>
                {currency} {fm(totals.refunds)}
              </span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Daily Revenue Trend</h3>
              <span style={{ fontSize: 12, color: '#687b6f' }}>Chronological daily timeline</span>
            </div>
            <ModernBarChart data={data.daily} field="revenue" currency={currency} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Daily Sales Breakdown (Current Date First)</h3>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#44564b', cursor: 'pointer', background: '#ffffff', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  checked={onlyActiveDays}
                  onChange={e => setOnlyActiveDays(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: 'var(--brand)', cursor: 'pointer' }}
                />
                <span>Hide zero-sales days</span>
              </label>
            </div>
            <button
              className="btn-secondary"
              onClick={() => downloadCsv('daily-sales', [['Date', 'date'], ['Orders', 'orders'], ['Revenue', r => fm(r.revenue)], ['Profit', r => fm(r.profit)]], sortedDaily)}
              style={{ fontSize: 12.5, padding: '5px 12px' }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#ffffff' }}>
                <tr>
                  <th>Date</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {sortedDaily.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: '#889e90' }}>
                      No sales found for the selected period.
                    </td>
                  </tr>
                ) : (
                  sortedDaily.map(d => {
                    const isToday = d.date === ymd(Date.now());
                    return (
                      <tr key={d.date} style={isToday ? { background: '#f6fbf8' } : {}}>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{d.date}</span>
                            {isToday && (
                              <span className="perm-chip" style={{ background: '#e4f3ea', color: '#0e7047', fontWeight: 700 }}>
                                Today
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{d.orders}</td>
                        <td style={{ fontWeight: 700, color: d.revenue > 0 ? 'var(--ink)' : '#889e90' }}>
                          {currency} {fm(d.revenue)}
                        </td>
                        <td style={{ color: d.profit > 0 ? '#0e7047' : '#889e90', fontWeight: 600 }}>
                          {currency} {fm(d.profit)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: Profit & Margins */}
      {data && tab === 'profit' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Gross Profit</span>
              <span className="kpi-value" style={{ color: '#0e7047' }}>{currency} {fm(totals.profit)}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Profit Margin</span>
              <span className="kpi-value">
                {totals.netSales > 0 ? ((totals.profit / totals.netSales) * 100).toFixed(1) + '%' : '—'}
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Sales Excl. Tax</span>
              <span className="kpi-value">{currency} {fm(totals.netSales)}</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Daily Profit Trend</h3>
            <ModernBarChart data={data.daily} field="profit" currency={currency} barColor="#0e7047" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Top Products by Profitability</h3>
            <button
              className="btn-secondary"
              onClick={() => downloadCsv('product-profit', [['Product', 'name'], ['Units Sold', 'qty'], ['Revenue', r => fm(r.revenue)], ['Profit', r => fm(r.profit)]], data.topProducts)}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map(p => (
                  <tr key={p.name}>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td>{p.qty}</td>
                    <td>{currency} {fm(p.revenue)}</td>
                    <td style={{ color: '#0e7047', fontWeight: 700 }}>{currency} {fm(p.profit)}</td>
                    <td>{p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) + '%' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 3: Inventory Valuation */}
      {tab === 'inventory' && invData && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Units in Stock</span>
              <span className="kpi-value">{invData.units?.toLocaleString()}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Value at Cost</span>
              <span className="kpi-value">{currency} {fm(invData.costValue)}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Retail Value</span>
              <span className="kpi-value">{currency} {fm(invData.retailValue)}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Potential Gross Profit</span>
              <span className="kpi-value" style={{ color: '#0e7047' }}>
                {currency} {fm(invData.retailValue - invData.costValue)}
              </span>
            </div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '20px 0 10px' }}>Low Stock Alert</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Unit Cost</th>
                  <th>Retail Price</th>
                </tr>
              </thead>
              <tbody>
                {invData.lowStock?.map(p => (
                  <tr key={p.name}>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td>{p.sku || '—'}</td>
                    <td><span className="status-pill low-stock">{p.stock} units</span></td>
                    <td>{currency} {fm(p.cost)}</td>
                    <td style={{ fontWeight: 700 }}>{currency} {fm(p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 4: Payments */}
      {data && tab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="table-container">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
              Payment Methods Summary
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment Tender</th>
                  <th>Transactions</th>
                  <th>Total Processed</th>
                </tr>
              </thead>
              <tbody>
                {data.byMethod?.map(m => (
                  <tr key={m.method}>
                    <td style={{ fontWeight: 700, textTransform: 'capitalize' }}>{m.method}</td>
                    <td>{m.orders} orders</td>
                    <td style={{ fontWeight: 800, fontSize: 15 }}>{currency} {fm(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Standalone Card Terminal Reconciliation Audit Journal */}
          <div className="table-container">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#166534' }}>
                  Standalone Card Terminal Audit Journal ({cardPaymentsData.length} records)
                </div>
                <div style={{ fontSize: 12, color: '#687b6f', marginTop: 2 }}>
                  Line-by-line terminal auth slip records to cross-reference with physical terminal settlement reports.
                </div>
              </div>
              {cardPaymentsData.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    downloadCsv(`card-terminal-audit-${range.from}-to-${range.to}`, [
                      'Date', 'Time', 'Invoice', 'Cashier', 'Card Brand', 'Last 4', 'Approval Code', 'Amount', 'Status'
                    ], cardPaymentsData.map(p => [
                      new Date(p.createdAt).toLocaleDateString(),
                      new Date(p.createdAt).toLocaleTimeString(),
                      p.invoiceNo,
                      p.cashierName || '-',
                      p.cardType || 'Card',
                      p.last4 || '****',
                      p.approvalCode || '-',
                      p.amount,
                      p.status
                    ]));
                  }}
                  style={{ fontSize: 12, padding: '4px 10px' }}
                >
                  Export Card Slips CSV
                </button>
              )}
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Invoice No</th>
                  <th>Cashier</th>
                  <th>Card Brand &amp; Last 4</th>
                  <th>Terminal Approval Code</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cardPaymentsData.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#889e90' }}>
                      No card terminal transactions recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  cardPaymentsData.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontSize: 12 }}>
                        <div>{new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div style={{ fontSize: 11, color: '#88998e' }}>{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{p.invoiceNo}</td>
                      <td>{p.cashierName || 'Staff'}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{p.cardType || 'Card'}</span> · <span style={{ fontFamily: 'monospace' }}>*{p.last4 || '***'}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0e7047', background: '#e4f3ea', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                          {p.approvalCode || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: 14, color: p.amount < 0 ? '#dc2626' : '#111a14' }}>
                          {currency} {fm(p.amount)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${p.status === 'completed' ? 'healthy' : 'ordered'}`} style={{ textTransform: 'capitalize' }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Staff Performance */}
      {data && tab === 'employees' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cashier / Staff Member</th>
                <th>Orders Completed</th>
                <th>Sales Volume</th>
                <th>Profit Generated</th>
              </tr>
            </thead>
            <tbody>
              {data.byCashier?.map(c => (
                <tr key={c.name}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td>{c.orders}</td>
                  <td style={{ fontWeight: 700 }}>{currency} {fm(c.revenue)}</td>
                  <td style={{ color: '#0e7047', fontWeight: 700 }}>{currency} {fm(c.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: Top Customers */}
      {data && tab === 'customers' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Orders</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {data.topCustomers?.map(c => (
                <tr key={c.name}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td>{c.orders}</td>
                  <td style={{ fontWeight: 800 }}>{currency} {fm(c.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModernBarChart({ data = [], field = 'revenue', currency = '$', barColor = '#0e7047' }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data.map(d => d[field] || 0));
  const w = 700, h = 130;
  const bw = w / data.length;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${w} ${h + 24}`} style={{ width: '100%', minWidth: 380, height: 'auto', display: 'block' }}>
        {data.map((d, i) => {
          const val = Math.max(0, d[field] || 0);
          const barHeight = Math.max(2, (val / max) * h);
          return (
            <g key={d.date}>
              <rect
                x={i * bw + 2}
                y={h - barHeight}
                width={Math.max(1, bw - 4)}
                height={barHeight}
                rx="4"
                fill={barColor}
                opacity={0.88}
                style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
              >
                <title>{`${d.date}: ${currency}${fm(val)}`}</title>
              </rect>
            </g>
          );
        })}
        {/* Date labels */}
        <text x="4" y={h + 16} fontSize="11" fill="#718377" fontFamily="var(--font-sans)">
          {data[0]?.date}
        </text>
        <text x={w - 4} y={h + 16} fontSize="11" textAnchor="end" fill="#718377" fontFamily="var(--font-sans)">
          {data[data.length - 1]?.date}
        </text>
      </svg>
    </div>
  );
}

