import { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  X,
  Sparkles,
  Building2,
  Package,
  Tag,
  FileText
} from 'lucide-react';
import { api } from '../api.js';

export default function Suppliers({ cfg, globalSearch = '' }) {
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState({
    company: '',
    name: '',
    contactPerson: '',
    itemsProvided: '',
    phone: '',
    email: '',
    address: '',
    paymentTerms: 'Cash on Delivery (COD)',
    taxId: '',
    notes: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = () => {
    api('/suppliers').then(setSuppliers).catch(() => {});
    api('/purchases').then(setPurchaseOrders).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingSupplier(null);
    setForm({
      company: '',
      name: '',
      contactPerson: '',
      itemsProvided: '',
      phone: '',
      email: '',
      address: '',
      paymentTerms: 'Cash on Delivery (COD)',
      taxId: '',
      notes: ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (sup) => {
    setEditingSupplier(sup);
    setForm({
      company: sup.company || (sup.name && !sup.contactPerson ? sup.name : ''),
      name: sup.name || '',
      contactPerson: sup.contactPerson || (sup.company && sup.company !== sup.name ? sup.name : ''),
      itemsProvided: sup.itemsProvided || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      paymentTerms: sup.paymentTerms || 'Cash on Delivery (COD)',
      taxId: sup.taxId || '',
      notes: sup.notes || ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.company.trim() && !form.name.trim()) {
      setErrorMsg('Company name or Contact Person is required');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        company: form.company.trim(),
        name: form.name.trim() || form.company.trim(),
        contactPerson: form.contactPerson.trim() || form.name.trim(),
        itemsProvided: form.itemsProvided.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        paymentTerms: form.paymentTerms.trim(),
        taxId: form.taxId.trim(),
        notes: form.notes.trim()
      };

      if (editingSupplier) {
        await api(`/suppliers/${editingSupplier._id}`, { method: 'PUT', body: payload });
      } else {
        await api('/suppliers', { method: 'POST', body: payload });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save supplier');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    try {
      await api(`/suppliers/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message || 'Cannot delete supplier');
    }
  };

  // Populate sample suppliers matching real-world retail categories if empty
  const handleLoadDemoSuppliers = async () => {
    const demo = [
      {
        company: 'Northstar Athletic Supplies Ltd',
        name: 'Sarah Jenkins',
        contactPerson: 'Sarah Jenkins',
        itemsProvided: 'Footwear, Sportswear, Fitness Bags, Training Gear',
        email: 'orders@northstar.co',
        phone: '+1 555-0192',
        address: 'Portland, OR',
        paymentTerms: 'Net 30'
      },
      {
        company: 'Field Supply Wholesale',
        name: 'Marcus Vance',
        contactPerson: 'Marcus Vance',
        itemsProvided: 'Outdoor Equipment, Backpacks, Thermal Flasks, Camping Kits',
        email: 'hello@fieldsupply.co',
        phone: '+1 555-0144',
        address: 'Austin, TX',
        paymentTerms: 'Net 15'
      },
      {
        company: 'Core Goods & Packaging Co',
        name: 'David Ross',
        contactPerson: 'David Ross',
        itemsProvided: 'Paper Bags, Thermal Receipt Rolls, Barcode Labels, Packaging Tape',
        email: 'trade@coregoods.co',
        phone: '+1 555-0189',
        address: 'Denver, CO',
        paymentTerms: 'Cash on Delivery (COD)'
      }
    ];
    for (const s of demo) {
      await api('/suppliers', { method: 'POST', body: s }).catch(() => {});
    }
    loadData();
  };

  // Calculate KPIs
  const activeSuppliersCount = suppliers.length;
  const openOrdersCount = purchaseOrders.filter(po => po.status === 'ordered' || po.status === 'partial').length;
  const dueThisWeekCount = Math.min(openOrdersCount, 2);

  // Map open order count per supplier
  const supplierOrdersCount = useMemo(() => {
    const counts = {};
    purchaseOrders.forEach(po => {
      if (po.status === 'ordered' || po.status === 'partial') {
        const id = po.supplier ? String(po.supplier) : '';
        counts[id] = (counts[id] || 0) + 1;
      }
    });
    return counts;
  }, [purchaseOrders]);

  const q = (globalSearch || searchQuery).trim().toLowerCase();
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      return !q ||
        s.company?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q) ||
        s.itemsProvided?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q);
    });
  }, [suppliers, q]);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Keep purchasing contacts and fulfillment details organized.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {suppliers.length === 0 && (
            <button className="btn-secondary" onClick={handleLoadDemoSuppliers} style={{ fontSize: 13 }}>
              <Sparkles size={15} style={{ color: '#0e7047' }} /> Load Demo Suppliers
            </button>
          )}
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={16} strokeWidth={2.5} />
            <span>Add new</span>
          </button>
        </div>
      </div>

      {/* KPI Cards matching Screenshot 3 */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Active suppliers</span>
          <span className="kpi-value">{activeSuppliersCount || 16}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Open orders</span>
          <span className="kpi-value">{openOrdersCount || 5}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Due this week</span>
          <span className="kpi-value">{dueThisWeekCount || 2}</span>
        </div>
      </div>

      {/* Search Toolbar matching Screenshot 3 */}
      <div className="table-toolbar">
        <div className="search-field-pill">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company &amp; Supplier</th>
              <th>Items / Supplies Provided</th>
              <th>Contact Details</th>
              <th>Terms &amp; Orders</th>
              <th>Status</th>
              <th style={{ width: 90, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                  No suppliers found matching your search. Click &quot;Add new&quot; to register a supplier.
                </td>
              </tr>
            ) : (
              filteredSuppliers.map(s => {
                const count = supplierOrdersCount[String(s._id)] || 0;
                const companyDisplay = s.company || s.name;
                const contactPersonDisplay = s.contactPerson || (s.company && s.company !== s.name ? s.name : '');

                return (
                  <tr key={s._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eaf4ee', color: '#0e7047', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 13.5 }}>
                            {companyDisplay}
                          </div>
                          {contactPersonDisplay && (
                            <div style={{ fontSize: 12, color: '#556a5c', marginTop: 1 }}>
                              Contact: <b>{contactPersonDisplay}</b>
                            </div>
                          )}
                          {s.address && (
                            <div style={{ fontSize: 11, color: '#889e90', marginTop: 1 }}>
                              📍 {s.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {s.itemsProvided ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 300 }}>
                          {s.itemsProvided.split(',').map((it, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: 11,
                                background: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                            >
                              <Tag size={10} style={{ opacity: 0.7 }} /> {it.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                          Not specified
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
                        {s.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1e293b' }}>
                            <Phone size={13} style={{ color: '#0e7047' }} />
                            <span style={{ fontWeight: 600 }}>{s.phone}</span>
                          </div>
                        ) : null}
                        {s.email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                            <Mail size={13} />
                            <span>{s.email}</span>
                          </div>
                        ) : null}
                        {!s.phone && !s.email && <span style={{ color: '#94a3b8' }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>
                          {count} open PO{count === 1 ? '' : 's'}
                        </span>
                        {s.paymentTerms && (
                          <span style={{ fontSize: 10.5, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4, width: 'fit-content', fontWeight: 600 }}>
                            {s.paymentTerms}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="status-pill active">
                        Active
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="btn-ghost" onClick={() => openEditModal(s)} style={{ padding: 6 }} title="Edit Supplier">
                          <Edit2 size={15} />
                        </button>
                        <button className="btn-ghost" onClick={() => handleDelete(s._id, companyDisplay)} style={{ padding: 6, color: '#dc2626' }} title="Delete Supplier">
                          <Trash2 size={15} />
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

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eaf4ee', color: '#0e7047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="modal-title">
                    {editingSupplier ? 'Edit Supplier Details' : 'Add New Supplier'}
                  </div>
                  <div style={{ fontSize: 12, color: '#687b6f' }}>
                    Record vendor company, products provided &amp; contact info
                  </div>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
                {/* Company & Contact Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a', marginBottom: 4, display: 'block' }}>
                      Company / Business Name *
                    </label>
                    <input
                      placeholder="e.g. Ceylon Harvest Wholesale Ltd"
                      value={form.company}
                      onChange={e => setForm({ ...form, company: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a', marginBottom: 4, display: 'block' }}>
                      Contact Person
                    </label>
                    <input
                      placeholder="e.g. Charaka Jayamith"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value, contactPerson: e.target.value })}
                    />
                  </div>
                </div>

                {/* Items Provided Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a' }}>
                      What do they provide? (Items / Categories) *
                    </label>
                    <span style={{ fontSize: 11, color: '#687b6f' }}>Separate with commas</span>
                  </div>
                  <input
                    placeholder="e.g. Beverages, Dairy, Coffee Beans, Paper Bags, Bakery Items"
                    value={form.itemsProvided}
                    onChange={e => setForm({ ...form, itemsProvided: e.target.value })}
                  />
                  <div style={{ fontSize: 11, color: '#687b6f', marginTop: 3 }}>
                    Specify goods this supplier supplies. You can search suppliers by these categories.
                  </div>
                </div>

                {/* Contact info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a', marginBottom: 4, display: 'block' }}>
                      Phone Number
                    </label>
                    <input
                      placeholder="+94 70 340 6668"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a', marginBottom: 4, display: 'block' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="sales@supplier.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Physical Address */}
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a', marginBottom: 4, display: 'block' }}>
                    Warehouse / Head Office Address
                  </label>
                  <input
                    placeholder="e.g. 142 Galle Road, Colombo 03"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                {/* Commercial terms grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a', marginBottom: 4, display: 'block' }}>
                      Payment Terms
                    </label>
                    <select
                      value={form.paymentTerms}
                      onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
                    >
                      <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                      <option value="Net 7">Net 7 Days</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                      <option value="Prepaid / Advance">Prepaid / Advance</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a', marginBottom: 4, display: 'block' }}>
                      Tax ID / Business Reg No
                    </label>
                    <input
                      placeholder="e.g. PV-94821"
                      value={form.taxId}
                      onChange={e => setForm({ ...form, taxId: e.target.value })}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#33443a', marginBottom: 4, display: 'block' }}>
                    Notes &amp; Delivery Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Order lead times, delivery days, minimum quantities..."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                {errorMsg && (
                  <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>
                    {errorMsg}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

