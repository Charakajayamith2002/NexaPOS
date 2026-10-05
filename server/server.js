import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { PORT = 5000, MONGO_URI, JWT_SECRET, BUSINESS_TYPE = 'retail', CURRENCY = 'LKR', TAX_RATE = 0 } = process.env;

// ---- Per-customer config: the only thing that changes between businesses ----
const FEATURES = {
  retail:     { barcode: true,  tables: false, batch: false, prescription: false },
  restaurant: { barcode: false, tables: true,  batch: false, prescription: false },
  pharmacy:   { barcode: true,  tables: false, batch: true,  prescription: true  },
};
const features = FEATURES[BUSINESS_TYPE] || FEATURES.retail;

// ---- Models ----
const User = mongoose.model('User', new mongoose.Schema({
  name: String, username: { type: String, unique: true }, password: String,
  role: { type: String, enum: ['admin', 'cashier'], default: 'cashier' },
}));
const Product = mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true }, category: String, barcode: String,
  price: { type: Number, required: true }, cost: { type: Number, default: 0 },
  stock: { type: Number, default: 0 }, trackStock: { type: Boolean, default: true },
  batchNo: String, expiryDate: Date, requiresPrescription: Boolean, // pharmacy
}, { timestamps: true }));
const Sale = mongoose.model('Sale', new mongoose.Schema({
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{ product: mongoose.Schema.Types.ObjectId, name: String, qty: Number, price: Number }],
  subtotal: Number, discount: Number, tax: Number, total: Number,
  paymentMethod: { type: String, default: 'cash' }, paid: Number, change: Number,
  orderType: String, tableNo: String, notes: String,          // restaurant
  prescriptionNo: String, customerName: String,               // pharmacy
}, { timestamps: true }));

// ---- Helpers ----
const wrap = fn => (req, res) => fn(req, res).catch(e => res.status(e.status || 500).json({ error: e.message }));
const fail = (status, message) => Object.assign(new Error(message), { status });
const auth = (roles) => (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET);
  } catch { return res.status(401).json({ error: 'Please log in' }); }
  if (roles && !roles.includes(req.user.role)) return res.status(403).json({ error: 'Not allowed' });
  next();
};
const token = u => jwt.sign({ id: u._id, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '12h' });

const app = express();
app.use(cors(), express.json());

app.get('/api/config', (_, res) => res.json({ businessType: BUSINESS_TYPE, currency: CURRENCY, taxRate: +TAX_RATE, features }));

// ---- Auth (first user becomes admin) ----
app.post('/api/auth/register', wrap(async (req, res) => {
  const first = (await User.countDocuments()) === 0;
  if (!first) { auth(['admin'])(req, res, () => {}); if (res.headersSent) return; }
  const { name, username, password, role } = req.body;
  const u = await User.create({ name, username, password: await bcrypt.hash(password, 10), role: first ? 'admin' : role });
  res.json({ token: token(u), user: { name: u.name, role: u.role } });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ username: req.body.username });
  if (!u || !(await bcrypt.compare(req.body.password, u.password))) throw fail(401, 'Wrong username or password');
  res.json({ token: token(u), user: { name: u.name, role: u.role } });
}));
app.get('/api/auth/setup', wrap(async (_, res) => res.json({ needsAdmin: (await User.countDocuments()) === 0 })));

// ---- Products ----
app.get('/api/products', auth(), wrap(async (req, res) => {
  const { q } = req.query;
  const filter = q ? { $or: [{ name: new RegExp(q, 'i') }, { barcode: q }] } : {};
  res.json(await Product.find(filter).sort('name').limit(200));
}));
app.post('/api/products', auth(['admin']), wrap(async (req, res) => res.json(await Product.create(req.body))));
app.put('/api/products/:id', auth(['admin']), wrap(async (req, res) => res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }))));
app.delete('/api/products/:id', auth(['admin']), wrap(async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---- Sales ----
app.post('/api/sales', auth(), wrap(async (req, res) => {
  const { items = [], discount = 0, paymentMethod, paid = 0, orderType, tableNo, notes, prescriptionNo, customerName } = req.body;
  if (!items.length) throw fail(400, 'Cart is empty');
  const deducted = []; // for rollback (works without a replica set)
  try {
    const lines = [];
    for (const it of items) {
      const p = await Product.findById(it.product);
      if (!p) throw fail(400, 'Product not found');
      if (features.batch && p.expiryDate && p.expiryDate < new Date()) throw fail(400, `${p.name} is expired`);
      if (features.prescription && p.requiresPrescription && !prescriptionNo) throw fail(400, `${p.name} needs a prescription number`);
      if (p.trackStock) {
        const r = await Product.updateOne({ _id: p._id, stock: { $gte: it.qty } }, { $inc: { stock: -it.qty } });
        if (!r.modifiedCount) throw fail(400, `Not enough stock for ${p.name}`);
        deducted.push({ id: p._id, qty: it.qty });
      }
      lines.push({ product: p._id, name: p.name, qty: it.qty, price: p.price }); // price always from DB
    }
    const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
    const tax = +((subtotal - discount) * (+TAX_RATE / 100)).toFixed(2);
    const total = +(subtotal - discount + tax).toFixed(2);
    if (paymentMethod !== 'card' && paid < total) throw fail(400, 'Paid amount is less than total');
    const sale = await Sale.create({ cashier: req.user.id, items: lines, subtotal, discount, tax, total, paymentMethod, paid, change: Math.max(0, paid - total), orderType, tableNo, notes, prescriptionNo, customerName });
    res.json(sale);
  } catch (e) {
    for (const d of deducted) await Product.updateOne({ _id: d.id }, { $inc: { stock: d.qty } });
    throw e;
  }
}));
app.get('/api/sales', auth(['admin']), wrap(async (_, res) => res.json(await Sale.find().sort('-createdAt').limit(100))));

// ---- Reports ----
app.get('/api/reports/today', auth(['admin']), wrap(async (_, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [t] = await Sale.aggregate([{ $match: { createdAt: { $gte: start } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } }]);
  const lowStock = await Product.find({ trackStock: true, stock: { $lte: 5 } }).select('name stock').limit(20);
  const expiring = features.batch ? await Product.find({ expiryDate: { $lte: new Date(Date.now() + 90 * 864e5) } }).select('name expiryDate batchNo').limit(20) : [];
  res.json({ count: t?.count || 0, revenue: t?.revenue || 0, lowStock, expiring });
}));

await mongoose.connect(MONGO_URI);
app.listen(PORT, () => console.log(`POS (${BUSINESS_TYPE}) on :${PORT}`));
