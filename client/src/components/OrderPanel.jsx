import { useState } from 'react';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  CreditCard, 
  Banknote, 
  Clock, 
  Sparkles, 
  X,
  BookmarkCheck,
  ChevronDown,
  Layers
} from 'lucide-react';
import { sound } from '../sound.js';

export default function OrderPanel({
  orderNo = '#2048',
  cart = [],
  customer,
  onChangeCustomer,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  cfg,
  onCompleteSale,
  isSubmitting = false,
  isMobileDrawer = false,
  onCloseMobileDrawer,
  onHoldOrder,
  heldOrdersCount = 0,
  onOpenHeldOrders
}) {
  const { currency = '$', taxRate = 0, loyalty = { rate: 100, pointValue: 1 }, features = {} } = cfg || {};

  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'credit'
  const [approvalCode, setApprovalCode] = useState('');
  const [last4, setLast4] = useState('');
  const [cardType, setCardType] = useState('Visa');
  const [discount, setDiscount] = useState('');
  const [redeemPoints, setRedeemPoints] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNo, setTableNo] = useState('');
  const [notes, setNotes] = useState('');
  const [prescriptionNo, setPrescriptionNo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Financial calculations
  const totalItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  const numDiscount = Math.max(0, +discount || 0);
  
  // Loyalty redemption
  const maxRedeem = customer && loyalty.pointValue > 0 
    ? Math.min(customer.points || 0, Math.floor(Math.max(0, subtotal - numDiscount) / loyalty.pointValue))
    : 0;
  const numRedeem = Math.min(Math.max(0, Math.floor(+redeemPoints || 0)), maxRedeem);
  const pointsDeduction = numRedeem * loyalty.pointValue;

  const taxableAmount = Math.max(0, subtotal - numDiscount - pointsDeduction);
  const taxAmount = taxRate > 0 ? (taxableAmount * taxRate) / 100 : 0;
  const total = Math.max(0, taxableAmount + taxAmount);

  const numTendered = +cashTendered || 0;
  const changeDue = paymentMethod === 'cash' && numTendered > total ? numTendered - total : 0;

  // Quick cash tender pills generator
  const getCashPills = () => {
    const pills = [{ label: 'Exact', val: total }];
    const roundUpTo = (n, step) => Math.ceil(n / step) * step;
    [10, 20, 50, 100].forEach(step => {
      const target = roundUpTo(total, step);
      if (target > total && !pills.some(p => p.val === target)) {
        pills.push({ label: `${currency}${target}`, val: target });
      }
    });
    return pills.slice(0, 4);
  };

  const handleComplete = () => {
    setErrorMsg('');
    if (cart.length === 0) {
      setErrorMsg('Cart is empty.');
      return;
    }
    if (paymentMethod === 'credit' && !customer) {
      setErrorMsg('A registered customer is required for credit / pay later.');
      return;
    }
    if (paymentMethod === 'cash' && numTendered > 0 && numTendered < total) {
      setErrorMsg(`Tendered amount is less than total ${currency}${total.toFixed(2)}.`);
      return;
    }
    if (paymentMethod === 'card') {
      if (!approvalCode.trim()) {
        setErrorMsg('Terminal Approval / Auth Code from printed slip is required.');
        return;
      }
      if (!last4.trim() || last4.trim().length < 4) {
        setErrorMsg('Please enter the last 4 digits of the card (e.g. 4242).');
        return;
      }
    }

    onCompleteSale({
      paymentMethod,
      approvalCode: paymentMethod === 'card' ? approvalCode.trim() : undefined,
      last4: paymentMethod === 'card' ? last4.trim() : undefined,
      cardType: paymentMethod === 'card' ? cardType : undefined,
      discount: numDiscount,
      redeemPoints: numRedeem,
      paid: paymentMethod === 'cash' ? (numTendered || total) : total,
      orderType,
      tableNo,
      notes,
      prescriptionNo,
      cart,
      total,
      subtotal,
      tax: taxAmount,
      customer
    });
  };

  const customerInitials = customer?.name
    ? customer.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'WI';

  return (
    <div className={`order-panel ${isMobileDrawer ? 'mobile-cart-sheet' : ''}`}>
      {isMobileDrawer && <div className="sheet-handle-bar" />}

      {/* Header */}
      <div className="order-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="order-title">Order {orderNo}</span>
          {heldOrdersCount > 0 && (
            <button 
              type="button" 
              onClick={onOpenHeldOrders}
              className="badge-shift"
              style={{ fontSize: 11, padding: '2px 8px' }}
              title="View parked orders"
            >
              <BookmarkCheck size={12} /> {heldOrdersCount} held
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="order-items-count">
            {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
          </span>
          {isMobileDrawer && (
            <button onClick={onCloseMobileDrawer} className="btn-ghost" style={{ padding: 4 }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="customer-banner">
        <div className="customer-info-left">
          <div className="customer-avatar">{customerInitials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div className="customer-name">{customer?.name || 'Walk-in Customer'}</div>
            <div className="customer-sub">
              {customer ? (
                <>Member · {customer.points || 0} points {customer.balance > 0 ? `· owes ${currency}${customer.balance.toFixed(2)}` : ''}</>
              ) : (
                'Standard retail sale'
              )}
            </div>
          </div>
        </div>
        <button 
          type="button" 
          className="customer-action-btn"
          onClick={onChangeCustomer}
        >
          {customer ? 'Change' : '+ Add'}
        </button>
      </div>

      {/* Cart Items List */}
      <div className="cart-items-scroll">
        {cart.length === 0 ? (
          <div className="cart-empty-state">
            <ShoppingBag size={42} strokeWidth={1.5} style={{ opacity: 0.35 }} />
            <div style={{ fontWeight: 700, fontSize: 14 }}>Order is empty</div>
            <div style={{ fontSize: 12.5, maxWidth: 220 }}>
              Select items from the catalog or scan a barcode to add them.
            </div>
          </div>
        ) : (
          cart.map(item => (
            <div key={item._id} className="cart-item-row">
              {item.image ? (
                <img src={item.image} alt={item.name} className="cart-item-thumb" />
              ) : (
                <div className="cart-item-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#88998d' }}>
                  <ShoppingBag size={20} />
                </div>
              )}
              <div className="cart-item-details">
                <div className="cart-item-title" title={item.name}>{item.name}</div>
                <div className="cart-item-unit">
                  {item.category ? `${item.category} · ` : ''}{currency} {item.price.toFixed(2)} ea
                </div>
              </div>

              {/* Stepper [- 1 +] */}
              <div className="qty-stepper">
                <button 
                  type="button" 
                  className="qty-btn" 
                  onClick={() => onUpdateQty(item._id, -1)}
                  title="Decrease"
                >
                  <Minus size={13} strokeWidth={2.5} />
                </button>
                <span className="qty-val">{item.qty}</span>
                <button 
                  type="button" 
                  className="qty-btn" 
                  onClick={() => onUpdateQty(item._id, 1)}
                  title="Increase"
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              </div>

              <div className="cart-item-price">
                {currency} {(item.qty * item.price).toFixed(2)}
              </div>

              <button
                type="button"
                onClick={() => onRemoveItem(item._id)}
                style={{ color: '#a0b0a5', padding: 4 }}
                onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                onMouseOut={e => e.currentTarget.style.color = '#a0b0a5'}
                title="Remove item"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Optional Restaurant / Rx inputs */}
      {(features.tables || features.prescription) && (
        <div style={{ padding: '0 20px 8px' }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12, padding: '4px 6px', color: '#556a5c' }}
            onClick={() => setShowOptions(!showOptions)}
          >
            <span>Order Options ({features.tables ? 'Dining/Table' : 'Rx'})</span>
            <ChevronDown size={14} style={{ transform: showOptions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showOptions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, background: '#f8faf7', padding: 10, borderRadius: 8 }}>
              {features.tables && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <select value={orderType} onChange={e => setOrderType(e.target.value)} style={{ padding: '6px 8px', fontSize: 13 }}>
                      <option value="dine-in">Dine-in</option>
                      <option value="takeaway">Takeaway</option>
                    </select>
                    {orderType === 'dine-in' && (
                      <input 
                        placeholder="Table No." 
                        value={tableNo} 
                        onChange={e => setTableNo(e.target.value)} 
                        style={{ padding: '6px 8px', fontSize: 13 }}
                      />
                    )}
                  </div>
                  <input 
                    placeholder="Kitchen notes..." 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    style={{ padding: '6px 8px', fontSize: 13 }}
                  />
                </>
              )}
              {features.prescription && (
                <input 
                  placeholder="Prescription No. (Rx)" 
                  value={prescriptionNo} 
                  onChange={e => setPrescriptionNo(e.target.value)} 
                  style={{ padding: '6px 8px', fontSize: 13 }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer / Financial Totals & Checkout */}
      <div className="order-panel-footer">
        {/* Discounts / Loyalty inputs */}
        {cart.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: maxRedeem > 0 ? '1fr 1fr' : '1fr', gap: 8 }}>
            <input
              type="number"
              placeholder={`Discount (${currency})`}
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 13, height: 34 }}
            />
            {maxRedeem > 0 && (
              <input
                type="number"
                min="0"
                max={maxRedeem}
                placeholder={`Redeem pts (max ${maxRedeem})`}
                value={redeemPoints}
                onChange={e => setRedeemPoints(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 13, height: 34 }}
              />
            )}
          </div>
        )}

        {/* Financial Line items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="summary-line">
            <span>Subtotal</span>
            <span>{currency} {subtotal.toFixed(2)}</span>
          </div>

          {(numDiscount > 0 || pointsDeduction > 0) && (
            <div className="summary-line discount">
              <span>Discounts & Points</span>
              <span>-{currency} {(numDiscount + pointsDeduction).toFixed(2)}</span>
            </div>
          )}

          {taxRate > 0 && (
            <div className="summary-line">
              <span>Tax ({taxRate}%)</span>
              <span>{currency} {taxAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="total-row">
            <span className="total-label">TOTAL</span>
            <span className="total-amount">{currency} {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="payment-methods-grid">
          <button
            type="button"
            className={`pay-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('cash')}
          >
            <Banknote size={15} /> Cash
          </button>
          <button
            type="button"
            className={`pay-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('card')}
          >
            <CreditCard size={15} /> Card
          </button>
          <button
            type="button"
            className={`pay-method-btn ${paymentMethod === 'credit' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('credit')}
            disabled={!customer}
            title={!customer ? 'Select a customer to use credit' : ''}
          >
            <Clock size={15} /> Credit
          </button>
        </div>

        {/* Cash Tender Input & Quick-Pills */}
        {paymentMethod === 'cash' && cart.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                placeholder="Amount received"
                value={cashTendered}
                onChange={e => setCashTendered(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 13, height: 34 }}
              />
              {changeDue > 0 && (
                <div style={{ whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700, color: '#0e7047' }}>
                  Change: {currency} {changeDue.toFixed(2)}
                </div>
              )}
            </div>

            {/* Quick cash pills */}
            <div className="cash-pills-row">
              {getCashPills().map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="cash-pill"
                  onClick={() => setCashTendered(String(pill.val))}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Standalone Card Terminal Slip Entry */}
        {paymentMethod === 'card' && cart.length > 0 && (
          <div style={{ background: '#f5faf6', border: '1px solid #bce3cb', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0e7047' }}>
                <CreditCard size={14} /> Standalone Card Terminal
              </div>
              <span style={{ fontSize: 10.5, background: '#e1f4e8', color: '#0e7047', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                Manual Terminal
              </span>
            </div>

            {/* Card Brand Selector */}
            <div style={{ display: 'flex', gap: 4 }}>
              {['Visa', 'Mastercard', 'Amex', 'Debit/Other'].map(brand => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setCardType(brand)}
                  style={{
                    flex: 1,
                    padding: '3px 4px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: cardType === brand ? '1.5px solid #0e7047' : '1px solid #cbd5e1',
                    background: cardType === brand ? '#e1f4e8' : '#ffffff',
                    color: cardType === brand ? '#0e7047' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {brand}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#27382f', display: 'block', marginBottom: 2 }}>
                  Approval / Auth Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. APPR-9428"
                  value={approvalCode}
                  onChange={e => {
                    setApprovalCode(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  style={{ padding: '6px 8px', fontSize: 12.5, fontWeight: 700, height: 34, background: '#ffffff' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#27382f', display: 'block', marginBottom: 2 }}>
                  Last 4 Digits *
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="4242"
                  value={last4}
                  onChange={e => {
                    setLast4(e.target.value.replace(/\D/g, '').slice(0, 4));
                    if (errorMsg) setErrorMsg('');
                  }}
                  style={{ padding: '6px 8px', fontSize: 12.5, fontWeight: 700, height: 34, textAlign: 'center', background: '#ffffff' }}
                  required
                />
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#556a5c', lineHeight: 1.3 }}>
              Enter the auth code from printed machine slip. Duplicate codes on the same day are rejected.
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ color: '#dc2626', fontSize: 12.5, fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* Complete sale action & hold button */}
        <div style={{ display: 'flex', gap: 8 }}>
          {cart.length > 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onHoldOrder}
              title="Park / Hold order to serve next customer"
              style={{ padding: '0 12px', height: 48, borderRadius: 8 }}
            >
              <BookmarkCheck size={18} />
            </button>
          )}

          <button
            type="button"
            className="checkout-btn"
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleComplete}
          >
            {isSubmitting ? (
              'Processing...'
            ) : (
              <>Complete sale · {currency} {total.toFixed(2)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

