import { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  Filter, 
  User, 
  Clock, 
  Code2, 
  X, 
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';
import { api } from '../api.js';

export default function AuditLogs({ cfg, globalSearch = '' }) {
  const [logs, setLogs] = useState([]);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadLogs = () => {
    setLoading(true);
    const q = (globalSearch || searchQuery).trim();
    const queryStr = `?category=${category}&search=${encodeURIComponent(q)}&limit=200`;
    api(`/audit-logs${queryStr}`)
      .then(d => {
        setLogs(Array.isArray(d) ? d : (d?.logs || []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(loadLogs, 200);
    return () => clearTimeout(t);
  }, [category, searchQuery, globalSearch]);

  const categories = [
    { id: 'all', label: 'All Activities' },
    { id: 'sale', label: 'Sales & Invoices' },
    { id: 'refund', label: 'Refunds & Returns' },
    { id: 'cash_drawer', label: 'Shifts & Cash Drawer' },
    { id: 'stock', label: 'Inventory & Stock' },
    { id: 'product', label: 'Product Catalog' },
    { id: 'auth', label: 'User Authentication' },
    { id: 'user', label: 'Staff Management' }
  ];

  // Action badge color styling
  const getActionBadgeStyle = (action) => {
    if (action.includes('SALE')) return { bg: '#e4f3ea', color: '#0e7047' };
    if (action.includes('REFUND')) return { bg: '#fee2e2', color: '#b91c1c' };
    if (action.includes('SHIFT') || action.includes('CASH')) return { bg: '#fef3c7', color: '#b45309' };
    if (action.includes('STOCK')) return { bg: '#e0f2fe', color: '#0369a1' };
    if (action.includes('PRODUCT')) return { bg: '#ede9fe', color: '#6d28d9' };
    if (action.includes('LOGIN') || action.includes('AUTH')) return { bg: '#f1f5f9', color: '#475569' };
    return { bg: '#f3f4f6', color: '#374151' };
  };

  const downloadCsv = () => {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const cols = ['Timestamp', 'Staff', 'Action', 'Category', 'Reference', 'Details', 'IP'];
    const rows = logs.map(l => [
      new Date(l.createdAt).toLocaleString(),
      l.user || 'System',
      l.action,
      l.category,
      l.ref || '',
      l.details || '',
      l.ip || ''
    ]);
    const text = [cols.map(q).join(','), ...rows.map(r => r.map(q).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // KPIs
  const totalEvents = logs.length;
  const salesEvents = logs.filter(l => l.category === 'sale').length;
  const drawerEvents = logs.filter(l => l.category === 'cash_drawer').length;
  const stockEvents = logs.filter(l => l.category === 'stock' || l.category === 'product').length;

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Audit Logs</h1>
          <p className="page-subtitle">Immutable chronological trail of transactions, cash drawer shifts, and catalog edits.</p>
        </div>
        <button className="btn-secondary" onClick={downloadCsv} disabled={logs.length === 0}>
          <Download size={15} /> Export Audit CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Logged Audit Events</span>
          <span className="kpi-value">{totalEvents}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Sales &amp; Payments</span>
          <span className="kpi-value" style={{ color: '#0e7047' }}>{salesEvents}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Cash Drawer Events</span>
          <span className="kpi-value" style={{ color: '#b45309' }}>{drawerEvents}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Stock &amp; Catalog Updates</span>
          <span className="kpi-value" style={{ color: '#0284c7' }}>{stockEvents}</span>
        </div>
      </div>

      {/* Categories Horizontal Filter Chips */}
      <div className="category-chips-bar hide-scrollbar">
        {categories.map(c => (
          <button
            key={c.id}
            type="button"
            className={`category-chip ${category === c.id ? 'active' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search Toolbar */}
      <div className="table-toolbar">
        <div className="search-field-pill">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by action, user, reference, or details..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 170 }}>Date &amp; Time</th>
              <th>Staff User</th>
              <th>Action</th>
              <th>Category</th>
              <th>Reference</th>
              <th>Description / Event Details</th>
              <th style={{ width: 60, textAlign: 'right' }}>Diff</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                  {loading ? 'Loading audit trail...' : 'No audit events found for this filter.'}
                </td>
              </tr>
            ) : (
              logs.map(log => {
                const badge = getActionBadgeStyle(log.action);
                return (
                  <tr key={log._id}>
                    <td>
                      <div style={{ fontSize: 12.5, color: '#33443a', fontWeight: 600 }}>
                        {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: 11, color: '#88998d' }}>
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="user-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                          {(log.user || 'S')[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{log.user || 'System'}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          background: badge.bg,
                          color: badge.color
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="status-pill active" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                        {log.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {log.ref ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12, color: '#132e1d' }}>
                          {log.ref}
                        </span>
                      ) : (
                        <span style={{ color: '#aaa' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: '#2b3830', maxWidth: 420 }}>
                        {log.details}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {log.metadata ? (
                        <button
                          className="btn-ghost"
                          onClick={() => setSelectedLog(log)}
                          style={{ padding: 4, color: '#0e7047' }}
                          title="Inspect JSON Payload"
                        >
                          <Code2 size={16} />
                        </button>
                      ) : (
                        <span style={{ color: '#bbb' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Metadata Inspector Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code2 size={18} color="#0e7047" />
                <div className="modal-title">Event Payload — {selectedLog.action}</div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ background: '#f8faf7' }}>
              <div style={{ fontSize: 12, color: '#556a5c', marginBottom: 8 }}>
                Recorded {new Date(selectedLog.createdAt).toLocaleString()} by <b>{selectedLog.user}</b>
              </div>

              <pre style={{ 
                background: '#0d1510', 
                color: '#6ee7b7', 
                padding: 16, 
                borderRadius: 10, 
                fontSize: 12.5, 
                fontFamily: 'var(--font-mono)', 
                overflowX: 'auto',
                lineHeight: 1.5 
              }}>
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
