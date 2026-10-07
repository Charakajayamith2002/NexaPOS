import { useState, useEffect } from 'react';
import './theme.css';
import { api } from './api.js';
import Sidebar, { hasPermission } from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import ShiftModal from './components/ShiftModal.jsx';
import BarcodeModal from './components/BarcodeModal.jsx';

// Views
import Sell from './views/Sell.jsx';
import Products from './views/Products.jsx';
import Inventory from './views/Inventory.jsx';
import Suppliers from './views/Suppliers.jsx';
import Purchases from './views/Purchases.jsx';
import Invoices from './views/Invoices.jsx';
import Customers from './views/Customers.jsx';
import Reports from './views/Reports.jsx';
import Lists from './views/Lists.jsx';
import Users from './views/Users.jsx';
import Shifts from './views/Shifts.jsx';
import AuditLogs from './views/AuditLogs.jsx';
import Branches from './views/Branches.jsx';
import Backup from './views/Backup.jsx';
import Login from './views/Login.jsx';
import OfflineModal from './components/OfflineModal.jsx';
import { getOfflineQueue, syncOfflineSales } from './offlineSync.js';

export default function App() {
  const [cfg, setCfg] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.user || 'null');
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState('pos');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [productsForScan, setProductsForScan] = useState([]);

  // Multi-branch & Offline sync state
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [offlineCount, setOfflineCount] = useState(() => getOfflineQueue().length);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    api('/config').then(data => {
      // Default to Verdant Supply Co. if shopName is default
      if (!data.shopName || data.shopName === 'My Shop') {
        data.shopName = 'Verdant Supply Co.';
      }
      setCfg(data);
    }).catch(() => {
      setCfg({
        shopName: 'Verdant Supply Co.',
        currency: '$',
        businessType: 'retail',
        taxRate: 8.25,
        features: { barcode: true, tables: false, batch: false, prescription: false },
        loyalty: { rate: 100, pointValue: 1 }
      });
    });

    const handleAuthLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  // Load branches
  useEffect(() => {
    if (user) {
      api('/branches')
        .then(list => {
          if (Array.isArray(list) && list.length > 0) {
            setBranches(list);
            const savedId = localStorage.activeBranchId;
            const current = list.find(b => b._id === savedId) || list.find(b => b.isDefault) || list[0];
            setActiveBranch(current);
            localStorage.activeBranchId = current._id;
            localStorage.activeBranchName = current.name;
            localStorage.activeBranchCode = current.code;
          }
        })
        .catch(() => {});

      // Validate that the user has permission to view currentView
      if (user.role !== 'admin') {
        if (currentView === 'pos' && !hasPermission(user, 'canSell')) {
          setCurrentView(hasPermission(user, 'canAdjustStock') ? 'stock' : hasPermission(user, 'canManagePurchases') ? 'purchases' : 'shifts');
        } else if (currentView === 'users' && !hasPermission(user, 'canManageUsers')) {
          setCurrentView('pos');
        } else if (currentView === 'report' && !hasPermission(user, 'canViewReports')) {
          setCurrentView('pos');
        } else if (currentView === 'audit' && !hasPermission(user, 'canViewAudit')) {
          setCurrentView('pos');
        } else if (currentView === 'branches' && !hasPermission(user, 'canManageBranches')) {
          setCurrentView('pos');
        } else if (currentView === 'backup' && user.role !== 'admin') {
          setCurrentView('pos');
        }
      }
    }
  }, [user]);

  // Offline queue and sync event listeners
  useEffect(() => {
    const handleNet = (e) => setIsOnline(e.detail?.online ?? navigator.onLine);
    const handleQueueChange = (e) => setOfflineCount(e.detail?.count ?? getOfflineQueue().length);
    const handleSyncStatus = (e) => {
      setIsSyncing(e.detail?.syncing || false);
      setOfflineCount(e.detail?.pending ?? getOfflineQueue().length);
    };
    const handleAutoSync = () => {
      if (user) syncOfflineSales(api).catch(() => {});
    };

    window.addEventListener('pos:network-status', handleNet);
    window.addEventListener('pos:offline-queue-changed', handleQueueChange);
    window.addEventListener('pos:sync-status', handleSyncStatus);
    window.addEventListener('pos:trigger-auto-sync', handleAutoSync);

    return () => {
      window.removeEventListener('pos:network-status', handleNet);
      window.removeEventListener('pos:offline-queue-changed', handleQueueChange);
      window.removeEventListener('pos:sync-status', handleSyncStatus);
      window.removeEventListener('pos:trigger-auto-sync', handleAutoSync);
    };
  }, [user]);

  // Pre-load products for barcode scanning simulator
  useEffect(() => {
    if (user) {
      api('/products').then(setProductsForScan).catch(() => {});
    }
  }, [user, currentView]);

  if (!cfg) return null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleBarcodeScanned = (code) => {
    setScannedBarcode(code);
    setCurrentView('pos'); // Automatically switch to Sell terminal on scan
  };

  const pageTitles = {
    pos: 'Sell',
    shifts: 'Shifts & Cash Drawer',
    products: 'Products',
    stock: 'Inventory',
    suppliers: 'Suppliers',
    purchases: 'Purchases',
    sales: 'Invoices',
    customers: 'Customers',
    report: 'Reports',
    audit: 'System Audit Logs',
    branches: 'Store Branches & Locations',
    backup: 'Store Database Backup & Recovery',
    lists: 'Categories & Brands',
    users: 'Users'
  };

  return (
    <>
      {!user ? (
        <Login
          shopName={cfg.shopName}
          onDone={u => {
            setUser(u);
            localStorage.user = JSON.stringify(u);
          }}
        />
      ) : (
        <div className="app-container">
          {/* Responsive Left Navigation */}
          <Sidebar
            shopName={cfg.shopName}
            user={user}
            currentView={currentView}
            onSelectView={view => {
              setCurrentView(view);
              setGlobalSearch('');
            }}
            onLogout={handleLogout}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          {/* Main Area */}
          <div className="main-wrapper">
            <TopBar
              title={pageTitles[currentView] || 'Terminal'}
              onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
              onOpenShiftModal={() => setIsShiftModalOpen(true)}
              onOpenScanModal={() => setIsScanModalOpen(true)}
              onSearch={setGlobalSearch}
              searchQuery={globalSearch}
              currentView={currentView}
              branches={branches}
              activeBranch={activeBranch}
              onSelectBranch={b => {
                setActiveBranch(b);
                localStorage.activeBranchId = b._id;
                localStorage.activeBranchName = b.name;
                localStorage.activeBranchCode = b.code;
              }}
              onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
              offlineCount={offlineCount}
              isOnline={isOnline}
              isSyncing={isSyncing}
              onNavigate={setCurrentView}
            />

            {/* Views Router */}
            <main style={{ flex: 1, minHeight: 0 }}>
              {currentView === 'pos' && (
                <Sell
                  cfg={cfg}
                  globalSearch={globalSearch}
                  barcodeToScan={scannedBarcode}
                  onClearBarcodeScan={() => setScannedBarcode(null)}
                  activeBranch={activeBranch}
                  user={user}
                />
              )}
              {currentView === 'shifts' && <Shifts cfg={cfg} user={user} />}
              {currentView === 'products' && <Products cfg={cfg} globalSearch={globalSearch} onNavigate={setCurrentView} user={user} />}
              {currentView === 'stock' && <Inventory cfg={cfg} globalSearch={globalSearch} user={user} />}
              {currentView === 'suppliers' && <Suppliers cfg={cfg} globalSearch={globalSearch} user={user} />}
              {currentView === 'purchases' && <Purchases cfg={cfg} globalSearch={globalSearch} user={user} />}
              {currentView === 'sales' && <Invoices cfg={cfg} globalSearch={globalSearch} user={user} />}
              {currentView === 'customers' && <Customers cfg={cfg} globalSearch={globalSearch} user={user} />}
              {currentView === 'report' && <Reports cfg={cfg} user={user} />}
              {currentView === 'audit' && <AuditLogs cfg={cfg} globalSearch={globalSearch} user={user} />}
              {currentView === 'branches' && (
                <Branches
                  cfg={cfg}
                  user={user}
                  onBranchChanged={b => {
                    setActiveBranch(b);
                    localStorage.activeBranchId = b._id;
                    localStorage.activeBranchName = b.name;
                    localStorage.activeBranchCode = b.code;
                  }}
                />
              )}
              {currentView === 'backup' && <Backup cfg={cfg} user={user} />}
              {currentView === 'lists' && <Lists user={user} />}
              {currentView === 'users' && <Users user={user} />}
            </main>
          </div>

          {/* Global Modals */}
          <ShiftModal
            isOpen={isShiftModalOpen}
            onClose={() => setIsShiftModalOpen(false)}
            user={user}
            currency={cfg.currency}
            onNavigateToShifts={setCurrentView}
          />

          <BarcodeModal
            isOpen={isScanModalOpen}
            onClose={() => setIsScanModalOpen(false)}
            onScan={handleBarcodeScanned}
            products={productsForScan}
          />

          <OfflineModal
            isOpen={isOfflineModalOpen}
            onClose={() => setIsOfflineModalOpen(false)}
            currency={cfg.currency}
          />
        </div>
      )}
    </>
  );
}
