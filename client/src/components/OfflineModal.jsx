import { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  X, 
  HardDrive,
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import { getOfflineQueue, removeQueueItem, clearOfflineQueue, syncOfflineSales } from '../offlineSync.js';
import { api } from '../api.js';

export default function OfflineModal({ isOpen, onClose, currency = '$' }) {
  const [queue, setQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const refreshQueue = () => {
    setQueue(getOfflineQueue());
  };

  useEffect(() => {
    if (isOpen) {
      refreshQueue();
      setIsOnline(navigator.onLine);
      setStatusMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleNet = (e) => setIsOnline(e.detail?.online ?? navigator.onLine);
    const handleSyncStatus = (e) => {
      setIsSyncing(e.detail?.syncing || false);
      refreshQueue();
    };
    const handleQueueChange = () => refreshQueue();

    window.addEventListener('pos:network-status', handleNet);
    window.addEventListener('pos:sync-status', handleSyncStatus);
    window.addEventListener('pos:offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('pos:network-status', handleNet);
      window.removeEventListener('pos:sync-status', handleSyncStatus);
      window.removeEventListener('pos:offline-queue-changed', handleQueueChange);
    };
  }, []);

  const handleSyncNow = async () => {
    if (!navigator.onLine) {
      setStatusMessage('Cannot sync: Device is currently offline.');
      return;
    }
    setIsSyncing(true);
    setStatusMessage('Syncing transactions with server...');
    try {
      const res = await syncOfflineSales(api);
      refreshQueue();
      setStatusMessage(`Sync complete: ${res.synced} order(s) successfully recorded to server.`);
    } catch (e) {
      setStatusMessage(`Sync error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemove = (id) => {
    if (confirm('Delete this offline transaction from the queue?')) {
      removeQueueItem(id);
      refreshQueue();
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all queued offline transactions? Warning: unsynced data will be discarded.')) {
      clearOfflineQueue();
      refreshQueue();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 8, 
              background: isOnline ? '#e4f3ea' : '#fee2e2', 
              color: isOnline ? '#0e7047' : '#ef4444', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
            <div>
              <div className="modal-title">Offline &amp; Network Sync</div>
              <div style={{ fontSize: 12, color: '#687b6f' }}>
                {isOnline ? 'Online · Connected to NexaPOS Server' : 'Offline Mode · Transactions Cached Locally'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Status Banner */}
          <div style={{ 
            background: isOnline ? '#f5f8f5' : '#fef2f2', 
            border: `1px solid ${isOnline ? 'var(--border)' : '#fca5a5'}`, 
            borderRadius: 12, 
            padding: 14, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pulse-dot" style={{ 
                background: isOnline ? '#10b981' : '#ef4444',
                boxShadow: isOnline ? '0 0 0 3px rgba(16, 185, 129, 0.2)' : '0 0 0 3px rgba(239, 68, 68, 0.2)'
              }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                  {isOnline ? 'Internet & Server Online' : 'No Connection / Offline Mode'}
                </div>
                <div style={{ fontSize: 12, color: '#687b6f' }}>
                  {queue.length} transaction{queue.length === 1 ? '' : 's'} waiting to synchronize
                </div>
              </div>
            </div>

            <button 
              className="btn-secondary" 
              onClick={handleSyncNow} 
              disabled={isSyncing || queue.length === 0 || !isOnline}
              style={{ fontSize: 12.5, height: 32, padding: '0 10px' }}
            >
              <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {statusMessage && (
            <div style={{ 
              fontSize: 12.5, 
              padding: '8px 12px', 
              borderRadius: 8, 
              background: '#e4f3ea', 
              color: '#0e7047', 
              fontWeight: 600 
            }}>
              {statusMessage}
            </div>
          )}

          {/* Queue List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#556a5c', textTransform: 'uppercase' }}>
                Queued Offline Transactions ({queue.length})
              </span>
              {queue.length > 0 && (
                <button 
                  onClick={handleClearAll} 
                  className="btn-ghost" 
                  style={{ fontSize: 11.5, color: '#ef4444', padding: '2px 6px', height: 'auto' }}
                >
                  Clear Queue
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '30px 16px', 
                background: '#fafcfa', 
                border: '1px dashed var(--border)', 
                borderRadius: 10,
                color: '#687b6f' 
              }}>
                <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111a14' }}>All Sales Synchronized</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  Every transaction is recorded on the server. If the network drops, sales will queue here automatically.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {queue.map(item => (
                  <div key={item.id} style={{ 
                    background: '#ffffff', 
                    border: '1px solid var(--border)', 
                    borderRadius: 10, 
                    padding: '10px 14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ 
                          fontFamily: 'JetBrains Mono, monospace', 
                          fontWeight: 700, 
                          fontSize: 12, 
                          color: '#0e7047' 
                        }}>
                          {item.invoiceNo}
                        </span>
                        <span style={{ 
                          background: '#fef3c7', 
                          color: '#b45309', 
                          fontSize: 11, 
                          fontWeight: 700, 
                          padding: '1px 6px', 
                          borderRadius: 4 
                        }}>
                          Offline
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#687b6f', marginTop: 2 }}>
                        {item.items?.length || 0} items · Tender: {item.paymentMethod} · {new Date(item.queuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>
                        {currency} {Number(item.total || 0).toFixed(2)}
                      </span>
                      <button 
                        onClick={() => handleRemove(item.id)} 
                        className="btn-ghost" 
                        style={{ padding: 4, color: '#ef4444' }}
                        title="Remove transaction"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {queue.length > 0 && isOnline && (
            <button className="btn-primary" onClick={handleSyncNow} disabled={isSyncing}>
              {isSyncing ? 'Syncing...' : 'Sync All Queue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

