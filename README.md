# Universal POS (Retail / Restaurant / Pharmacy)
One codebase. Set `BUSINESS_TYPE` in `server/.env` per customer.

# NexaPOS

A configurable point-of-sale system for **retail shops, restaurants and pharmacies**.
One codebase serves all three: set `BUSINESS_TYPE` per customer and the screens and rules adapt.

## Features
- **Sales:** barcode search, cart, discounts, tax, cash, card and credit payments, printable receipts and invoices
- **Returns and refunds** with automatic restocking and approval levels
- **Inventory:** stock history, adjustments, suppliers, purchase orders, partial receiving
- **Customers:** purchase history, credit balances, loyalty points, printable statements
- **Staff and security:** role-based permissions (cashier, senior cashier, shift supervisor, stock clerk, admin) and audit logs
- **Shifts and cash drawer** reconciliation
- **Multi-branch** support
- **Offline mode (PWA)** with sync when the connection returns
- **Reports and dashboard:** sales, profit, inventory, payments, employees, customers, with CSV export
- **Backup and restore**
- **Business-specific rules:** table and kitchen notes for restaurants, batch and expiry tracking and prescription-only items for pharmacies

## Tech stack
React, Node.js, Express, MongoDB, JWT authentication

## Getting started
(setup steps here)
## Run
1. MongoDB running locally (or Atlas URI in .env)
2. `cd server && cp .env.example .env && npm i && npm start`
3. `cd client && npm i && npm run dev` -> http://localhost:5173
4. First registered user becomes admin.

## Business types
- retail: barcode search, stock
- restaurant: order type (dine-in/takeaway), table number, order notes
- pharmacy: batch no, expiry date (expired blocked), prescription-required items
