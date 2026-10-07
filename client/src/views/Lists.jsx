import { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, Tag, Check, AlertCircle, Sparkles, Search } from 'lucide-react';
import { api } from '../api.js';

export default function Lists() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api('/products').then(setProducts).catch(() => {});
  }, []);

  return (
    <div style={{ padding: '24px 28px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories &amp; Brands</h1>
          <p className="page-subtitle">Organize your store catalog into searchable categories and brand collections.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
        <ListEditor
          title="Categories"
          path="/categories"
          icon={Layers}
          placeholder="New category name (e.g. Accessories)..."
          suggestions={['Apparel', 'Footwear', 'Equipment', 'Recovery', 'Accessories', 'Nutrition', 'Supplements', 'Outdoor']}
          products={products}
          field="category"
        />
        <ListEditor
          title="Brands"
          path="/brands"
          icon={Tag}
          placeholder="New brand name (e.g. Nike)..."
          suggestions={['Nike', 'Adidas', 'Under Armour', 'Puma', 'Patagonia', 'Hydro Tech', 'FlexiForm', 'NutriPro']}
          products={products}
          field="brand"
        />
      </div>
    </div>
  );
}

function ListEditor({ title, path, icon: Icon, placeholder, suggestions = [], products = [], field }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const loadData = () => {
    api(path).then(setItems).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, [path]);

  const handleAdd = async (e, customValue) => {
    if (e && e.preventDefault) e.preventDefault();
    const val = (customValue || name).trim();
    if (!val) {
      setErrorMsg(`Please enter a ${title.toLowerCase().slice(0, -1)} name.`);
      return;
    }

    // Check if already exists in loaded items
    const alreadyExists = items.some(it => it.name.toLowerCase() === val.toLowerCase());
    if (alreadyExists) {
      setErrorMsg(`"${val}" already exists in ${title}.`);
      return;
    }

    setIsAdding(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const created = await api(path, { method: 'POST', body: { name: val } });
      setName('');
      setSuccessMsg(`"${created.name}" created successfully!`);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || `Failed to add ${title.toLowerCase().slice(0, -1)}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRename = async (item) => {
    const newName = prompt(`Rename "${item.name}" to:`, item.name);
    if (!newName || newName.trim() === item.name) return;
    try {
      await api(`${path}/${item._id}`, { method: 'PUT', body: { name: newName.trim() } });
      loadData();
    } catch (err) {
      alert(err.message || 'Rename failed');
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api(`${path}/${item._id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message || 'Cannot delete item. Some products may still use it.');
    }
  };

  // Count products using each item
  const getProductCount = (itemName) => {
    return products.filter(p => p[field] && p[field].toLowerCase() === itemName.toLowerCase()).length;
  };

  // Filter items by search
  const filteredItems = items.filter(it => 
    !search.trim() || it.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  // Suggestions not yet in the list
  const unusedSuggestions = suggestions.filter(s => 
    !items.some(it => it.name.toLowerCase() === s.toLowerCase())
  );

  return (
    <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e4f3ea', color: '#0e7047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{title}</h2>
            <div style={{ fontSize: 12.5, color: '#687b6f' }}>
              {items.length} {items.length === 1 ? title.toLowerCase().slice(0, -1) : title.toLowerCase()} registered
            </div>
          </div>
        </div>
      </div>

      {/* Creation Form */}
      <form onSubmit={e => handleAdd(e)} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder={placeholder}
            value={name}
            onChange={e => { setName(e.target.value); setErrorMsg(''); }}
            style={{ flex: 1, minWidth: 0, height: 42 }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={isAdding}
            style={{ flexShrink: 0, height: 42, padding: '0 18px', whiteSpace: 'nowrap' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{isAdding ? 'Adding...' : 'Add'}</span>
          </button>
        </div>
      </form>

      {/* Feedback Messages */}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: 12.5, background: '#fef2f2', border: '1px solid #fee2e2', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0e7047', fontSize: 12.5, background: '#e4f3ea', border: '1px solid #cce8d7', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
          <Check size={15} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Quick Suggestions Chips */}
      {unusedSuggestions.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#637568', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Quick suggestions (Click to add)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unusedSuggestions.slice(0, 5).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleAdd(null, s)}
                style={{
                  background: '#f4f7f4',
                  border: '1px solid var(--border)',
                  borderRadius: 99,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#243b2c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#0e7047'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span>+ {s}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Filter if more than 5 items */}
      {items.length > 5 && (
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#88998d' }} />
          <input
            type="text"
            placeholder={`Filter ${title.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30, height: 34, fontSize: 12.5 }}
          />
        </div>
      )}

      {/* Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px', color: '#889e90', fontSize: 13, background: '#fafcf9', borderRadius: 10, border: '1px dashed var(--border)' }}>
            No {title.toLowerCase()} added yet. Type a name above or choose from suggestions.
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px', color: '#889e90', fontSize: 12.5 }}>
            No matching {title.toLowerCase()} found.
          </div>
        ) : (
          filteredItems.map(item => {
            const count = getProductCount(item.name);
            return (
              <div
                key={item._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: '#fbfdfa',
                  border: '1px solid var(--border-subtle)',
                  transition: 'background-color 0.1s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f3f7f3'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#fbfdfa'}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{item.name}</span>
                  {count > 0 && (
                    <span style={{ fontSize: 11.5, color: '#687b6f', marginLeft: 8 }}>
                      ({count} {count === 1 ? 'product' : 'products'})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => handleRename(item)}
                    style={{ padding: 5, color: '#556a5c' }}
                    title="Rename"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => handleDelete(item)}
                    style={{ padding: 5, color: '#dc2626' }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
