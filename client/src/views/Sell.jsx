import { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  LayoutGrid, 
  List, 
  ChevronRight, 
  Sparkles,
  Check,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api.js';
import { sound } from '../sound.js';
import OrderPanel from '../components/OrderPanel.jsx';
import CustomerPickerModal from '../components/CustomerPickerModal.jsx';
import ReceiptModal from '../components/ReceiptModal.jsx';
import HeldOrdersModal from '../components/HeldOrdersModal.jsx';
import { enqueueOfflineSale } from '../offlineSync.js';

export default function Sell({ cfg, globalSearch = '', barcodeToScan = null, onClearBarcodeScan, activeBranch = null }) {
  const { currency = '$', features = {} } = cfg || {};

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [localSearch, setLocalSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parked / Held orders state
  const [heldOrders, setHeldOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pos_held_orders') || '[]');
    } catch {
      return [];
    }
  });
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);

  // Order numbering
  const [orderNumber] = useState(() => Math.floor(1000 + Math.random() * 9000));

  // Load products & categories
  const loadProducts = () => {
    api('/products').then(data => setProducts(data)).catch(() => {});
  };

  const loadCategories = () => {
    api('/categories').then(data => setCategories(data)).catch(() => {});
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // Handle barcode scanned from TopBar / Barcode modal
  useEffect(() => {
    if (barcodeToScan) {
      const match = products.find(p => p.barcode === barcodeToScan || p.sku === barcodeToScan);
      if (match) {
        addToCart(match);
      } else {
        alert(`No product found with barcode: ${barcodeToScan}`);
      }
      if (onClearBarcodeScan) onClearBarcodeScan();
    }
  }, [barcodeToScan, products]);

  // Save held orders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pos_held_orders', JSON.stringify(heldOrders));
    } catch {}
  }, [heldOrders]);

  // Add to cart with audio feedback
  const addToCart = (product) => {
    if (product.trackStock && product.stock <= 0) {
      alert(`"${product.name}" is currently out of stock!`);
      return;
    }
    sound.playBeep();
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item._id === product._id);
      if (existingIdx >= 0) {
        return prev.map((item, idx) => 
          idx === existingIdx ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => 
      prev
        .map(item => item._id === id ? { ...item, qty: item.qty + delta } : item)
        .filter(item => item.qty > 0)
    );
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Park current order
  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    const newHold = {
      id: Date.now(),
      orderNo: orderNumber,
      cart: [...cart],
      customer,
      time: new Date().toISOString()
    };
    setHeldOrders(prev => [newHold, ...prev]);
    setCart([]);
    setCustomer(null);
    setIsMobileCartOpen(false);
  };

  const handleResumeOrder = (held) => {
    setCart(held.cart);
    setCustomer(held.customer || null);
    setHeldOrders(prev => prev.filter(o => o.id !== held.id));
  };

  const handleDeleteHeldOrder = (id) => {
    setHeldOrders(prev => prev.filter(o => o.id !== id));
  };

  // Complete checkout API
  const handleCompleteSale = async (orderPayload) => {
    setIsSubmitting(true);
    const saleBody = {
      items: orderPayload.cart.map(it => ({ product: it._id, qty: it.qty, price: it.price, name: it.name })),
      subtotal: orderPayload.cart.reduce((s, it) => s + it.qty * it.price, 0),
      discount: orderPayload.discount,
      total: orderPayload.total,
      paymentMethod: orderPayload.paymentMethod,
      approvalCode: orderPayload.approvalCode,
      last4: orderPayload.last4,
      cardType: orderPayload.cardType,
      paid: orderPayload.paid,
      change: Math.max(0, (orderPayload.paid || 0) - (orderPayload.total || 0)),
      customerId: orderPayload.customer?._id,
      customerName: orderPayload.customer?.name,
      redeemPoints: orderPayload.redeemPoints,
      orderType: orderPayload.orderType,
      tableNo: orderPayload.tableNo,
      notes: orderPayload.notes,
      prescriptionNo: orderPayload.prescriptionNo,
      branchId: activeBranch?._id || localStorage.activeBranchId,
      branchName: activeBranch?.name || localStorage.activeBranchName,
      branchCode: activeBranch?.code || localStorage.activeBranchCode
    };

    // If device is offline, immediately enqueue and print offline receipt
    if (!navigator.onLine) {
      const offlineSale = enqueueOfflineSale(saleBody);
      sound.playSuccess();
      setCart([]);
      setCustomer(null);
      setIsMobileCartOpen(false);
      setReceiptSale(offlineSale);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await api('/sales', {
        method: 'POST',
        body: saleBody
      });

      sound.playSuccess();
      setCart([]);
      setCustomer(null);
      setIsMobileCartOpen(false);
      setReceiptSale(res);
      loadProducts(); // refresh stock numbers
    } catch (err) {
      // If error is network related, fallback to offline queue gracefully
      if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('network')) {
        const offlineSale = enqueueOfflineSale(saleBody);
        sound.playSuccess();
        setCart([]);
        setCustomer(null);
        setIsMobileCartOpen(false);
        setReceiptSale(offlineSale);
      } else {
        alert(err.message || 'Sale could not be completed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic distinct categories: combination of DB categories + any distinct from products
  const categoryList = useMemo(() => {
    const set = new Set(['All']);
    categories.forEach(c => c.name && set.add(c.name));
    products.forEach(p => p.category && set.add(p.category));
    // If empty demo, provide default nice tabs
    if (set.size === 1) {
      ['Apparel', 'Footwear', 'Equipment', 'Recovery'].forEach(c => set.add(c));
    }
    return Array.from(set);
  }, [categories, products]);

  // Filtered products based on search & category
  const filteredProducts = useMemo(() => {
    const q = (globalSearch || localSearch).trim().toLowerCase();
    return products.filter(p => {
      const matchesCategory = activeCategory === 'All' || (p.category && p.category.toLowerCase() === activeCategory.toLowerCase());
      const matchesQuery = !q || 
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [products, activeCategory, globalSearch, localSearch]);

  const cartTotalAmount = cart.reduce((s, it) => s + it.qty * it.price, 0);
  const cartItemsCount = cart.reduce((s, it) => s + it.qty, 0);

  return (
    <div className="pos-layout">
      {/* Catalog & Search Column */}
      <div className="pos-catalog-column">
        {/* Category Horizontal Filter Chips */}
        <div className="category-chips-bar hide-scrollbar">
          {categoryList.map(cat => (
            <button
              key={cat}
              type="button"
              className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View toolbar & product count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#687b6f', fontWeight: 500 }}>
            Showing <b>{filteredProducts.length}</b> {filteredProducts.length === 1 ? 'item' : 'items'}
            {activeCategory !== 'All' && <span> in <b>{activeCategory}</b></span>}
          </div>

          <div className="view-toggle-group">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Products Grid / List */}
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 14, border: '1px solid var(--border)' }}>
            <ShoppingBag size={48} style={{ color: '#abbcb0', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111a14', marginBottom: 4 }}>No products found</h3>
            <p style={{ color: '#687b6f', fontSize: 13.5, maxWidth: 360, margin: '0 auto' }}>
              {localSearch || globalSearch ? 'Try a different search term or category filter.' : 'Go to the Products tab to add your first item.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="products-grid">
            {filteredProducts.map(p => {
              const isOut = p.trackStock && p.stock <= 0;
              const isLow = p.trackStock && p.stock > 0 && p.stock <= 5;
              return (
                <div
                  key={p._id}
                  className={`product-card ${isOut ? 'out-of-stock' : ''}`}
                  onClick={() => addToCart(p)}
                >
                  <div className="product-image-box">
                    {p.image ? (
                      <img src={p.image} alt={p.name} loading="lazy" />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#8fa093' }}>
                        <ShoppingBag size={32} strokeWidth={1.5} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7d70' }}>{p.category || 'Product'}</span>
                      </div>
                    )}
                  </div>

                  <div className="product-card-body">
                    <div>
                      <div className="product-title" title={p.name}>{p.name}</div>
                      <div className="product-variant">
                        {p.category || 'General'} {p.brand ? `· ${p.brand}` : ''}
                      </div>
                    </div>

                    <div className="product-footer-row">
                      <div className="product-price">{currency} {p.price.toFixed(2)}</div>
                      {p.trackStock && (
                        <div className={`product-stock-tag ${isOut ? 'out' : isLow ? 'low-stock' : 'in-stock'}`}>
                          {isOut ? 'Out of stock' : isLow ? `Low stock (${p.stock})` : 'In stock'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}></th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p._id} style={{ cursor: 'pointer' }} onClick={() => addToCart(p)}>
                    <td>
                      {p.image ? (
                        <img src={p.image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 6, background: '#eef2ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c8e80' }}>
                          <ShoppingBag size={18} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      {p.sku && <div style={{ fontSize: 11, color: '#687b6f' }}>SKU: {p.sku}</div>}
                    </td>
                    <td>{p.category || '-'}</td>
                    <td style={{ fontWeight: 700 }}>{currency} {p.price.toFixed(2)}</td>
                    <td>
                      {p.trackStock ? (
                        <span className={`status-pill ${p.stock <= 0 ? 'out-of-stock' : p.stock <= 5 ? 'low-stock' : 'in-stock'}`}>
                          {p.stock} units
                        </span>
                      ) : (
                        <span style={{ color: '#889e90' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                        + Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Desktop Order Checkout Panel (Right Column) */}
      <OrderPanel
        orderNo={`#${orderNumber}`}
        cart={cart}
        customer={customer}
        onChangeCustomer={() => setIsCustomerModalOpen(true)}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
        cfg={cfg}
        onCompleteSale={handleCompleteSale}
        isSubmitting={isSubmitting}
        onHoldOrder={handleHoldOrder}
        heldOrdersCount={heldOrders.length}
        onOpenHeldOrders={() => setIsHeldModalOpen(true)}
      />

      {/* Mobile Floating Bottom Bar */}
      {cart.length > 0 && (
        <div 
          className="mobile-cart-bar"
          onClick={() => setIsMobileCartOpen(true)}
        >
          <div className="mobile-cart-bar-left">
            <span className="mobile-cart-badge">{cartItemsCount}</span>
            <span className="mobile-cart-total">{currency} {cartTotalAmount.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Review &amp; Pay</span>
            <ChevronRight size={16} />
          </div>
        </div>
      )}

      {/* Mobile Cart Bottom Sheet / Drawer */}
      {isMobileCartOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileCartOpen(false)}>
          <div onClick={e => e.stopPropagation()}>
            <OrderPanel
              orderNo={`#${orderNumber}`}
              cart={cart}
              customer={customer}
              onChangeCustomer={() => setIsCustomerModalOpen(true)}
              onUpdateQty={updateQty}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              cfg={cfg}
              onCompleteSale={handleCompleteSale}
              isSubmitting={isSubmitting}
              isMobileDrawer={true}
              onCloseMobileDrawer={() => setIsMobileCartOpen(false)}
              onHoldOrder={handleHoldOrder}
              heldOrdersCount={heldOrders.length}
              onOpenHeldOrders={() => setIsHeldModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Customer Picker Modal */}
      <CustomerPickerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={setCustomer}
        currentCustomer={customer}
        currency={currency}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        sale={receiptSale}
        cfg={cfg}
        onClose={() => setReceiptSale(null)}
      />

      {/* Held Orders Modal */}
      <HeldOrdersModal
        isOpen={isHeldModalOpen}
        onClose={() => setIsHeldModalOpen(false)}
        heldOrders={heldOrders}
        onResumeOrder={handleResumeOrder}
        onDeleteOrder={handleDeleteHeldOrder}
        currency={currency}
      />
    </div>
  );
}

