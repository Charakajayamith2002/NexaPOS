import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.join(__dirname, 'backups');

const { PORT = 5000, MONGO_URI, JWT_SECRET, BUSINESS_TYPE = 'retail', CURRENCY = 'LKR', TAX_RATE = 0, SHOP_NAME = 'My Shop' } = process.env;

// ---- Per-customer config: the only thing that changes between businesses ----
const FEATURES = {
  retail:     { barcode: true,  tables: false, batch: false, prescription: false },
  restaurant: { barcode: false, tables: true,  batch: false, prescription: false },
  pharmacy:   { barcode: true,  tables: false, batch: true,  prescription: true  },
};
const features = FEATURES[BUSINESS_TYPE] || FEATURES.retail;

// ---- Roles & Granular Permission Definitions ----
const ROLE_PERMISSIONS = {
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

const getEffectivePermissions = (role, customPerms = {}) => {
  const base = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;
  return { ...base, ...(customPerms || {}) };
};

const getTrainingLevel = (role) => {
  switch (role) {
    case 'cashier': return 1;
    case 'senior_cashier': return 2;
    case 'supervisor': return 3;
    case 'admin': return 4;
    case 'inventory_clerk': return 2;
    default: return 1;
  }
};

// ---- Models ----
const User = mongoose.model('User', new mongoose.Schema({
  name: String, 
  username: { type: String, unique: true }, 
  password: String,
  role: { 
    type: String, 
    enum: ['admin', 'supervisor', 'senior_cashier', 'cashier', 'inventory_clerk'], 
    default: 'cashier' 
  },
  trainingLevel: { type: Number, default: 1 },
  permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
  active: { type: Boolean, default: true },
}));
const Product = mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true }, sku: { type: String, unique: true, sparse: true },
  category: String, brand: String, image: String, barcode: String,
  price: { type: Number, required: true }, cost: { type: Number, default: 0 },
  stock: { type: Number, default: 0 }, trackStock: { type: Boolean, default: true },
  batchNo: String, expiryDate: Date, requiresPrescription: Boolean, // pharmacy
}, { timestamps: true }));
const Sale = mongoose.model('Sale', new mongoose.Schema({
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{ product: mongoose.Schema.Types.ObjectId, name: String, qty: Number, price: Number, cost: Number, returnedQty: { type: Number, default: 0 } }],
  subtotal: Number, discount: Number, tax: Number, total: Number, refunded: { type: Number, default: 0 }, pointsEarned: { type: Number, default: 0 }, pointsRedeemed: { type: Number, default: 0 }, pointsValue: { type: Number, default: 0 },
  paymentMethod: { type: String, default: 'cash' }, paid: Number, change: Number,
  approvalCode: String, last4: String, cardType: String, cardProvider: { type: String, default: 'manual' },
  invoiceNo: { type: String, unique: true }, cashierName: String, customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }, branchName: String, branchCode: String,
  orderType: String, tableNo: String, notes: String,          // restaurant
  prescriptionNo: String, customerName: String,               // pharmacy
}, { timestamps: true }));

// ---- Standalone Card Payment Model ----
const Payment = mongoose.model('Payment', new mongoose.Schema({
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  invoiceNo: { type: String, index: true },
  shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', index: true },
  shiftNo: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  branchName: String,
  branchCode: String,
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cashierName: String,
  method: { type: String, enum: ['card', 'cash', 'credit'], default: 'card' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['completed', 'refunded', 'voided'], default: 'completed' },
  approvalCode: { type: String, trim: true },
  last4: { type: String, trim: true },
  cardType: { type: String, default: 'Card' },
  provider: { type: String, default: 'manual' },
  terminalRef: String,
  notes: String,
  refundedAmount: { type: Number, default: 0 },
  refundApprovalCode: String,
}, { timestamps: true }));

const Branch = mongoose.model('Branch', new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true }));

const nameSchema = () => new mongoose.Schema({ name: { type: String, required: true, unique: true } });
const Category = mongoose.model('Category', nameSchema());
const Brand = mongoose.model('Brand', nameSchema());
const Counter = mongoose.model('Counter', new mongoose.Schema({ _id: String, n: Number }));
const Customer = mongoose.model('Customer', new mongoose.Schema({ name: { type: String, required: true }, balance: { type: Number, default: 0 }, points: { type: Number, default: 0 }, phone: String, email: String, address: String }, { timestamps: true }));
const StockMovement = mongoose.model('StockMovement', new mongoose.Schema({
  product: mongoose.Schema.Types.ObjectId, name: String, change: Number, balance: Number, reason: String, ref: String, user: String,
}, { timestamps: true }));
const Refund = mongoose.model('Refund', new mongoose.Schema({
  sale: mongoose.Schema.Types.ObjectId, invoiceNo: String, amount: Number, reason: String, cashierName: String,
  refundMethod: { type: String, enum: ['card', 'cash', 'credit'], default: 'cash' },
  approvalCode: String, last4: String,
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  items: [{ product: mongoose.Schema.Types.ObjectId, name: String, qty: Number, price: Number }],
}, { timestamps: true }));
const Supplier = mongoose.model('Supplier', new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  itemsProvided: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  paymentTerms: { type: String, default: '' },
  taxId: { type: String, default: '' },
  notes: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true }));
const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({
  poNo: { type: String, unique: true }, supplier: mongoose.Schema.Types.ObjectId, supplierName: String,
  items: [{ product: mongoose.Schema.Types.ObjectId, name: String, qty: Number, cost: Number, receivedQty: { type: Number, default: 0 } }],
  total: Number, notes: String, createdBy: String,
  status: { type: String, enum: ['ordered', 'partial', 'received', 'cancelled'], default: 'ordered' },
}, { timestamps: true }));
const nextPo = async () => 'PO-' + String((await Counter.findByIdAndUpdate('po', { $inc: { n: 1 } }, { new: true, upsert: true })).n).padStart(5, '0');
const LOYALTY_RATE = +(process.env.LOYALTY_RATE ?? 100), POINT_VALUE = +(process.env.POINT_VALUE || 1); // LOYALTY_RATE = money spent per point (0 = off)
const CustomerTxn = mongoose.model('CustomerTxn', new mongoose.Schema({
  customer: mongoose.Schema.Types.ObjectId, type: String, ref: String, total: Number, amount: Number, points: Number, method: String, balanceAfter: Number, by: String,
}, { timestamps: true }));
const applyCustomer = async (cust, sale, by) => {
  const owed = sale.paymentMethod === 'credit' ? sale.total : 0;
  const u = await Customer.findByIdAndUpdate(cust._id, { $inc: { balance: owed, points: sale.pointsEarned } }, { new: true });
  await CustomerTxn.create({ customer: cust._id, type: 'sale', ref: sale.invoiceNo, total: sale.total, amount: owed, points: sale.pointsEarned - sale.pointsRedeemed, method: sale.paymentMethod, balanceAfter: u.balance, by });
};
const refundCustomer = async (sale, amount, by) => {
  const c = sale.customer && await Customer.findById(sale.customer);
  if (!c) return;
  const lost = LOYALTY_RATE > 0 && sale.pointsEarned ? Math.min(Math.floor(amount / LOYALTY_RATE), c.points) : 0;
  const owedBack = sale.paymentMethod === 'credit' ? Math.min(amount, c.balance) : 0;
  const u = await Customer.findByIdAndUpdate(c._id, { $inc: { balance: -owedBack, points: -lost } }, { new: true });
  await CustomerTxn.create({ customer: c._id, type: 'refund', ref: sale.invoiceNo, total: -amount, amount: -owedBack, points: -lost, balanceAfter: u.balance, by });
};
const nextInvoice = async () => 'INV-' + String((await Counter.findByIdAndUpdate('invoice', { $inc: { n: 1 } }, { new: true, upsert: true })).n).padStart(6, '0');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nextSku = async () => 'SKU-' + String((await Counter.findByIdAndUpdate('sku', { $inc: { n: 1 } }, { new: true, upsert: true })).n).padStart(5, '0');

// ---- Audit Log Model ----
const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
  user: String,
  userId: mongoose.Schema.Types.ObjectId,
  action: { type: String, required: true },
  category: { type: String, enum: ['auth', 'sale', 'refund', 'stock', 'cash_drawer', 'product', 'user', 'system'], default: 'system' },
  details: String,
  ref: String,
  metadata: mongoose.Schema.Types.Mixed,
  ip: String,
}, { timestamps: true }));

const logAudit = async (req, action, category, details, ref = '', metadata = null) => {
  try {
    await AuditLog.create({
      user: req?.user?.name || 'System',
      userId: req?.user?.id,
      action,
      category,
      details,
      ref,
      metadata,
      ip: req?.ip || req?.socket?.remoteAddress || '',
    });
  } catch (e) {
    console.error('AuditLog error:', e.message);
  }
};

// ---- Shift & Cash Drawer Reconciliation Model ----
const Shift = mongoose.model('Shift', new mongoose.Schema({
  shiftNo: { type: String, unique: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cashierName: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  branchName: String,
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  openedAt: { type: Date, default: Date.now },
  closedAt: Date,
  openingFloat: { type: Number, default: 0 },
  closingExpected: { type: Number, default: 0 },
  closingActual: { type: Number, default: 0 },
  difference: { type: Number, default: 0 },
  reconciliationStatus: { type: String, enum: ['balanced', 'over', 'short', 'pending'], default: 'pending' },
  closingNotes: String,
  cashSales: { type: Number, default: 0 },
  cardSales: { type: Number, default: 0 },
  cardCount: { type: Number, default: 0 },
  creditSales: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
  cashRefunds: { type: Number, default: 0 },
  cardRefunds: { type: Number, default: 0 },
  cardTerminalActual: { type: Number, default: 0 },
  cardDifference: { type: Number, default: 0 },
  cardReconciliationStatus: { type: String, enum: ['balanced', 'over', 'short', 'pending'], default: 'pending' },
  cashIn: { type: Number, default: 0 },
  cashOut: { type: Number, default: 0 },
  cashDrops: [{
    amount: Number,
    reason: String,
    type: { type: String, enum: ['cash_in', 'cash_out'] },
    createdAt: { type: Date, default: Date.now },
    user: String
  }]
}, { timestamps: true }));

const nextShiftNo = async () => 'SHIFT-' + String((await Counter.findByIdAndUpdate('shift', { $inc: { n: 1 } }, { new: true, upsert: true })).n).padStart(4, '0');

// ---- Helpers ----
const wrap = fn => (req, res) => fn(req, res).catch(e => res.status(e.status || (e.code === 11000 ? 400 : 500)).json({ error: e.code === 11000 ? 'That value already exists' : e.message }));
const fail = (status, message) => Object.assign(new Error(message), { status });
const auth = (spec) => (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET);
  } catch { return res.status(401).json({ error: 'Please log in' }); }

  if (!spec) return next();

  // Admin role always has full system bypass
  if (req.user.role === 'admin') return next();

  const specs = Array.isArray(spec) ? spec : [spec];

  // 1. Check if user's role directly matches any spec
  if (specs.includes(req.user.role)) return next();

  // 2. Check if user has any of the requested permissions
  const perms = req.user.permissions || ROLE_PERMISSIONS[req.user.role] || {};
  const hasPerm = specs.some(s => perms[s] === true);
  if (hasPerm) return next();

  return res.status(403).json({ error: 'Insufficient permission or training level for this action.' });
};

const token = u => {
  const perms = getEffectivePermissions(u.role, u.permissions);
  const lvl = u.trainingLevel || getTrainingLevel(u.role);
  return jwt.sign({ 
    id: u._id, 
    role: u.role, 
    name: u.name, 
    permissions: perms, 
    trainingLevel: lvl 
  }, JWT_SECRET, { expiresIn: '12h' });
};

const app = express();
app.use(cors(), express.json({ limit: '50mb' }), express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/config', (_, res) => res.json({ businessType: BUSINESS_TYPE, shopName: SHOP_NAME, loyalty: { rate: LOYALTY_RATE, pointValue: POINT_VALUE }, currency: CURRENCY, taxRate: +TAX_RATE, features }));

// ---- Auth (first user becomes admin) ----
app.post('/api/auth/register', wrap(async (req, res) => {
  const first = (await User.countDocuments()) === 0;
  if (!first) { auth(['canManageUsers', 'admin'])(req, res, () => {}); if (res.headersSent) return; }
  const { name, username, password, role = 'cashier' } = req.body;
  const userRole = first ? 'admin' : role;
  const perms = getEffectivePermissions(userRole);
  const lvl = getTrainingLevel(userRole);
  const u = await User.create({ 
    name, 
    username, 
    password: await bcrypt.hash(password, 10), 
    role: userRole,
    trainingLevel: lvl,
    permissions: perms
  });
  res.json({ 
    token: token(u), 
    user: { 
      _id: u._id, 
      name: u.name, 
      username: u.username, 
      role: u.role, 
      trainingLevel: lvl, 
      permissions: perms 
    } 
  });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const u = await User.findOne({ username: new RegExp('^' + esc(username) + '$', 'i') });
  if (!u || !(await bcrypt.compare(password, u.password))) throw fail(401, 'Wrong username or password');
  if (u.active === false) throw fail(403, 'This account is disabled');
  const perms = getEffectivePermissions(u.role, u.permissions);
  const lvl = u.trainingLevel || getTrainingLevel(u.role);
  res.json({ 
    token: token(u), 
    user: { 
      _id: u._id, 
      name: u.name, 
      username: u.username, 
      role: u.role, 
      trainingLevel: lvl, 
      permissions: perms 
    } 
  });
}));
app.get('/api/auth/setup', wrap(async (_, res) => res.json({ needsAdmin: (await User.countDocuments()) === 0 })));

// ---- Products ----
app.get('/api/products', auth(), wrap(async (req, res) => {
  const { q } = req.query;
  const filter = q ? { $or: [{ name: new RegExp(esc(q), 'i') }, { sku: q }, { barcode: q }] } : {};
  res.json(await Product.find(filter).sort('name').limit(200));
}));
app.post('/api/products', auth(['canAdjustStock', 'canManagePurchases', 'admin']), wrap(async (req, res) => {
  if (!req.body.sku) req.body.sku = await nextSku();
  const p = await Product.create(req.body);
  if (p.category?.trim()) await Category.findOneAndUpdate({ name: p.category.trim() }, { name: p.category.trim() }, { upsert: true }).catch(() => {});
  if (p.brand?.trim()) await Brand.findOneAndUpdate({ name: p.brand.trim() }, { name: p.brand.trim() }, { upsert: true }).catch(() => {});
  if (p.trackStock && p.stock) await logMove(p, p.stock, 'initial stock', '', req.user.name);
  res.json(p);
}));
app.put('/api/products/:id', auth(['canAdjustStock', 'canManagePurchases', 'admin']), wrap(async (req, res) => {
  if (!req.body.sku) delete req.body.sku;
  const before = await Product.findById(req.params.id);
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (p.category?.trim()) await Category.findOneAndUpdate({ name: p.category.trim() }, { name: p.category.trim() }, { upsert: true }).catch(() => {});
  if (p.brand?.trim()) await Brand.findOneAndUpdate({ name: p.brand.trim() }, { name: p.brand.trim() }, { upsert: true }).catch(() => {});
  if (before && p.trackStock && p.stock !== before.stock) await logMove(p, p.stock - before.stock, 'edited in product form', '', req.user.name);
  res.json(p);
}));
app.delete('/api/products/:id', auth(['admin']), wrap(async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---- Users (admin) ----
// ---- Users & Role Management ----
app.get('/api/users/roles', auth(['canManageUsers', 'admin']), wrap(async (_, res) => {
  res.json({
    roles: [
      { id: 'cashier', name: 'Cashier', level: 1, description: 'Basic sales & customer payments' },
      { id: 'senior_cashier', name: 'Senior Cashier', level: 2, description: 'Sales, refunds, voids, discounts & drawer balance' },
      { id: 'supervisor', name: 'Shift Supervisor', level: 3, description: 'Drawer control, approvals, stock checks & shift reports' },
      { id: 'inventory_clerk', name: 'Inventory / Stock Clerk', level: 2, description: 'Stock counts, manual adjustments, purchase orders' },
      { id: 'admin', name: 'Administrator', level: 4, description: 'Full system control, staff accounts, branches & settings' }
    ],
    defaultPermissions: ROLE_PERMISSIONS
  });
}));

app.get('/api/users', auth(['canManageUsers', 'admin']), wrap(async (_, res) => {
  res.json(await User.find().select('-password').sort('name'));
}));

app.post('/api/users', auth(['canManageUsers', 'admin']), wrap(async (req, res) => {
  const { name, username, password, role = 'cashier', permissions, trainingLevel } = req.body;
  if (!name || !username || !password) throw fail(400, 'Name, username and password are required');
  const validRoles = ['admin', 'supervisor', 'senior_cashier', 'cashier', 'inventory_clerk'];
  const userRole = validRoles.includes(role) ? role : 'cashier';
  const effectivePerms = getEffectivePermissions(userRole, permissions);
  const lvl = trainingLevel || getTrainingLevel(userRole);

  const u = await User.create({
    name: name.trim(),
    username: username.trim(),
    role: userRole,
    trainingLevel: lvl,
    permissions: effectivePerms,
    password: await bcrypt.hash(password, 10),
    active: true
  });
  await logAudit(req, 'USER_CREATED', 'user', `Created user ${u.name} with role ${u.role} (Level ${lvl})`, u.username, { role: u.role, trainingLevel: lvl });
  res.json({ _id: u._id, name: u.name, username: u.username, role: u.role, trainingLevel: u.trainingLevel, permissions: u.permissions, active: u.active });
}));

app.put('/api/users/:id', auth(['canManageUsers', 'admin']), wrap(async (req, res) => {
  const { name, role, permissions, trainingLevel, active, password } = req.body, upd = {};
  if (name?.trim()) upd.name = name.trim();
  if (role) {
    const validRoles = ['admin', 'supervisor', 'senior_cashier', 'cashier', 'inventory_clerk'];
    if (validRoles.includes(role)) {
      upd.role = role;
      upd.trainingLevel = trainingLevel || getTrainingLevel(role);
      upd.permissions = getEffectivePermissions(role, permissions);
    }
  } else if (permissions) {
    const current = await User.findById(req.params.id);
    if (current) {
      upd.permissions = getEffectivePermissions(current.role, permissions);
    }
  }
  if (typeof active === 'boolean') upd.active = active;
  if (password) upd.password = await bcrypt.hash(password, 10);
  if (req.params.id === req.user.id && (upd.active === false || (upd.role && upd.role !== 'admin'))) {
    throw fail(400, "You can't disable or demote your own account");
  }
  const updated = await User.findByIdAndUpdate(req.params.id, upd, { new: true }).select('-password');
  await logAudit(req, 'USER_UPDATED', 'user', `Updated user ${updated.name}: role ${updated.role}`, updated.username, { role: updated.role, active: updated.active });
  res.json(updated);
}));

// ---- Categories & brands ----
for (const [path, M, field] of [['categories', Category, 'category'], ['brands', Brand, 'brand']]) {
  app.get(`/api/${path}`, auth(), wrap(async (_, res) => res.json(await M.find().sort('name'))));
  app.post(`/api/${path}`, auth(), wrap(async (req, res) => {
    const raw = req.body.name?.trim();
    if (!raw) throw fail(400, 'Name is required');
    const existing = await M.findOne({ name: new RegExp('^' + esc(raw) + '$', 'i') });
    if (existing) throw fail(400, `"${existing.name}" already exists`);
    res.json(await M.create({ name: raw }));
  }));
  app.put(`/api/${path}/:id`, auth(), wrap(async (req, res) => {
    const name = req.body.name?.trim();
    if (!name) throw fail(400, 'Name is required');
    const item = await M.findById(req.params.id);
    if (!item) throw fail(404, 'Not found');
    const old = item.name;
    item.name = name;
    await item.save(); // throws on duplicate before any product is touched
    if (old !== name) await Product.updateMany({ [field]: old }, { [field]: name });
    res.json(item);
  }));
  app.delete(`/api/${path}/:id`, auth(['admin']), wrap(async (req, res) => {
    const item = await M.findById(req.params.id);
    if (item && await Product.exists({ [field]: item.name })) throw fail(400, `Some products still use "${item.name}"`);
    await M.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  }));
}

// ---- Stock ----
app.get('/api/stock/movements', auth(['canAdjustStock', 'canViewReports', 'admin']), wrap(async (req, res) => {
  res.json(await StockMovement.find(req.query.product ? { product: req.query.product } : {}).sort('-createdAt').limit(200));
}));
app.post('/api/stock/adjust', auth(['canAdjustStock', 'admin']), wrap(async (req, res) => {
  const { product, change, reason } = req.body;
  if (!product || !Number.isFinite(change) || change === 0) throw fail(400, 'Choose a product and enter a non-zero quantity');
  const p = await Product.findOneAndUpdate({ _id: product, trackStock: true, ...(change < 0 ? { stock: { $gte: -change } } : {}) }, { $inc: { stock: change } }, { new: true });
  if (!p) throw fail(400, 'Product not found, not tracked, or not enough stock');
  await logMove(p, change, reason || 'adjustment', '', req.user.name);
  res.json(p);
}));

// ---- Returns ----
app.post('/api/sales/:id/return', auth(['canRefund', 'admin']), wrap(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw fail(404, 'Sale not found');
  const { items = [], reason, refundMethod = (sale.paymentMethod || 'cash'), approvalCode, last4 } = req.body;
  if (!items.length) throw fail(400, 'Select at least one item');
  
  if (refundMethod === 'card') {
    const rawCode = (approvalCode || '').trim();
    if (!rawCode) throw fail(400, 'Terminal Refund Auth/Approval Code is required for card refunds.');
  }

  const ratio = sale.subtotal ? sale.total / sale.subtotal : 1; // refund includes the item's share of discount and tax
  const lines = []; let amount = 0;
  for (const it of items) {
    const line = sale.items.id(it.itemId), qty = +it.qty;
    if (!line || !(qty > 0) || qty > line.qty - (line.returnedQty || 0)) throw fail(400, 'Invalid return quantity');
    line.returnedQty = (line.returnedQty || 0) + qty;
    amount += qty * line.price * ratio;
    lines.push({ product: line.product, name: line.name, qty, price: line.price });
  }
  amount = +amount.toFixed(2);
  sale.refunded = +((sale.refunded || 0) + amount).toFixed(2);
  await sale.save();

  const activeShift = await Shift.findOne({ status: 'open', cashier: req.user.id }) || await Shift.findOne({ status: 'open' }).sort('-openedAt');

  let paymentRecord = null;
  if (refundMethod === 'card') {
    paymentRecord = await Payment.create({
      sale: sale._id,
      invoiceNo: sale.invoiceNo,
      shift: activeShift?._id,
      shiftNo: activeShift?.shiftNo,
      branch: sale.branch,
      branchName: sale.branchName,
      branchCode: sale.branchCode,
      cashier: req.user.id,
      cashierName: req.user.name,
      method: 'card',
      amount: -amount,
      status: 'refunded',
      approvalCode: (approvalCode || '').trim(),
      last4: (last4 || sale.last4 || '').trim(),
      cardType: sale.cardType || 'Card',
      provider: 'manual',
      notes: reason || 'Item return card refund'
    });
    // Mark prior card payment if exists
    await Payment.updateMany(
      { sale: sale._id, method: 'card', status: 'completed' },
      { $inc: { refundedAmount: amount } }
    );
  }

  const refund = await Refund.create({
    sale: sale._id,
    invoiceNo: sale.invoiceNo,
    items: lines,
    amount,
    reason,
    cashierName: req.user.name,
    refundMethod,
    approvalCode: (approvalCode || '').trim(),
    last4: (last4 || sale.last4 || '').trim(),
    payment: paymentRecord?._id
  });

  for (const l of lines) {
    const p = await Product.findOneAndUpdate({ _id: l.product, trackStock: true }, { $inc: { stock: l.qty } }, { new: true });
    if (p) await logMove(p, l.qty, 'return', sale.invoiceNo, req.user.name);
  }

  if (refundMethod !== 'card') {
    await refundCustomer(sale, amount, req.user.name);
  } else if (sale.customer) {
    // If card refund, adjust loyalty points if applicable without reducing cash customer credit balance
    const c = await Customer.findById(sale.customer);
    if (c && LOYALTY_RATE > 0 && sale.pointsEarned) {
      const lost = Math.min(Math.floor(amount / LOYALTY_RATE), c.points);
      if (lost > 0) {
        const u = await Customer.findByIdAndUpdate(c._id, { $inc: { points: -lost } }, { new: true });
        await CustomerTxn.create({ customer: c._id, type: 'refund', ref: sale.invoiceNo, total: -amount, amount: 0, points: -lost, balanceAfter: u.balance, by: req.user.name });
      }
    }
  }

  // Update active open shift: NEVER take card refunds from the cash drawer float!
  if (activeShift) {
    if (refundMethod === 'card') {
      await Shift.updateOne({ _id: activeShift._id }, { $inc: { cardRefunds: amount } });
    } else if (refundMethod === 'cash') {
      await Shift.updateOne({ _id: activeShift._id }, { $inc: { cashRefunds: amount } });
    }
  }

  await logAudit(req, 'REFUND_PROCESSED', 'refund', `Refund of ${amount} via ${refundMethod} for invoice ${sale.invoiceNo}`, sale.invoiceNo, { amount, refundMethod, approvalCode, reason });

  res.json(refund);
}));
app.get('/api/returns', auth(['admin']), wrap(async (_, res) => res.json(await Refund.find().sort('-createdAt').limit(100))));

// ---- Suppliers ----
app.get('/api/suppliers', auth(['admin', 'canManagePurchases']), wrap(async (_, res) => res.json(await Supplier.find().sort({ company: 1, name: 1 }))));
app.post('/api/suppliers', auth(['admin', 'canManagePurchases']), wrap(async (req, res) => {
  const { name, company, contactPerson, itemsProvided, phone, email, address, paymentTerms, taxId, notes } = req.body;
  const primaryName = (company?.trim() || name?.trim());
  if (!primaryName) throw fail(400, 'Supplier name or Company name is required');
  res.json(await Supplier.create({
    name: name?.trim() || company?.trim(),
    company: company?.trim() || '',
    contactPerson: contactPerson?.trim() || '',
    itemsProvided: itemsProvided?.trim() || '',
    phone: phone?.trim() || '',
    email: email?.trim() || '',
    address: address?.trim() || '',
    paymentTerms: paymentTerms?.trim() || '',
    taxId: taxId?.trim() || '',
    notes: notes?.trim() || ''
  }));
}));
app.put('/api/suppliers/:id', auth(['canManagePurchases', 'admin']), wrap(async (req, res) => {
  const { name, company, contactPerson, itemsProvided, phone, email, address, paymentTerms, taxId, notes } = req.body;
  const primaryName = (company?.trim() || name?.trim());
  if (!primaryName) throw fail(400, 'Supplier name or Company name is required');
  res.json(await Supplier.findByIdAndUpdate(req.params.id, {
    name: name?.trim() || company?.trim(),
    company: company?.trim() || '',
    contactPerson: contactPerson?.trim() || '',
    itemsProvided: itemsProvided?.trim() || '',
    phone: phone?.trim() || '',
    email: email?.trim() || '',
    address: address?.trim() || '',
    paymentTerms: paymentTerms?.trim() || '',
    taxId: taxId?.trim() || '',
    notes: notes?.trim() || ''
  }, { new: true }));
}));
app.delete('/api/suppliers/:id', auth(['admin', 'canManagePurchases']), wrap(async (req, res) => {
  if (await PurchaseOrder.exists({ supplier: req.params.id })) throw fail(400, 'This supplier has purchase orders, so it cannot be deleted');
  await Supplier.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// ---- Purchase orders ----
app.get('/api/purchases', auth(['canManagePurchases', 'admin']), wrap(async (_, res) => res.json(await PurchaseOrder.find().sort('-createdAt').limit(100))));
app.post('/api/purchases', auth(['canManagePurchases', 'admin']), wrap(async (req, res) => {
  const { supplier, items = [], notes } = req.body;
  const sup = await Supplier.findById(supplier);
  if (!sup) throw fail(400, 'Choose a supplier');
  if (!items.length) throw fail(400, 'Add at least one item');
  const lines = [];
  for (const it of items) {
    const p = await Product.findById(it.product), qty = +it.qty, cost = +it.cost;
    if (!p || !(qty > 0) || !(cost >= 0)) throw fail(400, 'Check the item quantities and costs');
    lines.push({ product: p._id, name: p.name, qty, cost });
  }
  const supplierLabel = sup.company ? (sup.contactPerson || (sup.name && sup.name !== sup.company) ? `${sup.company} (${sup.contactPerson || sup.name})` : sup.company) : sup.name;
  res.json(await PurchaseOrder.create({ poNo: await nextPo(), supplier: sup._id, supplierName: supplierLabel, items: lines, total, notes, createdBy: req.user.name }));
}));
app.post('/api/purchases/:id/receive', auth(['canManagePurchases', 'admin']), wrap(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw fail(404, 'Purchase order not found');
  if (po.status === 'cancelled' || po.status === 'received') throw fail(400, `This order is already ${po.status}`);
  const got = (req.body.items || []).filter(i => +i.qty > 0);
  if (!got.length) throw fail(400, 'Enter a received quantity');
  for (const it of got) { // validate everything first so nothing is half-applied
    const line = po.items.id(it.itemId);
    if (!line || +it.qty > line.qty - line.receivedQty) throw fail(400, 'Received quantity is more than ordered');
  }
  for (const it of got) {
    const line = po.items.id(it.itemId), qty = +it.qty;
    line.receivedQty += qty;
    const set = { cost: line.cost };
    if (features.batch) { if (it.batchNo) set.batchNo = it.batchNo; if (it.expiryDate) set.expiryDate = it.expiryDate; }
    const p0 = await Product.findById(line.product);
    if (!p0) continue;
    const upd = { $set: set };
    if (p0.trackStock) upd.$inc = { stock: qty };
    const p = await Product.findByIdAndUpdate(p0._id, upd, { new: true });
    if (p0.trackStock) await logMove(p, qty, 'purchase received', po.poNo, req.user.name);
  }
  po.status = po.items.every(l => l.receivedQty >= l.qty) ? 'received' : 'partial';
  await po.save();
  res.json(po);
}));
app.post('/api/purchases/:id/cancel', auth(['admin']), wrap(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw fail(404, 'Purchase order not found');
  if (po.items.some(l => l.receivedQty > 0)) throw fail(400, 'Some items were already received, so this order cannot be cancelled');
  po.status = 'cancelled';
  await po.save();
  res.json(po);
}));

// ---- Customers ----
app.get('/api/customers', auth(), wrap(async (req, res) => {
  const q = req.query.q;
  const filter = q ? { $or: [{ name: new RegExp(esc(q), 'i') }, { phone: new RegExp(esc(q)) }] } : {};
  res.json(await Customer.find(filter).sort('name').limit(+req.query.limit || 30));
}));
app.post('/api/customers', auth(), wrap(async (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name?.trim()) throw fail(400, 'Customer name is required');
  res.json(await Customer.create({ name: name.trim(), phone, email, address }));
}));

app.put('/api/customers/:id', auth(['admin']), wrap(async (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name?.trim()) throw fail(400, 'Customer name is required');
  res.json(await Customer.findByIdAndUpdate(req.params.id, { name: name.trim(), phone, email, address }, { new: true }));
}));
app.delete('/api/customers/:id', auth(['admin']), wrap(async (req, res) => {
  if (await Sale.exists({ customer: req.params.id })) throw fail(400, 'This customer has purchases, so it cannot be deleted');
  await Customer.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));
app.get('/api/customers/:id/statement', auth(['admin']), wrap(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw fail(404, 'Customer not found');
  const [txns, sales] = await Promise.all([
    CustomerTxn.find({ customer: customer._id }).sort('-createdAt').limit(200),
    Sale.find({ customer: customer._id }).sort('-createdAt').limit(50),
  ]);
  res.json({ customer, txns, sales });
}));
app.post('/api/customers/:id/payment', auth(['admin']), wrap(async (req, res) => {
  const amount = +(+req.body.amount).toFixed(2);
  if (!(amount > 0)) throw fail(400, 'Enter a payment amount');
  const c = await Customer.findOneAndUpdate({ _id: req.params.id, balance: { $gte: amount - 0.005 } }, { $inc: { balance: -amount } }, { new: true });
  if (!c) throw fail(400, 'Payment is more than the amount owed');
  await CustomerTxn.create({ customer: c._id, type: 'payment', ref: req.body.note || '', amount: -amount, points: 0, balanceAfter: c.balance, by: req.user.name });
  res.json(c);
}));

// ---- Sales ----
app.post('/api/sales', auth(), wrap(async (req, res) => {
  const { items = [], discount = 0, paymentMethod, paid = 0, orderType, tableNo, notes, prescriptionNo, customerId, redeemPoints = 0, branchId } = req.body;
  if (!items.length) throw fail(400, 'Cart is empty');
  const deducted = []; // for rollback (works without a replica set)
  const moves = [];
  let pointsTaken = 0, cust = null;
  try {
    const lines = [];
    for (const it of items) {
      const p = await Product.findById(it.product);
      if (!p) throw fail(400, 'Product not found');
      if (features.batch && p.expiryDate && p.expiryDate < new Date()) throw fail(400, `${p.name} is expired`);
      if (features.prescription && p.requiresPrescription && !prescriptionNo) throw fail(400, `${p.name} needs a prescription number`);
      if (p.trackStock) {
        const u = await Product.findOneAndUpdate({ _id: p._id, stock: { $gte: it.qty } }, { $inc: { stock: -it.qty } }, { new: true });
        if (!u) throw fail(400, `Not enough stock for ${p.name}`);
        deducted.push({ id: p._id, qty: it.qty });
        moves.push({ product: p._id, name: p.name, change: -it.qty, balance: u.stock, reason: 'sale', user: req.user.name });
      }
      lines.push({ product: p._id, name: p.name, qty: it.qty, price: p.price, cost: p.cost || 0 }); // price and cost always from DB
    }
    const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
    cust = customerId ? await Customer.findById(customerId) : null;
    if (customerId && !cust) throw fail(400, 'Customer not found');
    const redeem = Math.max(0, Math.min(Math.floor(+redeemPoints || 0), Math.floor((subtotal - discount) / POINT_VALUE)));
    if (redeem > 0) {
      if (!cust) throw fail(400, 'Choose a customer to redeem points');
      if (!(LOYALTY_RATE > 0)) throw fail(400, 'Loyalty points are not enabled');
      if (!await Customer.findOneAndUpdate({ _id: cust._id, points: { $gte: redeem } }, { $inc: { points: -redeem } })) throw fail(400, 'Not enough loyalty points');
      pointsTaken = redeem;
    }
    const pointsValue = redeem * POINT_VALUE;
    const tax = +((subtotal - discount - pointsValue) * (+TAX_RATE / 100)).toFixed(2);
    const total = +(subtotal - discount - pointsValue + tax).toFixed(2);
    const pointsEarned = cust && LOYALTY_RATE > 0 ? Math.floor(total / LOYALTY_RATE) : 0;
    if (paymentMethod === 'credit' && !cust) throw fail(400, 'Choose a customer for a credit sale');
    if (paymentMethod === 'cash' && paid < total) throw fail(400, 'Paid amount is less than total');

    let rawApproval = '';
    let rawLast4 = '';
    let cardType = req.body.cardType || 'Card';
    if (paymentMethod === 'card') {
      rawApproval = (req.body.approvalCode || '').trim();
      rawLast4 = (req.body.last4 || '').trim();
      if (!rawApproval) {
        throw fail(400, 'Terminal Approval / Auth Code is required for card payments.');
      }
      if (!rawLast4 || rawLast4.length < 4) {
        throw fail(400, 'Please enter the last 4 digits of the card (e.g. 4242).');
      }

      // Check for duplicate approval code on the SAME CALENDAR DAY
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const duplicatePayment = await Payment.findOne({
        method: 'card',
        approvalCode: new RegExp(`^${esc(rawApproval)}$`, 'i'),
        status: 'completed',
        createdAt: { $gte: todayStart, $lte: todayEnd }
      });

      if (duplicatePayment) {
        throw fail(400, `Duplicate terminal approval code "${rawApproval}". This code was already processed today on invoice ${duplicatePayment.invoiceNo}. Please verify the printed terminal slip.`);
      }
    }

    let branch = null;
    if (branchId) branch = await Branch.findById(branchId).catch(() => null);
    if (!branch) branch = await Branch.findOne({ isDefault: true }) || await Branch.findOne();

    const sale = await Sale.create({
      invoiceNo: await nextInvoice(),
      cashierName: req.user.name,
      customer: cust?._id,
      customerName: cust?.name,
      cashier: req.user.id,
      branch: branch?._id,
      branchName: branch?.name,
      branchCode: branch?.code,
      items: lines,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      approvalCode: paymentMethod === 'card' ? rawApproval : undefined,
      last4: paymentMethod === 'card' ? rawLast4 : undefined,
      cardType: paymentMethod === 'card' ? cardType : undefined,
      cardProvider: paymentMethod === 'card' ? 'manual' : undefined,
      paid: paymentMethod === 'cash' ? paid : paymentMethod === 'card' ? total : 0,
      change: paymentMethod === 'cash' ? Math.max(0, paid - total) : 0,
      pointsEarned,
      pointsRedeemed: redeem,
      pointsValue,
      orderType,
      tableNo,
      notes,
      prescriptionNo
    });
    if (moves.length) await StockMovement.insertMany(moves.map(m => ({ ...m, ref: sale.invoiceNo })));
    if (cust) await applyCustomer(cust, sale, req.user.name);

    // Update active open shift
    const activeShift = await Shift.findOne({ status: 'open', cashier: req.user.id }) || await Shift.findOne({ status: 'open' }).sort('-openedAt');
    if (activeShift) {
      const inc = { totalSales: sale.total, salesCount: 1 };
      if (sale.paymentMethod === 'cash') inc.cashSales = sale.total;
      else if (sale.paymentMethod === 'card') {
        inc.cardSales = sale.total;
        inc.cardCount = 1;
      }
      else if (sale.paymentMethod === 'credit') inc.creditSales = sale.total;
      await Shift.updateOne({ _id: activeShift._id }, { $inc: inc });
    }

    // Record Payment record
    if (paymentMethod === 'card') {
      await Payment.create({
        sale: sale._id,
        invoiceNo: sale.invoiceNo,
        shift: activeShift?._id,
        shiftNo: activeShift?.shiftNo,
        branch: branch?._id,
        branchName: branch?.name,
        branchCode: branch?.code,
        cashier: req.user.id,
        cashierName: req.user.name,
        method: 'card',
        amount: sale.total,
        status: 'completed',
        approvalCode: rawApproval,
        last4: rawLast4,
        cardType,
        provider: 'manual',
        terminalRef: req.body.terminalRef || '',
        notes: req.body.cardNotes || '',
      });
    }

    await logAudit(req, 'SALE_COMPLETED', 'sale', `Sale ${sale.invoiceNo} completed: ${sale.total} via ${sale.paymentMethod}${paymentMethod === 'card' ? ` (Auth: ${rawApproval})` : ''}`, sale.invoiceNo, { total: sale.total, method: sale.paymentMethod, approvalCode: rawApproval, count: lines.length, branch: branch?.code });

    res.json(sale);
  } catch (e) {
    for (const d of deducted) await Product.updateOne({ _id: d.id }, { $inc: { stock: d.qty } });
    if (pointsTaken && cust) await Customer.updateOne({ _id: cust._id }, { $inc: { points: pointsTaken } });
    throw e;
  }
}));
app.get('/api/sales', auth(), wrap(async (req, res) => {
  const filter = {};
  if (req.query.branch) filter.branch = req.query.branch;
  res.json(await Sale.find(filter).sort('-createdAt').limit(100));
}));

// ---- Reports ----
app.get('/api/reports/today', auth(['canViewReports', 'admin']), wrap(async (_, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [t] = await Sale.aggregate([{ $match: { createdAt: { $gte: start } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } }]);
  const lowStock = await Product.find({ trackStock: true, stock: { $lte: 5 } }).select('name stock').limit(20);
  const expiring = features.batch ? await Product.find({ expiryDate: { $lte: new Date(Date.now() + 90 * 864e5) } }).select('name expiryDate batchNo').limit(20) : [];
  const [rf] = await Refund.aggregate([{ $match: { createdAt: { $gte: start } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]);
  res.json({ count: t?.count || 0, revenue: (t?.revenue || 0) - (rf?.amount || 0), refunds: rf?.amount || 0, lowStock, expiring });
}));

// ---- Report endpoints ----
const r2 = n => +(n || 0).toFixed(2);
const dayKey = d => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const bump = (map, key, init) => (map[key] ||= { ...init });

app.get('/api/reports/summary', auth(['canViewReports', 'admin']), wrap(async (req, res) => {
  const to = req.query.to ? new Date(req.query.to + 'T23:59:59.999') : new Date();
  const from = req.query.from ? new Date(req.query.from + 'T00:00:00') : new Date(to.getTime() - 29 * 864e5);
  if (isNaN(from) || isNaN(to) || from > to) throw fail(400, 'Invalid date range');
  if (to - from > 366 * 864e5) throw fail(400, 'Choose a range of one year or less');
  const sales = await Sale.find({ createdAt: { $gte: from, $lte: to } }).lean().limit(20000);
  const costMap = Object.fromEntries((await Product.find().select('cost').lean()).map(p => [String(p._id), p.cost || 0]));
  const t = { orders: 0, gross: 0, refunds: 0, net: 0, netSales: 0, tax: 0, discounts: 0, profit: 0, creditGiven: 0 };
  const daily = {}, byMethod = {}, byCashier = {}, byProduct = {}, byCustomer = {};
  for (const s of sales) {
    let rev = 0, cost = 0;
    for (const l of s.items) {
      const q = l.qty - (l.returnedQty || 0), c = l.cost ?? costMap[String(l.product)] ?? 0;
      rev += q * l.price; cost += q * c;
      const p = bump(byProduct, String(l.product), { name: l.name, qty: 0, revenue: 0, profit: 0 });
      p.qty += q; p.revenue += q * l.price; p.profit += q * (l.price - c);
    }
    const disc = (s.discount || 0) + (s.pointsValue || 0);
    const discNet = s.subtotal > 0 ? disc * (rev / s.subtotal) : 0;
    const profit = rev - discNet - cost, net = s.total - (s.refunded || 0);
    t.orders++; t.gross += s.total; t.refunds += s.refunded || 0; t.net += net; t.netSales += rev - discNet;
    t.tax += s.tax || 0; t.discounts += disc; t.profit += profit;
    if (s.paymentMethod === 'credit') t.creditGiven += s.total;
    const d = bump(daily, dayKey(s.createdAt), { date: dayKey(s.createdAt), orders: 0, revenue: 0, profit: 0 });
    d.orders++; d.revenue += net; d.profit += profit;
    const m = bump(byMethod, s.paymentMethod || 'cash', { method: s.paymentMethod || 'cash', orders: 0, amount: 0 });
    m.orders++; m.amount += s.total;
    const c = bump(byCashier, s.cashierName || '-', { name: s.cashierName || '-', orders: 0, revenue: 0, profit: 0 });
    c.orders++; c.revenue += net; c.profit += profit;
    if (s.customerName) { const u = bump(byCustomer, s.customerName, { name: s.customerName, orders: 0, spent: 0 }); u.orders++; u.spent += net; }
  }
  const days = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) days.push(daily[dayKey(d)] || { date: dayKey(d), orders: 0, revenue: 0, profit: 0 });
  const rows = (o, key) => Object.values(o).map(x => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, typeof v === 'number' ? r2(v) : v]))).sort((a, b) => b[key] - a[key]);
  const [owed] = await Customer.aggregate([{ $group: { _id: null, owed: { $sum: '$balance' }, points: { $sum: '$points' } } }]);
  const [pr] = await CustomerTxn.aggregate([{ $match: { type: 'payment', createdAt: { $gte: from, $lte: to } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]);
  res.json({
    totals: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, r2(v)])),
    daily: days.map(d => ({ ...d, revenue: r2(d.revenue), profit: r2(d.profit) })),
    byMethod: rows(byMethod, 'amount'), byCashier: rows(byCashier, 'revenue'),
    topProducts: rows(byProduct, 'revenue').slice(0, 15), topCustomers: rows(byCustomer, 'spent').slice(0, 15),
    paymentsReceived: r2(Math.abs(pr?.amount || 0)),
    receivables: { total: r2(owed?.owed), points: owed?.points || 0, customers: await Customer.find({ balance: { $gt: 0 } }).sort('-balance').limit(30).select('name phone balance') },
  });
}));

app.get('/api/reports/inventory', auth(['canViewReports', 'admin']), wrap(async (_, res) => {
  const products = await Product.find({ trackStock: true }).lean();
  let units = 0, costValue = 0, retailValue = 0;
  for (const p of products) { units += p.stock; costValue += p.stock * (p.cost || 0); retailValue += p.stock * p.price; }
  const pick = p => ({ name: p.name, sku: p.sku, stock: p.stock, cost: p.cost, price: p.price, batchNo: p.batchNo, expiryDate: p.expiryDate });
  const soon = Date.now() + 90 * 864e5;
  res.json({
    units, costValue: r2(costValue), retailValue: r2(retailValue),
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 50).map(pick),
    outOfStock: products.filter(p => p.stock <= 0).slice(0, 50).map(pick),
    expiring: features.batch ? products.filter(p => p.expiryDate && +p.expiryDate <= soon).sort((a, b) => a.expiryDate - b.expiryDate).slice(0, 50).map(pick) : [],
  });
}));

// ---- Shifts & Cash Drawer Reconciliation Routes ----
app.get('/api/shifts/current', auth(), wrap(async (req, res) => {
  let shift = await Shift.findOne({ status: 'open', cashier: req.user.id });
  if (!shift) {
    shift = await Shift.findOne({ status: 'open' }).sort('-openedAt');
  }
  if (!shift) return res.json({ open: false, shift: null });

  const expectedCash = +(shift.openingFloat + shift.cashSales - (shift.cashRefunds || 0) + shift.cashIn - shift.cashOut).toFixed(2);
  const expectedCard = +(shift.cardSales - (shift.cardRefunds || 0)).toFixed(2);
  const cardPayments = await Payment.find({ shift: shift._id, method: 'card' }).sort('-createdAt').limit(100);

  res.json({
    open: true,
    shift: {
      ...shift.toObject(),
      expectedCash,
      expectedCard,
      cardPayments,
    }
  });
}));

app.post('/api/shifts/open', auth(['canOpenShift', 'admin']), wrap(async (req, res) => {
  const existing = await Shift.findOne({ status: 'open', cashier: req.user.id });
  if (existing) throw fail(400, 'You already have an open shift');

  const openingFloat = Math.max(0, +req.body.openingFloat || 0);
  const shiftNo = await nextShiftNo();
  let branch = null;
  if (req.body.branchId) branch = await Branch.findById(req.body.branchId).catch(() => null);
  if (!branch) branch = await Branch.findOne({ isDefault: true }) || await Branch.findOne();

  const shift = await Shift.create({
    shiftNo,
    cashier: req.user.id,
    cashierName: req.user.name,
    branch: branch?._id,
    branchName: branch?.name,
    status: 'open',
    openingFloat,
    openedAt: new Date()
  });

  await logAudit(req, 'SHIFT_OPENED', 'cash_drawer', `Shift ${shiftNo} opened with starting cash float: ${openingFloat}`, shiftNo, { openingFloat });
  res.json(shift);
}));

app.post('/api/shifts/drop', auth(['canOpenShift', 'canCloseShift', 'admin']), wrap(async (req, res) => {
  const { type, amount, reason } = req.body;
  if (!['cash_in', 'cash_out'].includes(type)) throw fail(400, 'Invalid drop type');
  const numAmount = +amount;
  if (!numAmount || numAmount <= 0) throw fail(400, 'Enter a valid amount');

  const shift = await Shift.findOne({ status: 'open', cashier: req.user.id }) || await Shift.findOne({ status: 'open' }).sort('-openedAt');
  if (!shift) throw fail(400, 'No active shift found to register cash movement');

  const dropItem = {
    amount: numAmount,
    reason: reason || (type === 'cash_in' ? 'Float addition' : 'Cash drop to safe'),
    type,
    createdAt: new Date(),
    user: req.user.name
  };

  shift.cashDrops.push(dropItem);
  if (type === 'cash_in') shift.cashIn += numAmount;
  else shift.cashOut += numAmount;
  await shift.save();

  await logAudit(req, type === 'cash_in' ? 'CASH_IN' : 'CASH_DROP', 'cash_drawer', `${type === 'cash_in' ? 'Cash in (Pay-in)' : 'Cash drop (Pay-out)'}: ${numAmount} (${dropItem.reason})`, shift.shiftNo, { amount: numAmount, reason });
  res.json(shift);
}));

app.post('/api/shifts/close', auth(['canCloseShift', 'admin']), wrap(async (req, res) => {
  const shift = await Shift.findOne({ status: 'open', cashier: req.user.id }) || await Shift.findOne({ status: 'open' }).sort('-openedAt');
  if (!shift) throw fail(400, 'No open shift to close');

  const actual = +req.body.actualCash;
  if (isNaN(actual) || actual < 0) throw fail(400, 'Enter actual physical cash counted in drawer');

  const expected = +(shift.openingFloat + shift.cashSales - (shift.cashRefunds || 0) + shift.cashIn - shift.cashOut).toFixed(2);
  const difference = +(actual - expected).toFixed(2);
  const reconciliationStatus = Math.abs(difference) < 0.01 ? 'balanced' : difference > 0 ? 'over' : 'short';

  // Card Terminal Batch Settlement Reconciliation
  const expectedCard = +(shift.cardSales - (shift.cardRefunds || 0)).toFixed(2);
  let actualCard = req.body.actualCard !== undefined && req.body.actualCard !== '' ? +req.body.actualCard : expectedCard;
  if (isNaN(actualCard) || actualCard < 0) actualCard = expectedCard;
  const cardDifference = +(actualCard - expectedCard).toFixed(2);
  const cardReconciliationStatus = Math.abs(cardDifference) < 0.01 ? 'balanced' : cardDifference > 0 ? 'over' : 'short';

  shift.status = 'closed';
  shift.closedAt = new Date();
  shift.closingExpected = expected;
  shift.closingActual = actual;
  shift.difference = difference;
  shift.reconciliationStatus = reconciliationStatus;
  shift.cardTerminalActual = actualCard;
  shift.cardDifference = cardDifference;
  shift.cardReconciliationStatus = cardReconciliationStatus;
  shift.closingNotes = req.body.notes || '';
  await shift.save();

  await logAudit(req, 'SHIFT_CLOSED', 'cash_drawer', `Shift ${shift.shiftNo} reconciled & closed. Cash: Expected ${expected}, Actual ${actual}, Var ${difference} (${reconciliationStatus}). Card Terminal: Expected ${expectedCard}, Actual ${actualCard}, Var ${cardDifference} (${cardReconciliationStatus})`, shift.shiftNo, { expected, actual, difference, reconciliationStatus, expectedCard, actualCard, cardDifference, cardReconciliationStatus, notes: shift.closingNotes });

  res.json(shift);
}));

app.get('/api/shifts', auth(), wrap(async (req, res) => {
  const filter = {};
  if (req.query.branch) filter.branch = req.query.branch;
  res.json(await Shift.find(filter).sort('-openedAt').limit(100));
}));

app.get('/api/shifts/:id', auth(), wrap(async (req, res) => {
  const shift = await Shift.findById(req.params.id);
  if (!shift) throw fail(404, 'Shift not found');
  res.json(shift);
}));

app.get('/api/shifts/:id/card-payments', auth(), wrap(async (req, res) => {
  const payments = await Payment.find({ shift: req.params.id, method: 'card' }).sort('-createdAt');
  res.json(payments);
}));

app.get('/api/payments', auth(), wrap(async (req, res) => {
  const filter = {};
  if (req.query.method) filter.method = req.query.method;
  if (req.query.shift) filter.shift = req.query.shift;
  if (req.query.sale) filter.sale = req.query.sale;
  if (req.query.branch) filter.branch = req.query.branch;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) {
      const to = new Date(req.query.to);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }
  res.json(await Payment.find(filter).sort('-createdAt').limit(+req.query.limit || 200));
}));

// ---- Audit Logs Routes ----
app.get('/api/audit-logs', auth(['admin']), wrap(async (req, res) => {
  const { category, search, limit = 150 } = req.query;
  const filter = {};
  if (category && category !== 'all') filter.category = category;
  if (search) {
    filter.$or = [
      { user: new RegExp(esc(search), 'i') },
      { action: new RegExp(esc(search), 'i') },
      { details: new RegExp(esc(search), 'i') },
      { ref: new RegExp(esc(search), 'i') }
    ];
  }
  res.json(await AuditLog.find(filter).sort('-createdAt').limit(+limit));
}));

// ---- Branch Routes ----
app.get('/api/branches', auth(), wrap(async (_, res) => {
  res.json(await Branch.find().sort({ isDefault: -1, name: 1 }));
}));

app.post('/api/branches', auth(['admin']), wrap(async (req, res) => {
  const { name, code, address, phone, email, isDefault } = req.body;
  if (!name?.trim()) throw fail(400, 'Branch name is required');
  if (!code?.trim()) throw fail(400, 'Branch code is required');
  const upperCode = code.trim().toUpperCase();
  if (await Branch.findOne({ code: upperCode })) throw fail(400, `Branch code "${upperCode}" already exists`);
  if (isDefault) await Branch.updateMany({}, { isDefault: false });
  const b = await Branch.create({
    name: name.trim(),
    code: upperCode,
    address: address?.trim() || '',
    phone: phone?.trim() || '',
    email: email?.trim() || '',
    isDefault: !!isDefault,
    active: true
  });
  await logAudit(req, 'BRANCH_CREATED', 'system', `Created branch: ${b.name} (${b.code})`, b.code, { branchId: b._id });
  res.json(b);
}));

app.put('/api/branches/:id', auth(['admin']), wrap(async (req, res) => {
  const { name, code, address, phone, email, isDefault, active } = req.body;
  const b = await Branch.findById(req.params.id);
  if (!b) throw fail(404, 'Branch not found');
  if (code && code.trim().toUpperCase() !== b.code) {
    const upperCode = code.trim().toUpperCase();
    if (await Branch.findOne({ code: upperCode, _id: { $ne: b._id } })) {
      throw fail(400, `Branch code "${upperCode}" already in use`);
    }
    b.code = upperCode;
  }
  if (name?.trim()) b.name = name.trim();
  if (address !== undefined) b.address = address.trim();
  if (phone !== undefined) b.phone = phone.trim();
  if (email !== undefined) b.email = email.trim();
  if (typeof active === 'boolean') b.active = active;
  if (isDefault) {
    await Branch.updateMany({ _id: { $ne: b._id } }, { isDefault: false });
    b.isDefault = true;
  }
  await b.save();
  await logAudit(req, 'BRANCH_UPDATED', 'system', `Updated branch: ${b.name} (${b.code})`, b.code, { branchId: b._id });
  res.json(b);
}));

app.delete('/api/branches/:id', auth(['admin']), wrap(async (req, res) => {
  const b = await Branch.findById(req.params.id);
  if (!b) throw fail(404, 'Branch not found');
  if (b.isDefault) throw fail(400, 'Cannot delete the default branch');
  if (await Sale.exists({ branch: b._id })) throw fail(400, 'Cannot delete branch with existing sales records');
  await Branch.findByIdAndDelete(req.params.id);
  await logAudit(req, 'BRANCH_DELETED', 'system', `Deleted branch: ${b.name} (${b.code})`, b.code);
  res.json({ ok: true });
}));

// ==========================================================================
// BACKUP & RESTORE SYSTEM
// ==========================================================================
const BACKUP_MODELS = {
  users: User,
  products: Product,
  sales: Sale,
  branches: Branch,
  categories: Category,
  brands: Brand,
  counters: Counter,
  customers: Customer,
  stockMovements: StockMovement,
  refunds: Refund,
  suppliers: Supplier,
  purchaseOrders: PurchaseOrder,
  customerTxns: CustomerTxn,
  auditLogs: AuditLog,
  shifts: Shift,
  payments: Payment,
};

const generateBackupData = async () => {
  const data = {};
  const counts = {};

  for (const [key, Model] of Object.entries(BACKUP_MODELS)) {
    const records = await Model.find().lean();
    data[key] = records;
    counts[key] = records.length;
  }

  return {
    meta: {
      version: '2.4',
      generatedAt: new Date().toISOString(),
      shopName: SHOP_NAME,
      businessType: BUSINESS_TYPE,
      currency: CURRENCY,
      taxRate: +TAX_RATE,
    },
    counts,
    data,
  };
};

const pruneOldBackups = (keepMax = 7) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return;
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const full = path.join(BACKUPS_DIR, f);
        return { file: f, path: full, mtime: fs.statSync(full).mtime.getTime() };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > keepMax) {
      for (const item of files.slice(keepMax)) {
        fs.unlinkSync(item.path);
        console.log(`Pruned old backup snapshot: ${item.file}`);
      }
    }
  } catch (e) {
    console.error('Error pruning old backups:', e.message);
  }
};

const saveSnapshot = async (label = '') => {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const dump = await generateBackupData();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${label ? label + '-' : ''}${dateStr}.json`;
  const filePath = path.join(BACKUPS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(dump, null, 2), 'utf-8');
  pruneOldBackups(7);
  return {
    filename,
    generatedAt: dump.meta.generatedAt,
    size: fs.statSync(filePath).size,
    counts: dump.counts,
  };
};

const listSnapshots = () => {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const full = path.join(BACKUPS_DIR, f);
      const stat = fs.statSync(full);
      let preview = null;
      try {
        const content = JSON.parse(fs.readFileSync(full, 'utf-8'));
        preview = {
          meta: content.meta,
          counts: content.counts,
        };
      } catch {}
      return {
        filename: f,
        size: stat.size,
        createdAt: stat.mtime,
        preview,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return files;
};

const restoreBackupData = async (backupData, req = null) => {
  if (!backupData || typeof backupData !== 'object') {
    throw fail(400, 'Invalid backup format: root must be an object');
  }

  const payload = backupData.data || backupData;
  if (!payload || typeof payload !== 'object') {
    throw fail(400, 'Invalid backup format: missing collections data');
  }

  // Safety check: verify at least one core collection is present
  const hasCore = ['users', 'products', 'sales'].some(k => Array.isArray(payload[k]));
  if (!hasCore) {
    throw fail(400, 'Invalid backup file: does not contain valid store collections (users, products, or sales)');
  }

  // Automatically take a safety snapshot of current database before wiping
  try {
    await saveSnapshot('pre-restore-safety');
  } catch (err) {
    console.warn('Could not save safety snapshot before restore:', err.message);
  }

  const restoredCounts = {};

  for (const [key, Model] of Object.entries(BACKUP_MODELS)) {
    const list = payload[key];
    if (Array.isArray(list)) {
      await Model.deleteMany({});
      if (list.length > 0) {
        await Model.insertMany(list, { ordered: false });
      }
      restoredCounts[key] = list.length;
    }
  }

  // Ensure default branch exists if none restored
  if ((await Branch.countDocuments()) === 0) {
    await Branch.create({
      name: 'Main Store',
      code: 'MAIN-01',
      isDefault: true,
      active: true,
    });
  }

  // Ensure at least one admin account exists so the store is never locked out
  if ((await User.countDocuments({ role: 'admin' })) === 0) {
    await User.create({
      name: 'System Admin',
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      trainingLevel: 4,
      permissions: ROLE_PERMISSIONS.admin,
      active: true,
    });
  }

  if (req) {
    await logAudit(
      req,
      'SYSTEM_RESTORE',
      'system',
      `Restored entire store database from backup. Restored collections: ${Object.keys(restoredCounts).join(', ')}`,
      'RESTORE',
      { counts: restoredCounts }
    );
  }

  return restoredCounts;
};

// Backup Export Endpoint (Direct File Download)
app.get('/api/backup/export', auth(['admin']), wrap(async (req, res) => {
  const dump = await generateBackupData();
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `nexapos-backup-${dateStr}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  await logAudit(req, 'BACKUP_EXPORTED', 'system', `Admin downloaded full database backup`, filename);
  res.send(JSON.stringify(dump, null, 2));
}));

// Backup Restore Endpoint (Upload JSON payload)
app.post('/api/backup/restore', auth(['admin']), wrap(async (req, res) => {
  const backup = req.body?.backup || req.body;
  const restoredCounts = await restoreBackupData(backup, req);
  res.json({ ok: true, restoredCounts });
}));

// List Local Server Snapshots
app.get('/api/backup/snapshots', auth(['admin']), wrap(async (_, res) => {
  res.json(listSnapshots());
}));

// Create Manual Server Snapshot
app.post('/api/backup/snapshot', auth(['admin']), wrap(async (req, res) => {
  const info = await saveSnapshot('manual');
  await logAudit(req, 'BACKUP_SNAPSHOT_CREATED', 'system', `Created manual backup snapshot: ${info.filename}`, info.filename);
  res.json(info);
}));

// Restore from Local Server Snapshot
app.post('/api/backup/restore-snapshot/:filename', auth(['admin']), wrap(async (req, res) => {
  const cleanName = path.basename(req.params.filename);
  const filePath = path.join(BACKUPS_DIR, cleanName);
  if (!fs.existsSync(filePath)) throw fail(404, 'Snapshot file not found');
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const restoredCounts = await restoreBackupData(content, req);
  res.json({ ok: true, restoredCounts, filename: cleanName });
}));

// Download Local Server Snapshot
app.get('/api/backup/download-snapshot/:filename', auth(['admin']), wrap(async (req, res) => {
  const cleanName = path.basename(req.params.filename);
  const filePath = path.join(BACKUPS_DIR, cleanName);
  if (!fs.existsSync(filePath)) throw fail(404, 'Snapshot file not found');
  res.setHeader('Content-Disposition', `attachment; filename="${cleanName}"`);
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(filePath);
}));

// Delete Local Server Snapshot
app.delete('/api/backup/snapshot/:filename', auth(['admin']), wrap(async (req, res) => {
  const cleanName = path.basename(req.params.filename);
  const filePath = path.join(BACKUPS_DIR, cleanName);
  if (!fs.existsSync(filePath)) throw fail(404, 'Snapshot file not found');
  fs.unlinkSync(filePath);
  await logAudit(req, 'BACKUP_SNAPSHOT_DELETED', 'system', `Deleted backup snapshot: ${cleanName}`, cleanName);
  res.json({ ok: true });
}));

await mongoose.connect(MONGO_URI);

// Seed default branches if none exist
if ((await Branch.countDocuments()) === 0) {
  await Branch.create([
    {
      name: 'Flagship Store (Main)',
      code: 'MAIN-01',
      address: '100 Downtown Commercial Blvd, Suite 10',
      phone: '+1 (555) 019-2834',
      email: 'flagship@verdantpos.com',
      isDefault: true,
      active: true
    },
    {
      name: 'Westside Mall Express',
      code: 'WEST-02',
      address: '420 Westside Promenade, Unit 3B',
      phone: '+1 (555) 019-7712',
      email: 'westside@verdantpos.com',
      isDefault: false,
      active: true
    }
  ]);
  console.log('Seeded default branches: MAIN-01, WEST-02');
}

app.listen(PORT, () => console.log(`POS (${BUSINESS_TYPE}) on :${PORT}`));

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// Optional automatic daily backup: keeps the last 7 snapshots
const checkAndRunDailyBackup = async () => {
  try {
    const snapshots = listSnapshots();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const lastBackupTime = snapshots[0]?.createdAt ? new Date(snapshots[0].createdAt).getTime() : 0;
    if (now - lastBackupTime >= oneDayMs) {
      console.log('Creating automatic daily database backup snapshot...');
      const snapshot = await saveSnapshot('daily-auto');
      console.log(`Automatic daily backup created: ${snapshot.filename}`);
    }
  } catch (err) {
    console.error('Auto daily backup error:', err.message);
  }
};

checkAndRunDailyBackup();
setInterval(checkAndRunDailyBackup, 4 * 60 * 60 * 1000);

