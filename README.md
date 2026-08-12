# KristallBall — Military Asset Management System

Enterprise-grade system for tracking military assets (vehicles, weapons, ammunition) across multiple bases with full RBAC, audit trails, and atomic transactions.

---

## Quick Start

### 1. Database Setup

**Install PostgreSQL** (or use a cloud provider: Supabase / Neon / Render Postgres).

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE military_assets;"

# Run the schema
psql -U postgres -d military_assets -f backend/models/schema.sql
```

### 2. Backend

```bash
cd backend

# Copy and fill in your env vars
copy .env.example .env
# Edit .env — set DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET

# Install deps (already done if you followed setup)
npm install

# Seed demo data
node models/seed.js

# Start the API server
npm run dev       # dev (nodemon)
npm start         # production
```

API runs on **http://localhost:5000**

### 3. Frontend

```bash
cd frontend

# Copy env
copy .env.example .env
# VITE_API_BASE_URL is empty by default (uses Vite proxy to localhost:5000)

npm install
npm run dev
```

App runs on **http://localhost:5173**

---

## Demo Credentials

| Role             | Username           | Password           | Base           |
|------------------|--------------------|--------------------|----------------|
| Admin            | admin_user         | AdminPass123!      | All (global)   |
| Base Commander   | commander_alpha    | CommandPass123!    | Fort Alpha     |
| Logistics Officer| logistics_officer  | LogisticsPass123!  | Fort Alpha     |

---

## Architecture

```
military-asset-management/
├── backend/
│   ├── config/db.js              # PostgreSQL pool
│   ├── controllers/
│   │   ├── authController.js     # Login, register, JWT
│   │   ├── assetController.js    # Dashboard metrics, inventory summary
│   │   ├── purchaseController.js # Purchase CRUD
│   │   └── transferController.js # Transfers, assignments, expenditures
│   ├── middlewares/
│   │   ├── authMiddleware.js     # JWT verification
│   │   ├── rbacMiddleware.js     # Role + base scope enforcement
│   │   └── loggerMiddleware.js   # Audit logging utility
│   ├── models/
│   │   ├── schema.sql            # Full DB schema + seed data
│   │   └── seed.js               # User + demo data seeder
│   ├── routes/                   # Express routers
│   └── server.js                 # Express app entry point
│
└── frontend/
    └── src/
        ├── context/AuthContext.jsx   # Global auth state
        ├── services/api.js           # Axios client + API helpers
        ├── components/
        │   ├── Layout.jsx            # Shell with sidebar + navbar
        │   ├── Sidebar.jsx           # RBAC-driven navigation
        │   ├── Navbar.jsx            # Top bar
        │   ├── StatCard.jsx          # Metric card
        │   └── NetMoveModal.jsx      # Net movement breakdown popup
        └── pages/
            ├── Login.jsx             # Auth page
            ├── Dashboard.jsx         # Main metrics + chart + inventory table
            ├── Purchases.jsx         # Purchase log + form
            ├── Transfers.jsx         # Transfer management
            ├── Assignments.jsx       # Assignments + expenditures
            ├── AuditLogs.jsx         # Audit trail (Admin only)
            └── Admin.jsx             # User management (Admin only)
```

## Core Formula

```
Closing Balance = Opening Balance + Net Movement - Assigned - Expended
Net Movement    = Purchases + Transfers In - Transfers Out
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | Public | Sign in |
| GET | /api/auth/me | Any | Current user |
| POST | /api/auth/register | Admin | Create user |
| GET | /api/assets/dashboard | Any | Aggregated metrics |
| GET | /api/assets/summary | Any | Per-equipment inventory |
| GET | /api/assets/bases | Any | List bases |
| GET | /api/assets/equipment-types | Any | List equipment types |
| GET | /api/assets/audit-logs | Admin | Audit trail |
| GET/POST | /api/purchases | Any/Auth | Purchase records |
| GET/POST | /api/transfers | Auth | Transfer operations |
| GET/POST | /api/assignments | Auth | Asset assignments |
| GET/POST | /api/expenditures | Auth | Asset expenditures |
