import { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  LayoutGrid, 
  List, 
  X, 
  Upload, 
  Sparkles,
  Barcode,
  Layers
} from 'lucide-react';
import { api } from '../api.js';

export default function Products({ cfg, globalSearch = '', onNavigate }) {
  const { currency = '$', features = {} } = cfg || {};

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const blankForm = {
    name: '',
    category: '',
    brand: '',
    sku: '',
    barcode: '',
    image: '',
    price: '',
    cost: '',
    stock: '',
    trackStock: true,
    batchNo: '',
    expiryDate: '',
    requiresPrescription: false
  };

  const [form, setForm] = useState(blankForm);

  const loadData = () => {
    api('/products').then(setProducts).catch(() => {});
    api('/categories').then(setCategories).catch(() => {});
    api('/brands').then(setBrands).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(blankForm);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      category: product.category || '',
      brand: product.brand || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      image: product.image || '',
      price: product.price ?? '',
      cost: product.cost ?? '',
      stock: product.stock ?? '',
      trackStock: product.trackStock ?? true,
      batchNo: product.batchNo || '',
      expiryDate: product.expiryDate ? product.expiryDate.slice(0, 10) : '',
      requiresPrescription: !!product.requiresPrescription
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Image upload with canvas resize
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 400 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setForm(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.8) }));
    };
    img.src = URL.createObjectURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    if (form.price === '' || isNaN(+form.price)) {
      setErrorMsg('Please enter a valid price.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        ...form,
        price: +form.price,
        cost: +form.cost || 0,
        stock: form.trackStock ? (+form.stock || 0) : 0,
        expiryDate: form.expiryDate || undefined
      };

      if (editingProduct) {
        await api(`/products/${editingProduct._id}`, { method: 'PUT', body: payload });
      } else {
        await api('/products', { method: 'POST', body: payload });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // One-click demo data population matching screenshot
  const handleLoadDemoProducts = async () => {
    const demoItems = [
      {
        name: 'Velocity Trainer',
        category: 'Footwear',
        brand: 'Verdant Athletics',
        price: 128.00,
        cost: 65.00,
        stock: 12,
        trackStock: true,
        barcode: '1000101',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Pace Shorts 5"',
        category: 'Apparel',
        brand: 'Verdant Athletics',
        price: 42.00,
        cost: 18.00,
        stock: 34,
        trackStock: true,
        barcode: '1000102',
        image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Hydro Flask 750ml',
        category: 'Equipment',
        brand: 'Hydro Tech',
        price: 34.00,
        cost: 15.00,
        stock: 28,
        trackStock: true,
        barcode: '1000103',
        image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Core Foam Roller',
        category: 'Recovery',
        brand: 'FlexiForm',
        price: 28.00,
        cost: 11.00,
        stock: 8,
        trackStock: true,
        barcode: '1000104',
        image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Split Hoodie',
        category: 'Apparel',
        brand: 'Verdant Athletics',
        price: 64.00,
        cost: 28.00,
        stock: 19,
        trackStock: true,
        barcode: '1000105',
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Grip Socks 3-pack',
        category: 'Apparel',
        brand: 'Verdant Athletics',
        price: 18.00,
        cost: 6.00,
        stock: 44,
        trackStock: true,
        barcode: '1000106',
        image: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Band Set Pro',
        category: 'Equipment',
        brand: 'FlexiForm',
        price: 22.00,
        cost: 8.50,
        stock: 15,
        trackStock: true,
        barcode: '1000107',
        image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'Fuel Bar x12',
        category: 'Recovery',
        brand: 'NutriPro',
        price: 30.00,
        cost: 14.00,
        stock: 60,
        trackStock: true,
        barcode: '1000108',
        image: 'https://images.unsplash.com/photo-1622484216850-25256e2671b1?w=600&auto=format&fit=crop&q=80'
      }
    ];

    try {
      for (const item of demoItems) {
        await api('/products', { method: 'POST', body: item }).catch(() => {});
      }
      loadData();
    } catch {}
  };

  // KPIs
  const activeProductsCount = products.length;
  const uniqueCategoriesCount = new Set(products.map(p => p.category).filter(Boolean)).size;
  const avgPrice = activeProductsCount > 0
    ? products.reduce((sum, p) => sum + (p.price || 0), 0) / activeProductsCount
    : 0;

  // Filtered
  const q = (globalSearch || searchQuery).trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      return !q ||
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q);
    });
  }, [products, q]);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage pricing, categories, and sellable items.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {onNavigate && (
            <button className="btn-secondary" onClick={() => onNavigate('lists')} style={{ fontSize: 13 }}>
              <Layers size={15} /> Categories &amp; Brands
            </button>
          )}
          {products.length === 0 && (
            <button className="btn-secondary" onClick={handleLoadDemoProducts} style={{ fontSize: 13 }}>
              <Sparkles size={15} style={{ color: '#0e7047' }} /> Load Demo Catalog
            </button>
          )}
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={16} strokeWidth={2.5} />
            <span>Add new</span>
          </button>
        </div>
      </div>

      {/* KPI Cards matching Screenshot 1 */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Active products</span>
          <span className="kpi-value">{activeProductsCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Categories</span>
          <span className="kpi-value">{uniqueCategoriesCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Average price</span>
          <span className="kpi-value">{currency} {avgPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Search & View Toggle Toolbar */}
      <div className="table-toolbar">
        <div className="search-field-pill">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="view-toggle-group">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Products Table matching Screenshot 1 */}
      {viewMode === 'list' ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}></th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#889e90' }}>
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p._id}>
                    <td>
                      {p.image ? (
                        <img src={p.image} alt="" style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 38, height: 38, borderRadius: 6, background: '#eef3ec', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c8e80' }}>
                          <Package size={18} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-secondary)', display: 'flex', gap: 8 }}>
                        {p.sku && <span>SKU: {p.sku}</span>}
                        {p.barcode && <span>Code: {p.barcode}</span>}
                      </div>
                    </td>
                    <td>{p.category || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{currency} {p.price.toFixed(2)}</td>
                    <td>
                      {p.trackStock ? (
                        <span className={`status-pill ${p.stock <= 0 ? 'out-of-stock' : p.stock <= 5 ? 'low-stock' : 'in-stock'}`}>
                          {p.stock}
                        </span>
                      ) : (
                        <span style={{ color: '#889e90' }}>Unlimited</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => openEditModal(p)}
                          style={{ padding: 6 }}
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleDelete(p._id, p.name)}
                          style={{ padding: 6, color: '#dc2626' }}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="products-grid">
          {filteredProducts.map(p => (
            <div key={p._id} className="product-card">
              <div className="product-image-box">
                {p.image ? (
                  <img src={p.image} alt={p.name} />
                ) : (
                  <Package size={36} style={{ color: '#889e90' }} />
                )}
              </div>
              <div className="product-card-body">
                <div>
                  <div className="product-title">{p.name}</div>
                  <div className="product-variant">{p.category || 'General'}</div>
                </div>
                <div className="product-footer-row" style={{ marginTop: 12 }}>
                  <div className="product-price">{currency} {p.price.toFixed(2)}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" onClick={() => openEditModal(p)} style={{ padding: 4 }}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-ghost" onClick={() => handleDelete(p._id, p.name)} style={{ padding: 4, color: '#dc2626' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Product Name *</label>
                  <input
                    placeholder="e.g. Velocity Trainer"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a' }}>Category</label>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = prompt('Enter new Category name:');
                          if (!val || !val.trim()) return;
                          try {
                            const res = await api('/categories', { method: 'POST', body: { name: val.trim() } });
                            loadData();
                            setForm(prev => ({ ...prev, category: res.name }));
                          } catch (err) {
                            alert(err.message || 'Failed to create category');
                          }
                        }}
                        className="btn-ghost"
                        style={{ fontSize: 11.5, padding: '1px 6px', color: '#0e7047', fontWeight: 700 }}
                      >
                        + New
                      </button>
                    </div>
                    <select
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                    >
                      <option value="">Choose category...</option>
                      {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a' }}>Brand</label>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = prompt('Enter new Brand name:');
                          if (!val || !val.trim()) return;
                          try {
                            const res = await api('/brands', { method: 'POST', body: { name: val.trim() } });
                            loadData();
                            setForm(prev => ({ ...prev, brand: res.name }));
                          } catch (err) {
                            alert(err.message || 'Failed to create brand');
                          }
                        }}
                        className="btn-ghost"
                        style={{ fontSize: 11.5, padding: '1px 6px', color: '#0e7047', fontWeight: 700 }}
                      >
                        + New
                      </button>
                    </div>
                    <select
                      value={form.brand}
                      onChange={e => setForm({ ...form, brand: e.target.value })}
                    >
                      <option value="">Choose brand...</option>
                      {brands.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Product Photo</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {form.image ? (
                      <img src={form.image} alt="" style={{ width: 54, height: 54, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: 54, height: 54, borderRadius: 8, background: '#edf2ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c8e80' }}>
                        <Upload size={20} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: 12, padding: '6px' }} />
                      <input
                        type="url"
                        placeholder="Or enter image URL..."
                        value={form.image.startsWith('data:') ? '' : form.image}
                        onChange={e => setForm({ ...form, image: e.target.value })}
                        style={{ marginTop: 6, fontSize: 12, padding: '6px 10px' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Retail Price ({currency}) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.price}
                      onChange={e => setForm({ ...form, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Unit Cost ({currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.cost}
                      onChange={e => setForm({ ...form, cost: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>Barcode (EAN/UPC)</label>
                    <input
                      placeholder="Scan or type code"
                      value={form.barcode}
                      onChange={e => setForm({ ...form, barcode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33443a', marginBottom: 4, display: 'block' }}>SKU</label>
                    <input
                      placeholder="Auto-generated if empty"
                      value={form.sku}
                      onChange={e => setForm({ ...form, sku: e.target.value })}
                    />
                  </div>
                </div>

                {/* Stock Tracking */}
                <div style={{ background: '#f8faf7', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={form.trackStock}
                      onChange={e => setForm({ ...form, trackStock: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    <span>Track inventory stock count</span>
                  </label>
                  {form.trackStock && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: 12.5, color: '#556a5c', marginBottom: 4, display: 'block' }}>Current Stock Units</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={form.stock}
                        onChange={e => setForm({ ...form, stock: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* Pharmacy / Batch features */}
                {features.batch && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      placeholder="Batch No."
                      value={form.batchNo}
                      onChange={e => setForm({ ...form, batchNo: e.target.value })}
                    />
                    <input
                      type="date"
                      value={form.expiryDate}
                      onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                    />
                  </div>
                )}

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
                  {isSaving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

