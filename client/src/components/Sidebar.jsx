import { 
  ShoppingBag, 
  Package, 
  Boxes, 
  Truck, 
  FileSpreadsheet, 
  Receipt, 
  Users, 
  BarChart3, 
  UserCheck, 
  LogOut,
  X,
  Layers,
  Banknote,
  ShieldAlert,
  Store,
  Database
} from 'lucide-react';

const ROLE_DISPLAY_NAMES = {
  admin: 'Administrator',
  supervisor: 'Shift Supervisor',
  senior_cashier: 'Senior Cashier',
  cashier: 'Cashier',
  inventory_clerk: 'Inventory Clerk'
};

const ROLE_DEFAULT_PERMISSIONS = {
  cashier: {
    canSell: true,
    canRefund: false,
    canVoid: false,
    canOpenShift: true,
    canCloseShift: false,
    canAdjustStock: false,
    canManagePurchases: false,
    canViewReports: false,
    canViewAudit: false,
    canManageBranches: false,
    canManageUsers: false
  },
  senior_cashier: {
    canSell: true,
    canRefund: true,
    canVoid: true,
    canOpenShift: true,
    canCloseShift: true,
    canAdjustStock: false,
    canManagePurchases: false,
    canViewReports: false,
    canViewAudit: false,
    canManageBranches: false,
    canManageUsers: false
  },
  supervisor: {
    canSell: true,
    canRefund: true,
    canVoid: true,
    canOpenShift: true,
    canCloseShift: true,
    canAdjustStock: true,
    canManagePurchases: false,
    canViewReports: true,
    canViewAudit: false,
    canManageBranches: false,
    canManageUsers: false
  },
  inventory_clerk: {
    canSell: false,
    canRefund: false,
    canVoid: false,
    canOpenShift: false,
    canCloseShift: false,
    canAdjustStock: true,
    canManagePurchases: true,
    canViewReports: false,
    canViewAudit: false,
    canManageBranches: false,
    canManageUsers: false
  },
  admin: {
    canSell: true,
    canRefund: true,
    canVoid: true,
    canOpenShift: true,
    canCloseShift: true,
    canAdjustStock: true,
    canManagePurchases: true,
    canViewReports: true,
    canViewAudit: true,
    canManageBranches: true,
    canManageUsers: true
  }
};

export const hasPermission = (user, permKey) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.permissions && typeof user.permissions[permKey] === 'boolean') {
    return user.permissions[permKey];
  }
  const defaults = ROLE_DEFAULT_PERMISSIONS[user.role] || ROLE_DEFAULT_PERMISSIONS.cashier;
  return Boolean(defaults[permKey]);
};

export default function Sidebar({ 
  shopName = 'Verdant Supply Co.', 
  user, 
  currentView, 
  onSelectView, 
  onLogout,
  isMobileOpen = false,
  onCloseMobile
}) {
  const navSections = [
    {
      title: 'Top / Daily Actions',
      items: [
        { key: 'pos', label: 'Sell', icon: ShoppingBag, check: u => hasPermission(u, 'canSell') },
        { key: 'shifts', label: 'Shifts & Drawer', icon: Banknote, check: u => hasPermission(u, 'canOpenShift') || hasPermission(u, 'canCloseShift') },
        { key: 'customers', label: 'Customers', icon: Users, check: () => true },
        { key: 'sales', label: 'Invoices', icon: Receipt, check: u => hasPermission(u, 'canSell') || hasPermission(u, 'canViewReports') || hasPermission(u, 'canRefund') },
      ]
    },
    {
      title: 'Inventory / Stock',
      items: [
        { key: 'products', label: 'Products', icon: Package, check: u => hasPermission(u, 'canAdjustStock') || hasPermission(u, 'canManagePurchases') },
        { key: 'stock', label: 'Inventory', icon: Boxes, check: u => hasPermission(u, 'canAdjustStock') },
        { key: 'suppliers', label: 'Suppliers', icon: Truck, check: u => hasPermission(u, 'canManagePurchases') },
        { key: 'purchases', label: 'Purchases', icon: FileSpreadsheet, check: u => hasPermission(u, 'canManagePurchases') },
        { key: 'lists', label: 'Categories & Brands', icon: Layers, check: u => hasPermission(u, 'canAdjustStock') || hasPermission(u, 'canManagePurchases') },
      ]
    },
    {
      title: 'Reporting / Management',
      items: [
        { key: 'report', label: 'Reports', icon: BarChart3, check: u => hasPermission(u, 'canViewReports') },
        { key: 'audit', label: 'Audit Logs', icon: ShieldAlert, check: u => hasPermission(u, 'canViewAudit') },
        { key: 'backup', label: 'Backup & Restore', icon: Database, check: u => u?.role === 'admin' },
        { key: 'branches', label: 'Branches', icon: Store, check: u => hasPermission(u, 'canManageBranches') },
        { key: 'users', label: 'Users', icon: UserCheck, check: u => hasPermission(u, 'canManageUsers') },
      ]
    }
  ];

  const initials = (user?.name || 'Staff')
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const brandInitial = (shopName || 'Verdant')[0]?.toUpperCase() || 'V';
  const roleName = ROLE_DISPLAY_NAMES[user?.role] || 'Staff Member';
  const trainingLevel = user?.trainingLevel || (user?.role === 'admin' ? 4 : user?.role === 'supervisor' ? 3 : user?.role === 'senior_cashier' || user?.role === 'inventory_clerk' ? 2 : 1);

  const content = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="sidebar-header">
          <div className="sidebar-logo">{brandInitial}</div>
          <div className="sidebar-brand-name">{shopName}</div>
          {isMobileOpen && (
            <button 
              onClick={onCloseMobile} 
              style={{ marginLeft: 'auto', color: '#93a498', padding: 4 }}
              title="Close navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Scrollable Categorized Navigation with RBAC filters */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
          {navSections.map(section => {
            const visibleItems = section.items.filter(item => {
              if (user?.role === 'admin') return true;
              return item.check ? item.check(user) : true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} style={{ marginBottom: 12 }}>
                <div className="sidebar-section-title">{section.title}</div>
                <nav className="sidebar-nav">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentView === item.key;
                    return (
                      <button
                        key={item.key}
                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          onSelectView(item.key);
                          if (onCloseMobile) onCloseMobile();
                        }}
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.2 : 1.9} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>
      </div>

      {/* Staff profile with Role & Training Level */}
      <div className="sidebar-user">
        <div className="user-profile-left">
          <div className="user-avatar">{initials}</div>
          <div className="user-meta" style={{ minWidth: 0 }}>
            <span className="user-name" title={user?.name}>{user?.name || 'Staff Member'}</span>
            <span className="user-sub" title={`${roleName} · Level ${trainingLevel}`}>
              {roleName} · Lvl {trainingLevel}
            </span>
          </div>
        </div>
        <button 
          onClick={onLogout} 
          title="Sign out"
          style={{ color: '#889e90', padding: 6, borderRadius: 6, flexShrink: 0 }}
          onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
          onMouseOut={e => e.currentTarget.style.color = '#889e90'}
        >
          <LogOut size={17} />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="sidebar">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="mobile-overlay" onClick={onCloseMobile}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
