import { BookmarkCheck, Play, Trash2, X } from 'lucide-react';

export default function HeldOrdersModal({ isOpen, onClose, heldOrders = [], onResumeOrder, onDeleteOrder, currency = '$' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e4f3ea', color: '#0e7047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookmarkCheck size={18} />
            </div>
            <div>
              <div className="modal-title">Held / Parked Orders</div>
              <div style={{ fontSize: 12, color: '#687b6f' }}>Resume orders saved earlier</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {heldOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#889e90' }}>
              No orders on hold. You can park an active cart by clicking the bookmark button next to Checkout.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {heldOrders.map(order => {
                const total = order.cart.reduce((s, it) => s + it.qty * it.price, 0);
                const itemsCount = order.cart.reduce((s, it) => s + it.qty, 0);
                return (
                  <div 
                    key={order.id} 
                    style={{ 
                      background: '#ffffff', 
                      border: '1px solid var(--border)', 
                      borderRadius: 10, 
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {order.title || `Order #${order.orderNo}`} · {currency} {total.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 12, color: '#687b6f', marginTop: 2 }}>
                        {itemsCount} items · {order.customer ? order.customer.name : 'Walk-in'} · {new Date(order.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className="btn-primary" 
                        onClick={() => { onResumeOrder(order); onClose(); }}
                        style={{ height: 34, padding: '0 12px', fontSize: 12.5 }}
                      >
                        <Play size={13} /> Resume
                      </button>
                      <button 
                        onClick={() => onDeleteOrder(order.id)}
                        className="btn-ghost"
                        style={{ padding: 6, color: '#a0b0a5' }}
                        onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseOut={e => e.currentTarget.style.color = '#a0b0a5'}
                        title="Discard held order"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

