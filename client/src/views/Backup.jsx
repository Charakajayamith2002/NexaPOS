import { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  HardDrive, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Trash2, 
  ShieldAlert, 
  Sparkles, 
  X, 
  Check, 
  RotateCcw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api.js';

export default function Backup({ cfg, user }) {
  const { currency = '$', shopName = 'Verdant Supply Co.' } = cfg || {};

  const [snapshots, setSnapshots] = useState([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState(null); // { type: 'success'|'error', message, counts }

  // Upload & File Restore State
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedBackup, setParsedBackup] = useState(null);
  const [parseError, setParseError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreSource, setRestoreSource] = useState(null); // { type: 'file' | 'snapshot', filename, data }

  const loadSnapshots = () => {
    setIsLoadingSnapshots(true);
    api('/backup/snapshots')
      .then(list => setSnapshots(Array.isArray(list) ? list : []))
      .catch(() => {})
      .finally(() => setIsLoadingSnapshots(false));
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  // 1. Download Backup as File (Admin Direct Export)
  const handleDownloadBackup = async () => {
    setIsExporting(true);
    setRestoreStatus(null);
    try {
      const token = localStorage.token || '';
      const res = await fetch('/api/backup/export', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned ${res.status}: ${res.statusText}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `nexapos-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setRestoreStatus({
        type: 'success',
        message: 'Backup downloaded successfully! Please save a copy to a USB thumb drive or cloud storage.'
      });
    } catch (err) {
      setRestoreStatus({
        type: 'error',
        message: err.message || 'Error downloading backup file'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Handle File Picker Selection for Restore
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError('');
    setParsedBackup(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        const payload = json.data || json;
        if (!payload || typeof payload !== 'object') {
          throw new Error('Invalid backup file: missing store collections payload');
        }
        const hasCore = ['users', 'products', 'sales'].some(k => Array.isArray(payload[k]));
        if (!hasCore) {
          throw new Error('File does not contain valid NexaPOS collections (users, products, or sales)');
        }

        setParsedBackup(json);
        setRestoreSource({ type: 'file', filename: file.name, data: json });
        setConfirmInput('');
        setIsRestoreModalOpen(true);
      } catch (err) {
        setParseError(`Could not read backup file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // Reset file input so user can pick the same file again if needed
    e.target.value = '';
  };

  // 3. Trigger Restore Execution
  const handleExecuteRestore = async () => {
    if (confirmInput.trim().toUpperCase() !== 'RESTORE') {
      alert('Please type RESTORE into the confirmation field to confirm.');
      return;
    }

    setIsRestoring(true);
    setRestoreStatus(null);

    try {
      let result;
      if (restoreSource.type === 'file') {
        result = await api('/backup/restore', {
          method: 'POST',
          body: { backup: restoreSource.data }
        });
      } else if (restoreSource.type === 'snapshot') {
        result = await api(`/backup/restore-snapshot/${encodeURIComponent(restoreSource.filename)}`, {
          method: 'POST'
        });
      }

      setIsRestoreModalOpen(false);
      setParsedBackup(null);
      setSelectedFile(null);
      loadSnapshots();

      setRestoreStatus({
        type: 'success',
        message: 'Database restore completed successfully! All records have been restored.',
        counts: result.restoredCounts
      });
    } catch (err) {
      setRestoreStatus({
        type: 'error',
        message: `Restore failed: ${err.message}`
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // 4. Create Manual Snapshot on Server
  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    setRestoreStatus(null);
    try {
      const snap = await api('/backup/snapshot', { method: 'POST' });
      loadSnapshots();
      setRestoreStatus({
        type: 'success',
        message: `Snapshot "${snap.filename}" created and saved on server backups folder!`
      });
    } catch (err) {
      setRestoreStatus({
        type: 'error',
        message: err.message || 'Error creating server snapshot'
      });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // 5. Download a specific snapshot from server
  const handleDownloadSnapshot = async (snap) => {
    try {
      const token = localStorage.token || '';
      const res = await fetch(`/api/backup/download-snapshot/${encodeURIComponent(snap.filename)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Download failed (status ${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = snap.filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      alert(err.message || 'Error downloading snapshot');
    }
  };

  // 6. Restore from a specific snapshot from server
  const handlePromptRestoreSnapshot = (snap) => {
    setRestoreSource({
      type: 'snapshot',
      filename: snap.filename,
      data: snap.preview
    });
    setParsedBackup(snap.preview);
    setConfirmInput('');
    setIsRestoreModalOpen(true);
  };

  // 7. Delete a snapshot
  const handleDeleteSnapshot = async (snap) => {
    if (!confirm(`Delete snapshot "${snap.filename}"? This action cannot be undone.`)) return;
    try {
      await api(`/backup/snapshot/${encodeURIComponent(snap.filename)}`, { method: 'DELETE' });
      loadSnapshots();
    } catch (err) {
      alert(err.message || 'Error deleting snapshot');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Store Database Backup &amp; Disaster Recovery</h1>
          <p className="page-subtitle">
            Safeguard your entire shop database. Download JSON copies to USB or cloud, and restore in emergencies.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="status-pill healthy" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}>
            <span className="pulse-dot" />
            <span>Auto-Daily Backup: Active (Keeps last 7)</span>
          </span>
        </div>
      </div>

      {/* Why Backups Matter Educational Banner */}
      <div style={{
        background: '#f4fbf6',
        border: '1px solid #cce8d6',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14
      }}>
        <ShieldCheck size={22} color="#0e7047" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: '#254432', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0e7047', marginBottom: 2 }}>
            Why a real shop needs backup &amp; offsite storage:
          </div>
          Your store data lives in MongoDB on this computer. If this hard disk fails, PC is damaged, stolen, or data is accidentally deleted, everything is gone without a backup.
          A backup file allows you to recover to your latest saved state and easily migrate to a new machine.
          <strong style={{ display: 'block', marginTop: 4, color: '#095c37' }}>
            Important: Always keep a copy of your downloaded backup on an external USB thumb drive or Google Drive!
          </strong>
        </div>
      </div>

      {/* Notifications Alert */}
      {restoreStatus && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 10,
          marginBottom: 20,
          background: restoreStatus.type === 'success' ? '#eefaf2' : '#fef2f2',
          border: `1px solid ${restoreStatus.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: restoreStatus.type === 'success' ? '#14532d' : '#991b1b',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          {restoreStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <div style={{ flex: 1, fontSize: 13.5 }}>
            <div style={{ fontWeight: 700 }}>{restoreStatus.message}</div>
            {restoreStatus.counts && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(restoreStatus.counts).map(([k, v]) => (
                  <span key={k} style={{ background: '#ffffff', padding: '2px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, border: '1px solid #bbf7d0' }}>
                    {k}: {v} records
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setRestoreStatus(null)} className="btn-ghost" style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 28 }}>
        
        {/* Card 1: Download Full Backup */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 24,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e4f3ea', color: '#0e7047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HardDrive size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Download Complete Backup</h3>
                <p style={{ fontSize: 12.5, color: '#687d70' }}>Export single self-contained JSON archive</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#44564b', lineHeight: 1.5, marginBottom: 16 }}>
              Downloads all shop records in one file. Contains complete data for all 15 system collections:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 12, color: '#556a5c', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} color="#0e7047" /> Products &amp; Prices</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} color="#0e7047" /> Invoices &amp; Line Items</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} color="#0e7047" /> Customer Balances</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} color="#0e7047" /> Loyalty Points</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} color="#0e7047" /> Shift &amp; Drawer Audits</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} color="#0e7047" /> Purchase Orders &amp; Suppliers</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} color="#0e7047" /> Staff Logins &amp; RBAC</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} color="#0e7047" /> Store Branches</div>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleDownloadBackup}
            disabled={isExporting}
            style={{ width: '100%', height: 44, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Download size={17} />
            <span>{isExporting ? 'Generating Backup...' : 'Download Backup File (.json)'}</span>
          </button>
        </div>

        {/* Card 2: Restore from Backup File */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 24,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Restore from Backup File</h3>
                <p style={{ fontSize: 12.5, color: '#687d70' }}>Emergency recovery or computer migration</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#44564b', lineHeight: 1.5, marginBottom: 14 }}>
              Select a previously downloaded <code style={{ background: '#f1f5f3', padding: '1px 5px', borderRadius: 4 }}>.json</code> backup file to restore your entire database.
            </p>

            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
              color: '#92400e',
              lineHeight: 1.4,
              marginBottom: 16
            }}>
              <strong>⚠️ Overwrite Warning:</strong> Restoring replaces current store data with the records from the backup file. A pre-restore safety copy will be taken automatically.
            </div>

            {parseError && (
              <div style={{ color: '#dc2626', fontSize: 12.5, background: '#fef2f2', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>
                {parseError}
              </div>
            )}
          </div>

          <div>
            <label
              className="btn-secondary"
              style={{
                width: '100%',
                height: 44,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer'
              }}
            >
              <Upload size={17} />
              <span>Choose Backup File (.json)...</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Section 3: Automatic Daily Snapshots & Local Server Backups */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 24,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              Automated Daily Backups (Server Snapshots)
            </h3>
            <p style={{ fontSize: 13, color: '#687d70', marginTop: 2 }}>
              The server automatically creates a snapshot each night in <code style={{ background: '#f1f5f3', padding: '1px 5px', borderRadius: 4 }}>server/backups/</code> and retains the last 7 daily copies.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-secondary"
              onClick={loadSnapshots}
              disabled={isLoadingSnapshots}
              style={{ fontSize: 13, padding: '7px 12px' }}
            >
              <RefreshCw size={14} className={isLoadingSnapshots ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              className="btn-primary"
              onClick={handleCreateSnapshot}
              disabled={isCreatingSnapshot}
              style={{ fontSize: 13, padding: '7px 14px' }}
            >
              <Database size={14} />
              <span>{isCreatingSnapshot ? 'Creating...' : 'Create Snapshot Now'}</span>
            </button>
          </div>
        </div>

        {/* Snapshots Table */}
        <div className="table-container" style={{ margin: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Snapshot Name</th>
                <th>Created At</th>
                <th>Size</th>
                <th>Collections &amp; Records</th>
                <th style={{ width: 220, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                    No server snapshots stored yet. Click "Create Snapshot Now" or wait for the automatic nightly backup.
                  </td>
                </tr>
              ) : (
                snapshots.map(snap => {
                  const counts = snap.preview?.counts || {};
                  return (
                    <tr key={snap.filename}>
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>
                          {snap.filename}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5, color: '#44564b' }}>
                          {new Date(snap.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: 11, color: '#889e90' }}>
                          {new Date(snap.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600 }}>
                          {formatBytes(snap.size)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 360 }}>
                          {counts.products !== undefined && (
                            <span className="perm-chip">Products: {counts.products}</span>
                          )}
                          {counts.sales !== undefined && (
                            <span className="perm-chip">Sales: {counts.sales}</span>
                          )}
                          {counts.customers !== undefined && (
                            <span className="perm-chip">Customers: {counts.customers}</span>
                          )}
                          {counts.users !== undefined && (
                            <span className="perm-chip">Users: {counts.users}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            className="btn-ghost"
                            onClick={() => handleDownloadSnapshot(snap)}
                            style={{ fontSize: 12, padding: '4px 8px', color: '#0e7047' }}
                            title="Download file to computer"
                          >
                            <Download size={14} style={{ marginRight: 4 }} />
                            <span>Download</span>
                          </button>

                          <button
                            className="btn-ghost"
                            onClick={() => handlePromptRestoreSnapshot(snap)}
                            style={{ fontSize: 12, padding: '4px 8px', color: '#b45309' }}
                            title="Restore this snapshot"
                          >
                            <RotateCcw size={14} style={{ marginRight: 4 }} />
                            <span>Restore</span>
                          </button>

                          <button
                            className="btn-ghost"
                            onClick={() => handleDeleteSnapshot(snap)}
                            style={{ fontSize: 12, padding: '4px 8px', color: '#dc2626' }}
                            title="Delete snapshot file"
                          >
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
      </div>

      {/* Confirmation & Inspection Modal for Restore */}
      {isRestoreModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRestoreModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #fee2e2', background: '#fffafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#b91c1c" />
                <div className="modal-title" style={{ color: '#b91c1c' }}>Confirm Database Restore</div>
              </div>
              <button onClick={() => setIsRestoreModalOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Caution Callout */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
                <strong>CRITICAL WARNING:</strong> This action will erase your current active database and replace it completely with the records contained in this backup.
              </div>

              {/* Inspect Backup Data */}
              {parsedBackup && (
                <div style={{ background: '#f8faf8', border: '1px solid #e2ebe4', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                    Backup Source Details:
                  </div>
                  <div style={{ fontSize: 12, color: '#556a5c', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                    <div><strong>File:</strong> {restoreSource?.filename}</div>
                    <div><strong>Generated:</strong> {parsedBackup.meta?.generatedAt ? new Date(parsedBackup.meta.generatedAt).toLocaleString() : 'N/A'}</div>
                    <div><strong>Store:</strong> {parsedBackup.meta?.shopName || shopName}</div>
                    <div><strong>Version:</strong> v{parsedBackup.meta?.version || '2.4'}</div>
                  </div>

                  {parsedBackup.counts && (
                    <div style={{ borderTop: '1px solid #e7efe9', paddingTop: 8 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#33443a', marginBottom: 4 }}>
                        Records to be restored:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {Object.entries(parsedBackup.counts).map(([k, v]) => (
                          <span key={k} className="perm-chip">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p style={{ fontSize: 13, color: '#44564b', lineHeight: 1.5 }}>
                To prevent accidental overwrites, please type <strong>RESTORE</strong> in the field below to confirm:
              </p>

              <div>
                <input
                  placeholder="Type RESTORE to confirm"
                  value={confirmInput}
                  onChange={e => setConfirmInput(e.target.value)}
                  style={{ height: 42, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f3' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsRestoreModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={confirmInput.trim().toUpperCase() !== 'RESTORE' || isRestoring}
                onClick={handleExecuteRestore}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RotateCcw size={16} />
                <span>{isRestoring ? 'Restoring Database...' : 'Yes, Overwrite & Restore'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

