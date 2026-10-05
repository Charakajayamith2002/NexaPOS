import { useState, useEffect, useMemo } from 'react';

const api = async (path, opts = {}) => {
  const r = await fetch('/api' + path, {
    ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.token || '') },
    body: opts.body && JSON.stringify(opts.body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
};

const css = `
*{box-sizing:border-box}body{margin:0;font:15px system-ui,sans-serif;background:#f3f4f2;color:#1d2420}
button{cursor:pointer;border:0;border-radius:6px;padding:9px 14px;font:inherit;background:#1f5c4a;color:#fff}
button.alt{background:#e2e6e3;color:#1d2420}button.del{background:#b3372c}
input,select,textarea{font:inherit;padding:8px;border:1px solid #c5ccc7;border-radius:6px;width:100%}
.bar{display:flex;gap:12px;align-items:center;justify-content:space-between;background:#1f5c4a;color:#fff;padding:10px 16px}
.bar button{background:#ffffff26}.bar nav{display:flex;gap:6px}
.pos{display:grid;grid-template-columns:1fr 360px;gap:14px;padding:14px}
@media(max-width:800px){.pos{grid-template-columns:1fr}}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:10px}
.tile{background:#fff;border:1px solid #d7dcd8;text-align:left;color:#1d2420;padding:10px;min-height:76px}
.tile small{display:block;color:#5c6a62}.tile.out{opacity:.45}
.panel{background:#fff;border-radius:8px;padding:12px;border:1px solid #d7dcd8}
.row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #eef0ee}
.qty{display:flex;gap:4px;align-items:center}.qty button{padding:2px 9px}
.total{font-size:22px;font-weight:700}.err{color:#b3372c;margin:6px 0}.stack>*{margin-bottom:8px}
.page{padding:14px;max-width:900px;margin:auto}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #e2e6e3;text-align:left}
`;

export default function App() {
  const [cfg, setCfg] = useState(null);
  const [user, setUser] = useState(() => JSON.parse(localStorage.user || 'null'));
  const [view, setView] = useState('pos');
  useEffect(() => { api('/config').then(setCfg); }, []);
  if (!cfg) return null;
  const logout = () => { localStorage.clear(); setUser(null); };
  return (
    <>
      <style>{css}</style>
      {!user ? <Login onDone={u => { localStorage.user = JSON.stringify(u); setUser(u); }} /> : (
        <>
          <div className="bar">
            <b>{cfg.businessType.toUpperCase()} POS</b>
            <nav>
              <button onClick={() => setView('pos')}>Sell</button>
              {user.role === 'admin' && <><button onClick={() => setView('products')}>Products</button><button onClick={() => setView('report')}>Today</button></>}
              <button onClick={logout}>Log out ({user.name})</button>
            </nav>
          </div>
          {view === 'pos' && <Sell cfg={cfg} />}
          {view === 'products' && <Products cfg={cfg} />}
          {view === 'report' && <Report cfg={cfg} />}
        </>
      )}
    </>
  );
}

function Login({ onDone }) {
  const [f, setF] = useState({ name: '', username: '', password: '' });
  const [setup, setSetup] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { api('/auth/setup').then(d => setSetup(d.needsAdmin)); }, []);
  const submit = async () => {
    try {
      const d = await api(setup ? '/auth/register' : '/auth/login', { method: 'POST', body: f });
      localStorage.token = d.token; onDone(d.user);
    } catch (e) { setErr(e.message); }
  };
  return (
    <div className="page stack" style={{ maxWidth: 340, marginTop: 60 }}>
      <h2>{setup ? 'Create the admin account' : 'Log in'}</h2>
      {setup && <input placeholder="Full name" onChange={e => setF({ ...f, name: e.target.value })} />}
      <input placeholder="Username" onChange={e => setF({ ...f, username: e.target.value })} />
      <input type="password" placeholder="Password" onChange={e => setF({ ...f, password: e.target.value })} />
      {err && <div className="err">{err}</div>}
      <button onClick={submit}>{setup ? 'Create admin' : 'Log in'}</button>
    </div>
  );
}

function Sell({ cfg }) {
  const { features: ft, currency, taxRate } = cfg;
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [cart, setCart] = useState([]);
  const [x, setX] = useState({ discount: 0, paid: '', paymentMethod: 'cash', orderType: 'dine-in', tableNo: '', notes: '', prescriptionNo: '', customerName: '' });
  const [msg, setMsg] = useState({ err: '', ok: '' });
  const load = () => api('/products?q=' + encodeURIComponent(q)).then(setProducts);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);

  const add = p => setCart(c => {
    const i = c.findIndex(l => l._id === p._id);
    if (i < 0) return [...c, { ...p, qty: 1 }];
    return c.map((l, j) => j === i ? { ...l, qty: l.qty + 1 } : l);
  });
  const chg = (id, d) => setCart(c => c.map(l => l._id === id ? { ...l, qty: l.qty + d } : l).filter(l => l.qty > 0));
  const sub = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const tax = (sub - x.discount) * taxRate / 100;
  const total = Math.max(0, sub - x.discount + tax);
  const set = k => e => setX({ ...x, [k]: e.target.value });

  const onSearchKey = e => { // barcode scanners "type" the code then press Enter
    if (e.key === 'Enter') { const m = products.find(p => p.barcode === q); if (m) { add(m); setQ(''); } }
  };
  const pay = async () => {
    setMsg({ err: '', ok: '' });
    try {
      const s = await api('/sales', { method: 'POST', body: { ...x, discount: +x.discount, paid: +x.paid || (x.paymentMethod === 'card' ? total : 0), items: cart.map(l => ({ product: l._id, qty: l.qty })) } });
      setMsg({ ok: `Sale complete. Change: ${currency} ${s.change.toFixed(2)}`, err: '' });
      setCart([]); setX({ ...x, discount: 0, paid: '', notes: '', prescriptionNo: '', customerName: '' }); load();
      setTimeout(() => window.print(), 100);
    } catch (e) { setMsg({ err: e.message, ok: '' }); }
  };

  return (
    <div className="pos">
      <div>
        <input autoFocus placeholder={ft.barcode ? 'Search or scan barcode' : 'Search items'} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onSearchKey} />
        <div className="grid">
          {products.map(p => (
            <button key={p._id} className={'tile' + (p.trackStock && p.stock <= 0 ? ' out' : '')} onClick={() => add(p)}>
              <b>{p.name}</b><small>{currency} {p.price}</small>
              {p.trackStock && <small>Stock: {p.stock}</small>}
              {ft.batch && p.expiryDate && <small>Exp {p.expiryDate.slice(0, 10)}</small>}
              {ft.prescription && p.requiresPrescription && <small>Rx required</small>}
            </button>
          ))}
          {!products.length && <p>No items found. Add products from the Products page.</p>}
        </div>
      </div>
      <div className="panel stack">
        {ft.tables && <>
          <select value={x.orderType} onChange={set('orderType')}><option value="dine-in">Dine-in</option><option value="takeaway">Takeaway</option></select>
          {x.orderType === 'dine-in' && <input placeholder="Table number" value={x.tableNo} onChange={set('tableNo')} />}
          <textarea rows={2} placeholder="Order notes for kitchen" value={x.notes} onChange={set('notes')} />
        </>}
        {ft.prescription && <>
          <input placeholder="Customer name" value={x.customerName} onChange={set('customerName')} />
          <input placeholder="Prescription no. (for Rx items)" value={x.prescriptionNo} onChange={set('prescriptionNo')} />
        </>}
        <div>
          {cart.map(l => (
            <div className="row" key={l._id}>
              <span>{l.name}<br /><small>{currency} {l.price}</small></span>
              <span className="qty"><button className="alt" onClick={() => chg(l._id, -1)}>-</button>{l.qty}<button className="alt" onClick={() => chg(l._id, 1)}>+</button></span>
              <b>{(l.qty * l.price).toFixed(2)}</b>
            </div>
          ))}
          {!cart.length && <p>Tap an item to add it.</p>}
        </div>
        <input type="number" placeholder="Discount" value={x.discount || ''} onChange={set('discount')} />
        <div>Subtotal {sub.toFixed(2)} {taxRate > 0 && `| Tax ${tax.toFixed(2)}`}</div>
        <div className="total">{currency} {total.toFixed(2)}</div>
        <select value={x.paymentMethod} onChange={set('paymentMethod')}><option value="cash">Cash</option><option value="card">Card</option></select>
        {x.paymentMethod === 'cash' && <input type="number" placeholder="Amount received" value={x.paid} onChange={set('paid')} />}
        {x.paymentMethod === 'cash' && x.paid > total && <div>Change: {currency} {(x.paid - total).toFixed(2)}</div>}
        {msg.err && <div className="err">{msg.err}</div>}{msg.ok && <div>{msg.ok}</div>}
        <button disabled={!cart.length} onClick={pay}>Complete sale</button>
      </div>
    </div>
  );
}

function Products({ cfg }) {
  const { features: ft, currency } = cfg;
  const blank = { name: '', category: '', barcode: '', price: '', cost: '', stock: '', trackStock: true, batchNo: '', expiryDate: '', requiresPrescription: false };
  const [list, setList] = useState([]);
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const load = () => api('/products').then(setList);
  useEffect(() => { load(); }, []);
  const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async () => {
    try {
      const body = { ...f, price: +f.price, cost: +f.cost, stock: +f.stock, expiryDate: f.expiryDate || undefined };
      await api(f._id ? '/products/' + f._id : '/products', { method: f._id ? 'PUT' : 'POST', body });
      setF(blank); setErr(''); load();
    } catch (e) { setErr(e.message); }
  };
  const del = async id => { if (confirm('Delete this product?')) { await api('/products/' + id, { method: 'DELETE' }); load(); } };
  return (
    <div className="page">
      <div className="panel stack">
        <h3>{f._id ? 'Edit product' : 'Add product'}</h3>
        <input placeholder="Name" value={f.name} onChange={set('name')} />
        <input placeholder="Category" value={f.category} onChange={set('category')} />
        {ft.barcode && <input placeholder="Barcode" value={f.barcode} onChange={set('barcode')} />}
        <input type="number" placeholder={`Price (${currency})`} value={f.price} onChange={set('price')} />
        <input type="number" placeholder="Cost" value={f.cost} onChange={set('cost')} />
        <label><input type="checkbox" style={{ width: 'auto' }} checked={f.trackStock} onChange={set('trackStock')} /> Track stock</label>
        {f.trackStock && <input type="number" placeholder="Stock quantity" value={f.stock} onChange={set('stock')} />}
        {ft.batch && <><input placeholder="Batch no." value={f.batchNo} onChange={set('batchNo')} /><input type="date" value={(f.expiryDate || '').slice(0, 10)} onChange={set('expiryDate')} /></>}
        {ft.prescription && <label><input type="checkbox" style={{ width: 'auto' }} checked={!!f.requiresPrescription} onChange={set('requiresPrescription')} /> Prescription required</label>}
        {err && <div className="err">{err}</div>}
        <button onClick={save}>Save product</button>
        {f._id && <button className="alt" onClick={() => setF(blank)}>Cancel edit</button>}
      </div>
      <table>
        <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>{list.map(p => (
          <tr key={p._id}><td>{p.name}</td><td>{p.price}</td><td>{p.trackStock ? p.stock : '-'}</td>
            <td><button className="alt" onClick={() => setF({ ...p })}>Edit</button> <button className="del" onClick={() => del(p._id)}>Delete</button></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Report({ cfg }) {
  const [r, setR] = useState(null);
  useEffect(() => { api('/reports/today').then(setR); }, []);
  if (!r) return null;
  return (
    <div className="page stack">
      <div className="panel"><div className="total">{cfg.currency} {r.revenue.toFixed(2)}</div>{r.count} sales today</div>
      <div className="panel"><h3>Low stock</h3>{r.lowStock.length ? r.lowStock.map(p => <div className="row" key={p._id}>{p.name}<b>{p.stock}</b></div>) : 'Nothing running low.'}</div>
      {cfg.features.batch && <div className="panel"><h3>Expiring within 90 days</h3>{r.expiring.length ? r.expiring.map(p => <div className="row" key={p._id}>{p.name} ({p.batchNo})<b>{p.expiryDate.slice(0, 10)}</b></div>) : 'None.'}</div>}
    </div>
  );
}
