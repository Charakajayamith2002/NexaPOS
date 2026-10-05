# Universal POS (Retail / Restaurant / Pharmacy)
One codebase. Set `BUSINESS_TYPE` in `server/.env` per customer.

## Run
1. MongoDB running locally (or Atlas URI in .env)
2. `cd server && cp .env.example .env && npm i && npm start`
3. `cd client && npm i && npm run dev` -> http://localhost:5173
4. First registered user becomes admin.

## Business types
- retail: barcode search, stock
- restaurant: order type (dine-in/takeaway), table number, order notes
- pharmacy: batch no, expiry date (expired blocked), prescription-required items
