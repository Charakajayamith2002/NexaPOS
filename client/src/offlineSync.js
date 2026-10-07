// Offline Transaction Queue & Network Sync Engine

const STORAGE_KEY = 'nexa_offline_sales_queue';

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('pos:offline-queue-changed', { detail: { count: queue.length } }));
  } catch (e) {
    console.error('Failed to save offline queue:', e);
  }
}

export function enqueueOfflineSale(saleData) {
  const queue = getOfflineQueue();
  const offlineInvoiceNo = 'OFFLINE-' + Date.now().toString(36).toUpperCase();
  const entry = {
    ...saleData,
    invoiceNo: offlineInvoiceNo,
    isOffline: true,
    queuedAt: new Date().toISOString(),
    id: 'off_' + Math.random().toString(36).substring(2, 9)
  };
  queue.push(entry);
  saveOfflineQueue(queue);
  return entry;
}

export function removeQueueItem(entryId) {
  const queue = getOfflineQueue().filter(item => item.id !== entryId);
  saveOfflineQueue(queue);
}

export function clearOfflineQueue() {
  saveOfflineQueue([]);
}

let isSyncing = false;

export async function syncOfflineSales(api) {
  if (isSyncing) return { inProgress: true };
  if (!navigator.onLine) return { offline: true };

  const queue = getOfflineQueue();
  if (queue.length === 0) return { count: 0, synced: 0 };

  isSyncing = true;
  window.dispatchEvent(new CustomEvent('pos:sync-status', { detail: { syncing: true, pending: queue.length } }));

  let synced = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      // Post item to real sales API
      const payload = { ...item };
      delete payload.isOffline;
      delete payload.queuedAt;
      delete payload.id;
      delete payload.invoiceNo; // Server will assign formal INV-XXXXXX

      await api('/sales', {
        method: 'POST',
        body: payload
      });
      synced++;
    } catch (err) {
      console.warn('Could not sync offline order:', err.message);
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  isSyncing = false;

  window.dispatchEvent(new CustomEvent('pos:sync-status', { 
    detail: { syncing: false, pending: remaining.length, lastSyncedCount: synced } 
  }));

  window.dispatchEvent(new CustomEvent('pos:offline-sync-complete', {
    detail: { synced, remaining: remaining.length }
  }));

  return { total: queue.length, synced, remaining: remaining.length };
}

// Global auto-sync on network restoration
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    window.dispatchEvent(new CustomEvent('pos:network-status', { detail: { online: true } }));
    // Wait 1.5 seconds for network stabilization then trigger sync if api is available
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('pos:trigger-auto-sync'));
    }, 1500);
  });

  window.addEventListener('offline', () => {
    window.dispatchEvent(new CustomEvent('pos:network-status', { detail: { online: false } }));
  });
}

