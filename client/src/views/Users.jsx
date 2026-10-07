import { useState, useEffect, useMemo } from 'react';
import { 
  Users as UsersIcon, 
  Plus, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  KeyRound, 
  X, 
  Edit3, 
  Check, 
  RotateCcw,
  Sparkles,
  GraduationCap,
  Store,
  Boxes,
  Receipt,
  UserCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { api } from '../api.js';

export const ROLES_CONFIG = {
  cashier: {
    id: 'cashier',
    name: 'Cashier',
    level: 1,
    levelName: 'Level 1: Basic Operations',
    description: 'Basic register sales, customer checkout, and standard receipts.',
    badgeClass: 'cashier',
    color: '#0284c7',
    bg: '#f0f9ff'
  },
  senior_cashier: {
    id: 'senior_cashier',
    name: 'Senior Cashier',
    level: 2,
    levelName: 'Level 2: Senior Operations',
    description: 'Register sales, customer returns & refunds, transaction voids, discounts, and drawer closing.',
    badgeClass: 'senior_cashier',
    color: '#b45309',
    bg: '#fffbeb'
  },
  supervisor: {
    id: 'supervisor',
    name: 'Shift Supervisor',
    level: 3,
    levelName: 'Level 3: Shift Oversight',
    description: 'Cash drawer control, refund/void approvals, open/close shifts, stock adjustments, and shift sales reports.',
    badgeClass: 'supervisor',
    color: '#047857',
    bg: '#ecfdf5'
  },
  inventory_clerk: {
    id: 'inventory_clerk',
    name: 'Inventory / Stock Clerk',
    level: 2,
    levelName: 'Level 2: Inventory Specialist',
    description: 'Manual stock adjustments, stocktaking counts, purchase order receiving, and supplier management.',
    badgeClass: 'inventory_clerk',
    color: '#0f766e',
    bg: '#f0fdfa'
  },
  admin: {
    id: 'admin',
    name: 'Administrator',
    level: 4,
    levelName: 'Level 4: System Admin',
    description: 'Full unrestricted system access, staff & security management, store branches, system audit logs, and analytics.',
    badgeClass: 'admin',
    color: '#4338ca',
    bg: '#eef2ff'
  }
};

export const DEFAULT_ROLE_PERMS = {
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

export const PERMISSION_GROUPS = [
  {
    title: 'Sales & POS Terminal',
    icon: Receipt,
    items: [
      { key: 'canSell', label: 'Process Sales & Checkout', desc: 'Allow register checkout, barcode scanning, and taking payments' },
      { key: 'canRefund', label: 'Approve & Issue Refunds', desc: 'Authorize customer item returns and cash/card refund reversals' },
      { key: 'canVoid', label: 'Void Active Transactions', desc: 'Cancel in-progress carts and delete registered line items' }
    ]
  },
  {
    title: 'Cash Drawer & Shifts',
    icon: Store,
    items: [
      { key: 'canOpenShift', label: 'Open Shift & Enter Float', desc: 'Count starting physical cash and begin active register shift' },
      { key: 'canCloseShift', label: 'Close Shift & Reconcile Drawer', desc: 'Perform end-of-shift count, calculate cash variance, and close register' }
    ]
  },
  {
    title: 'Inventory & Purchasing',
    icon: Boxes,
    items: [
      { key: 'canAdjustStock', label: 'Manual Stock Adjustments', desc: 'Change stock quantities, log inventory shrinkage, breakage, and counts' },
      { key: 'canManagePurchases', label: 'Purchase Orders & Suppliers', desc: 'Create POs, receive supplier consignments, and update inventory cost' }
    ]
  },
  {
    title: 'Reporting & Administration',
    icon: Shield,
    items: [
      { key: 'canViewReports', label: 'Sales & Profit Reports', desc: 'View daily totals, profit margins, top products, and cashier performance' },
      { key: 'canViewAudit', label: 'System Audit Logs', desc: 'Inspect immutable security logs, cash drops, and authentication history' },
      { key: 'canManageBranches', label: 'Multi-Branch Management', desc: 'Create and configure store locations, addresses, and branch codes' },
      { key: 'canManageUsers', label: 'User & Staff Permissions', desc: 'Add new staff members, set training levels, and assign RBAC privileges' }
    ]
  }
];

export const TRAINING_LEVELS = [
  { level: 1, label: 'Level 1: Basic Cashier Training', desc: 'Sales, payment collection, standard receipts' },
  { level: 2, label: 'Level 2: Senior Cashier / Inventory Training', desc: 'Customer refunds, discounts, voids, drawer closing, or stock adjustments' },
  { level: 3, label: 'Level 3: Shift Supervisor Training', desc: 'Drawer balancing approval, void overrides, daily reports, staff oversight' },
  { level: 4, label: 'Level 4: Store Management & Admin', desc: 'Full business control, financial analytics, staff RBAC, branches' }
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = Add, object = Edit

  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cashier',
    trainingLevel: 1,
    permissions: { ...DEFAULT_ROLE_PERMS.cashier },
    active: true
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Dedicated Password Reset Modal State
  const [resetModalUser, setResetModalUser] = useState(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetConfirmVal, setResetConfirmVal] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = () => {
    api('/users').then(data => {
      setUsers(Array.isArray(data) ? data : []);
    }).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setForm({
      name: '',
      username: '',
      password: '',
      role: 'cashier',
      trainingLevel: 1,
      permissions: { ...DEFAULT_ROLE_PERMS.cashier },
      active: true
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    const roleKey = u.role || 'cashier';
    const baseDefaults = DEFAULT_ROLE_PERMS[roleKey] || DEFAULT_ROLE_PERMS.cashier;
    const currentPerms = { ...baseDefaults, ...(u.permissions || {}) };

    setForm({
      name: u.name || '',
      username: u.username || '',
      password: '',
      role: roleKey,
      trainingLevel: u.trainingLevel || ROLES_CONFIG[roleKey]?.level || 1,
      permissions: currentPerms,
      active: u.active !== false
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole) => {
    const roleMeta = ROLES_CONFIG[newRole] || ROLES_CONFIG.cashier;
    const defaults = { ...(DEFAULT_ROLE_PERMS[newRole] || DEFAULT_ROLE_PERMS.cashier) };
    setForm(prev => ({
      ...prev,
      role: newRole,
      trainingLevel: roleMeta.level,
      permissions: defaults
    }));
  };

  const handleResetToRoleDefaults = () => {
    const defaults = { ...(DEFAULT_ROLE_PERMS[form.role] || DEFAULT_ROLE_PERMS.cashier) };
    setForm(prev => ({
      ...prev,
      permissions: defaults
    }));
  };

  const handlePermissionToggle = (key) => {
    // If admin role is selected, all permissions stay on
    if (form.role === 'admin') return;
    setForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const isPermissionsCustomized = useMemo(() => {
    const defaults = DEFAULT_ROLE_PERMS[form.role] || DEFAULT_ROLE_PERMS.cashier;
    return Object.keys(defaults).some(k => Boolean(defaults[k]) !== Boolean(form.permissions[k]));
  }, [form.role, form.permissions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      setErrorMsg('Full name is required');
      return;
    }
    if (!editingUser && (!form.username?.trim() || !form.password)) {
      setErrorMsg('Username and password are required for new staff members');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      if (editingUser) {
        // Edit existing staff
        const payload = {
          name: form.name.trim(),
          role: form.role,
          trainingLevel: +form.trainingLevel,
          permissions: form.permissions,
          active: form.active
        };
        if (form.password?.trim()) {
          payload.password = form.password.trim();
        }
        await api(`/users/${editingUser._id}`, { method: 'PUT', body: payload });
      } else {
        // Create new staff
        const payload = {
          name: form.name.trim(),
          username: form.username.trim(),
          password: form.password,
          role: form.role,
          trainingLevel: +form.trainingLevel,
          permissions: form.permissions
        };
        await api('/users', { method: 'POST', body: payload });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await api(`/users/${u._id}`, { method: 'PUT', body: { active: u.active === false } });
      loadData();
      setToastMessage({
        type: 'success',
        text: `Staff member ${u.name} is now ${u.active === false ? 'Active' : 'Disabled'}.`
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Action failed'
      });
    }
  };

  const openResetPasswordModal = (u) => {
    setResetModalUser(u);
    setResetPasswordVal('');
    setResetConfirmVal('');
    setResetError('');
    setShowResetPassword(false);
  };

  const handleGeneratePin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setResetPasswordVal(pin);
    setResetConfirmVal(pin);
    setShowResetPassword(true);
  };

  const handleExecutePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetPasswordVal || resetPasswordVal.length < 4) {
      setResetError('Password must be at least 4 characters');
      return;
    }
    if (resetPasswordVal !== resetConfirmVal) {
      setResetError('Passwords do not match');
      return;
    }

    setIsResetting(true);
    setResetError('');

    try {
      await api(`/users/${resetModalUser._id}`, {
        method: 'PUT',
        body: { password: resetPasswordVal }
      });
      const userName = resetModalUser.name;
      setResetModalUser(null);
      setToastMessage({
        type: 'success',
        text: `Password for ${userName} updated successfully!`
      });
    } catch (err) {
      setResetError(err.message || 'Password update failed');
    } finally {
      setIsResetting(false);
    }
  };

  // Filtered users
  const q = searchQuery.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      return !q ||
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q);
    });
  }, [users, q]);

  // Summary counts
  const totalCount = users.length;
  const cashiersCount = users.filter(u => u.role === 'cashier' || u.role === 'senior_cashier').length;
  const supervisorsAdminsCount = users.filter(u => u.role === 'supervisor' || u.role === 'admin').length;
  const inventoryCount = users.filter(u => u.role === 'inventory_clerk').length;

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff, Roles &amp; Permissions</h1>
          <p className="page-subtitle">Configure role-based access control (RBAC), training levels, and granular till privileges.</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Add staff member</span>
        </button>
      </div>

      {/* Toast Alert Banner */}
      {toastMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 18,
          background: toastMessage.type === 'success' ? '#eefaf2' : '#fef2f2',
          border: `1px solid ${toastMessage.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: toastMessage.type === 'success' ? '#14532d' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="btn-ghost" style={{ padding: 4 }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Staff</div>
          <div className="kpi-value">{totalCount}</div>
          <div className="kpi-desc">Registered user accounts</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Cashiers &amp; Registers</div>
          <div className="kpi-value" style={{ color: '#0284c7' }}>{cashiersCount}</div>
          <div className="kpi-desc">Level 1 &amp; Level 2 till operators</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Supervisors &amp; Admins</div>
          <div className="kpi-value" style={{ color: '#047857' }}>{supervisorsAdminsCount}</div>
          <div className="kpi-desc">Drawer authority &amp; approvals</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Inventory Clerks</div>
          <div className="kpi-value" style={{ color: '#0f766e' }}>{inventoryCount}</div>
          <div className="kpi-desc">Stock count &amp; purchasing staff</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 320 }}>
          <input
            placeholder="Search by name, username, or role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 34, height: 38, fontSize: 13.5 }}
          />
          <UsersIcon size={16} style={{ position: 'absolute', left: 11, top: 11, color: '#889e90' }} />
        </div>
        <div style={{ fontSize: 13, color: '#687d70', fontWeight: 600 }}>
          Showing {filteredUsers.length} of {users.length} staff members
        </div>
      </div>

      {/* Staff Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Username</th>
              <th>Role</th>
              <th>Training Level</th>
              <th>Privileges Summary</th>
              <th>Status</th>
              <th style={{ width: 220, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                  No staff members found matching "{searchQuery}".
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => {
                const roleMeta = ROLES_CONFIG[u.role] || ROLES_CONFIG.cashier;
                const level = u.trainingLevel || roleMeta.level || 1;
                const initials = (u.name || 'S')
                  .split(' ')
                  .map(p => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                // Compute permissions active count
                const perms = { ...(DEFAULT_ROLE_PERMS[u.role] || {}), ...(u.permissions || {}) };
                const activePermKeys = Object.entries(perms).filter(([_, v]) => v === true).map(([k]) => k);

                return (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: roleMeta.bg,
                          color: roleMeta.color,
                          fontWeight: 700,
                          fontSize: 12.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1.5px solid ${roleMeta.color}33`,
                          flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{u.name}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#44564c' }}>
                      @{u.username}
                    </td>

                    <td>
                      <span className={`role-badge ${roleMeta.badgeClass}`}>
                        {roleMeta.name}
                      </span>
                    </td>

                    <td>
                      <span className={`training-badge lvl-${level}`}>
                        <GraduationCap size={13} />
                        <span>Level {level}</span>
                      </span>
                    </td>

                    <td>
                      <div style={{ maxWidth: 300, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {u.role === 'admin' ? (
                          <span className="perm-chip" style={{ background: '#eef2ff', color: '#4338ca', fontWeight: 700 }}>
                            ★ Full Admin Access (All 11 Permissions)
                          </span>
                        ) : (
                          <>
                            {perms.canSell && <span className="perm-chip">Sell</span>}
                            {perms.canRefund && <span className="perm-chip" style={{ color: '#b45309', background: '#fffbeb' }}>Refunds</span>}
                            {perms.canVoid && <span className="perm-chip" style={{ color: '#b45309', background: '#fffbeb' }}>Void</span>}
                            {(perms.canOpenShift || perms.canCloseShift) && <span className="perm-chip">Drawer</span>}
                            {perms.canAdjustStock && <span className="perm-chip" style={{ color: '#0f766e', background: '#f0fdfa' }}>Stock</span>}
                            {perms.canManagePurchases && <span className="perm-chip" style={{ color: '#0f766e', background: '#f0fdfa' }}>Purchases</span>}
                            {perms.canViewReports && <span className="perm-chip" style={{ color: '#047857', background: '#ecfdf5' }}>Reports</span>}
                            <span style={{ fontSize: 11, color: '#889e90', alignSelf: 'center', marginLeft: 2 }}>
                              ({activePermKeys.length}/11)
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className={`status-pill ${u.active === false ? 'out-of-stock' : 'in-stock'}`}>
                        {u.active === false ? 'Disabled' : 'Active'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn-ghost"
                          onClick={() => openEditModal(u)}
                          style={{ fontSize: 12, padding: '4px 8px', color: '#0e7047' }}
                          title="Edit Role, Training & Permissions"
                        >
                          <Edit3 size={14} style={{ marginRight: 4 }} />
                          <span>Edit</span>
                        </button>

                        <button
                          className="btn-ghost"
                          onClick={() => handleToggleActive(u)}
                          style={{ fontSize: 12, padding: '4px 8px' }}
                        >
                          {u.active === false ? 'Enable' : 'Disable'}
                        </button>

                        <button
                          className="btn-ghost"
                          onClick={() => openResetPasswordModal(u)}
                          style={{ fontSize: 12, padding: '4px 8px', color: '#687d70' }}
                          title="Reset Password"
                        >
                          <KeyRound size={14} />
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

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div 
            className="modal-card" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <div className="modal-title">
                  {editingUser ? `Edit Staff: ${editingUser.name}` : 'Add Staff Member'}
                </div>
                <div style={{ fontSize: 12.5, color: '#687d70', marginTop: 2 }}>
                  Role + Permission + Training Level Access Control
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* Basic Details Section */}
                <div style={{ background: '#fbfdfb', border: '1px solid #e2ebe4', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserCheck size={16} color="var(--brand)" />
                    <span>Account Credentials</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>
                        Full Name *
                      </label>
                      <input
                        placeholder="e.g. Marcus Aurelius"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>
                        Username *
                      </label>
                      <input
                        placeholder="e.g. marcus"
                        value={form.username}
                        disabled={!!editingUser}
                        onChange={e => setForm({ ...form, username: e.target.value })}
                        required
                        style={editingUser ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>
                        {editingUser ? 'New Password (Optional)' : 'Password *'}
                      </label>
                      <input
                        type="password"
                        placeholder={editingUser ? 'Leave blank to retain' : '••••••••'}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        required={!editingUser}
                      />
                    </div>
                  </div>
                </div>

                {/* Role & Training Level Selection */}
                <div style={{ background: '#fbfdfb', border: '1px solid #e2ebe4', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={16} color="var(--brand)" />
                    <span>Role &amp; Training Level</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Role Selection */}
                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>
                        Assigned Role
                      </label>
                      <select
                        value={form.role}
                        onChange={e => handleRoleChange(e.target.value)}
                        style={{ height: 42, fontWeight: 600 }}
                      >
                        <option value="cashier">1. Cashier (Level 1 - Basic sales)</option>
                        <option value="senior_cashier">2. Senior Cashier (Level 2 - Refunds &amp; drawer close)</option>
                        <option value="supervisor">3. Shift Supervisor (Level 3 - Drawer &amp; approvals)</option>
                        <option value="inventory_clerk">4. Inventory / Stock Clerk (Level 2 - Stock &amp; POs)</option>
                        <option value="admin">5. Administrator (Level 4 - Full system control)</option>
                      </select>
                      <p style={{ fontSize: 12, color: '#687d70', marginTop: 6, lineHeight: 1.4 }}>
                        {ROLES_CONFIG[form.role]?.description}
                      </p>
                    </div>

                    {/* Training Level */}
                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>
                        Training Level
                      </label>
                      <select
                        value={form.trainingLevel}
                        onChange={e => setForm({ ...form, trainingLevel: +e.target.value })}
                        style={{ height: 42, fontWeight: 600 }}
                      >
                        {TRAINING_LEVELS.map(t => (
                          <option key={t.level} value={t.level}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <p style={{ fontSize: 12, color: '#687d70', marginTop: 6, lineHeight: 1.4 }}>
                        {TRAINING_LEVELS.find(t => t.level === +form.trainingLevel)?.desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Granular Permissions Matrix */}
                <div style={{ background: '#fbfdfb', border: '1px solid #e2ebe4', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                        Granular Permission Privileges
                      </div>
                      <div style={{ fontSize: 12, color: '#687d70', marginTop: 2 }}>
                        {form.role === 'admin' ? (
                          <span style={{ color: '#4338ca', fontWeight: 600 }}>Administrators possess all permissions by default.</span>
                        ) : isPermissionsCustomized ? (
                          <span style={{ color: '#b45309', fontWeight: 600 }}>Customized permissions applied (overrides role standard).</span>
                        ) : (
                          <span>Standard permissions for {ROLES_CONFIG[form.role]?.name}.</span>
                        )}
                      </div>
                    </div>

                    {form.role !== 'admin' && (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={handleResetToRoleDefaults}
                        style={{ fontSize: 12, padding: '4px 8px', color: '#0e7047', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <RotateCcw size={13} />
                        <span>Reset Defaults</span>
                      </button>
                    )}
                  </div>

                  {/* Permission Groups */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                    {PERMISSION_GROUPS.map(group => {
                      const Icon = group.icon;
                      return (
                        <div 
                          key={group.title} 
                          style={{ 
                            background: '#ffffff', 
                            border: '1px solid #e7efe9', 
                            borderRadius: 8, 
                            padding: '12px 14px' 
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#27382d', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #f0f5f1', paddingBottom: 6 }}>
                            <Icon size={14} color="var(--brand)" />
                            <span>{group.title}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {group.items.map(it => {
                              const isChecked = form.role === 'admin' ? true : Boolean(form.permissions[it.key]);
                              const isDisabled = form.role === 'admin';

                              return (
                                <label 
                                  key={it.key} 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'flex-start', 
                                    gap: 8, 
                                    cursor: isDisabled ? 'default' : 'pointer',
                                    userSelect: 'none'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={() => handlePermissionToggle(it.key)}
                                    style={{ 
                                      width: 16, 
                                      height: 16, 
                                      marginTop: 2, 
                                      accentColor: 'var(--brand)', 
                                      cursor: isDisabled ? 'default' : 'pointer' 
                                    }}
                                  />
                                  <div>
                                    <div style={{ fontSize: 12.5, fontWeight: 600, color: isChecked ? 'var(--ink)' : '#7a8d81' }}>
                                      {it.label}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#889e90', lineHeight: 1.3 }}>
                                      {it.desc}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {errorMsg && (
                  <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '10px 14px', borderRadius: 8, border: '1px solid #fee2e2' }}>
                    {errorMsg}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ borderTop: '1px solid #e8ede9', padding: '14px 24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving Changes...' : editingUser ? 'Update Staff Member' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Reset Password Modal */}
      {resetModalUser && (
        <div className="modal-overlay" onClick={() => setResetModalUser(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} color="var(--brand)" />
                <div className="modal-title">Reset Staff Password</div>
              </div>
              <button onClick={() => setResetModalUser(null)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecutePasswordReset}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Staff Member Card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8faf8', border: '1px solid #e2ebe4', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: ROLES_CONFIG[resetModalUser.role]?.bg || '#f0f9ff',
                    color: ROLES_CONFIG[resetModalUser.role]?.color || '#0284c7',
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1.5px solid ${ROLES_CONFIG[resetModalUser.role]?.color || '#0284c7'}33`
                  }}>
                    {(resetModalUser.name || 'S').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{resetModalUser.name}</div>
                    <div style={{ fontSize: 12, color: '#687d70', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>@{resetModalUser.username}</span>
                      <span>·</span>
                      <span className={`role-badge ${ROLES_CONFIG[resetModalUser.role]?.badgeClass || 'cashier'}`} style={{ fontSize: 10.5, padding: '1px 6px' }}>
                        {ROLES_CONFIG[resetModalUser.role]?.name || 'Staff'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Password field with PIN Generator */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a' }}>
                      New Password *
                    </label>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={handleGeneratePin}
                      style={{ fontSize: 11.5, color: 'var(--brand)', padding: '2px 6px', fontWeight: 700 }}
                    >
                      Generate 6-Digit PIN
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      placeholder="Enter new password (min. 4 chars)"
                      value={resetPasswordVal}
                      onChange={e => setResetPasswordVal(e.target.value)}
                      required
                      autoFocus
                      style={{ paddingRight: 38 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      style={{ position: 'absolute', right: 8, top: 10, color: '#7a8d81', padding: 4 }}
                      title={showResetPassword ? 'Hide password' : 'Show password'}
                    >
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password field */}
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>
                    Confirm Password *
                  </label>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={resetConfirmVal}
                    onChange={e => setResetConfirmVal(e.target.value)}
                    required
                  />
                </div>

                {resetError && (
                  <div style={{ color: '#dc2626', fontSize: 12.5, background: '#fef2f2', padding: '8px 12px', borderRadius: 8, border: '1px solid #fee2e2' }}>
                    {resetError}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e8ede9', padding: '14px 24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setResetModalUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isResetting || !resetPasswordVal}>
                  {isResetting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
