# KristallBall
## Military Asset Management System
### Technical Documentation Report

---

**Document Version:** 1.0.0  
**System Name:** KristallBall — Military Asset Management System  
**Classification:** Internal / Development Reference  
**Date:** 2025  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
   - 1.1 Description
   - 1.2 Assumptions
   - 1.3 Limitations
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
   - 2.1 Backend
   - 2.2 Frontend
   - 2.3 Database
   - 2.4 Architecture Diagram
3. [Data Models / Schema](#3-data-models--schema)
   - 3.1 Table Definitions
   - 3.2 Entity Relationships
   - 3.3 Indexes
4. [RBAC Explanation](#4-rbac-explanation)
   - 4.1 Roles & Access Levels
   - 4.2 Middleware Enforcement
   - 4.3 Role Permission Matrix
5. [API Logging](#5-api-logging)
   - 5.1 Audit Log Utility
   - 5.2 Request Logger
   - 5.3 Logged Events
6. [Setup Instructions](#6-setup-instructions)
   - 6.1 Prerequisites
   - 6.2 Database Setup
   - 6.3 Backend Setup
   - 6.4 Frontend Setup
   - 6.5 Environment Variables Reference
7. [API Endpoints](#7-api-endpoints)
   - 7.1 Auth Routes
   - 7.2 Asset / Dashboard Routes
   - 7.3 Purchase Routes
   - 7.4 Transfer Routes
   - 7.5 Assignment Routes
   - 7.6 Expenditure Routes
8. [Login Credentials](#8-login-credentials)
   - 8.1 Seeded Users
   - 8.2 Seeded Reference Data

---

## 1. Project Overview

### 1.1 Description

KristallBall is a full-stack Military Asset Management System designed to provide structured, role-controlled visibility and control over military equipment across multiple operational bases. The system tracks the complete lifecycle of assets — from initial procurement through inter-base transfers, personnel assignments, and eventual expenditure — while maintaining a tamper-evident audit trail of every operation.

**Core capabilities include:**

- **Dashboard Metrics** — real-time aggregated view of opening balance, net movement, assigned quantities, expended quantities, and closing balance, filterable by base, equipment type, and date range.
- **Purchases** — record incoming stock acquisitions at any base, with supplier metadata and unit cost.
- **Transfers** — move assets between bases using atomic database transactions, with pre-transfer stock validation to prevent over-transfers.
- **Assignments** — assign equipment to specific personnel or units within a base.
- **Expenditures** — record consumed or destroyed assets with a mandatory reason field.
- **Audit Trail** — every mutation (purchase, transfer, assignment, expenditure, login, user creation) writes an immutable log entry.
- **User Management** — admins can create and list users via the API.
- **Role-Based Access Control** — three distinct roles with server-side scope enforcement ensure users cannot access or modify data outside their authorization level.

The system is built for operational security and auditability. All state-changing operations produce audit log entries; the transfer flow uses a database transaction so the transfer record and its audit log entry either both commit or both roll back together.

### 1.2 Assumptions

The following assumptions were made during system design and remain in effect for version 1.0:

| # | Assumption |
|---|-----------|
| 1 | Asset quantities are always non-negative integers. The database enforces `CHECK (quantity > 0)` on all transaction tables. |
| 2 | Transfers are marked `COMPLETED` immediately upon creation. No multi-step approval workflow is implemented in v1. |
| 3 | Opening balance is calculated dynamically by summing all records with a `created_at` timestamp earlier than the selected `startDate` filter. There is no stored snapshot. |
| 4 | The `unit_cost` field on purchases is optional metadata only. It does not affect inventory balance calculations. |
| 5 | A single `LOGISTICS_OFFICER` may be assigned to a base but their `base_id` FK is informational — scope is not enforced for this role (they can view all bases). |
| 6 | Passwords are hashed with bcrypt at 12 rounds before storage. Plaintext passwords are never persisted. |
| 7 | JWT tokens carry a 24-hour expiry by default (configurable via `JWT_EXPIRES_IN` environment variable). |
| 8 | The system is designed for a single-region PostgreSQL deployment. No replication or multi-region topology is assumed. |

### 1.3 Limitations

The following features are out of scope for version 1.0 and represent known limitations:

| # | Limitation | Impact |
|---|-----------|--------|
| 1 | **No real-time notifications** | Clients must poll the API for updates. No WebSocket or Server-Sent Events infrastructure is present. |
| 2 | **No transfer approval workflow** | Transfers are immediately set to `COMPLETED` status. The `PENDING` and `IN_TRANSIT` status values exist in the schema for future use but are never set by the current API. |
| 3 | **No password reset flow** | Users cannot self-service reset their passwords. An admin must update the hash directly in the database or through a future admin endpoint. |
| 4 | **No file uploads** | Equipment records do not support image attachments or document uploads. |
| 5 | **No pagination cursor support** | List endpoints use limit/offset pagination, which can produce inconsistent results under rapid inserts. Cursor-based pagination is not implemented. |
| 6 | **Production deployment not configured** | The application runs on localhost by default. Deploying to a hosted environment requires additional reverse-proxy, TLS, and environment configuration not included in this release. |
| 7 | **No soft deletes** | The `DELETE /api/purchases/:id` endpoint performs a hard delete. Cascading `ON DELETE CASCADE` constraints propagate this to child records. |
| 8 | **LOGISTICS_OFFICER cannot create assignments or expenditures** | This role is scoped to purchases and transfers only. |

---

## 2. Tech Stack & Architecture

### 2.1 Backend

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Runtime | Node.js | v18+ | Non-blocking I/O is well-suited for a data-driven API with concurrent database queries. LTS stability ensures long-term support. |
| Framework | Express.js (ES Modules) | ^5.2.1 | Minimal, flexible HTTP framework. The `type: "module"` configuration in `package.json` enables native ESM `import/export` syntax throughout. |
| Authentication | jsonwebtoken | ^9.0.3 | Stateless JWT Bearer tokens eliminate server-side session storage. The token payload carries `id`, `username`, `role`, and `baseId` — everything middleware needs to enforce RBAC without additional DB lookups on every request. |
| Password Hashing | bcryptjs | ^3.0.3 | bcrypt's adaptive work factor (12 rounds) makes brute-force attacks computationally expensive. `bcryptjs` is a pure-JS implementation with no native build step required. |
| Database Client | pg (node-postgres) | ^8.23.0 | The de-facto standard PostgreSQL client for Node.js. Supports connection pooling and direct client checkout for transaction management (used in the transfer flow). |
| Security Headers | helmet | ^8.3.0 | Sets security-focused HTTP response headers (CSP, X-Content-Type-Options, etc.) with a single middleware call. |
| CORS | cors | ^2.8.6 | Restricts cross-origin requests to the configured `CLIENT_URL` (default: `http://localhost:5173`). |
| Environment Config | dotenv | ^17.4.2 | Loads `.env` variables at startup, keeping secrets out of source code. |
| Dev Server | nodemon | ^3.1.14 | Automatically restarts the server on file changes during development. |

**Backend entry point:** `backend/server.js`  
**Default port:** `5000`

### 2.2 Frontend

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Framework | React | ^19.2.8 | Component-based UI with a mature ecosystem. Hooks-based state management keeps components concise. |
| Build Tool | Vite | ^8.2.0 | Sub-second hot module replacement during development. Significantly faster than Webpack for React projects. |
| Styling | Tailwind CSS | ^4.3.3 | Utility-first CSS eliminates context-switching between component files and stylesheets. Integrated via `@tailwindcss/vite` plugin. |
| Icons | Lucide React | ^1.31.0 | Consistent, tree-shakeable SVG icon library with a React-native API. |
| Charts | Recharts | ^3.10.1 | Composable charting library built on React and D3. Used for dashboard bar/area charts. |
| HTTP Client | Axios | ^1.19.0 | Interceptor support enables a single place to attach the `Authorization: Bearer <token>` header to all outgoing requests. |
| Routing | React Router DOM | ^7.18.2 | Client-side routing with nested route support and `useNavigate`/`useLocation` hooks. |

**Frontend entry point:** `frontend/src/main.jsx`  
**Dev server port:** `5173`

### 2.3 Database

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| RDBMS | PostgreSQL 18 | ACID-compliant transactions are essential for the transfer flow, which must atomically insert the transfer record and its audit log. PostgreSQL's `CHECK` constraints enforce data integrity at the database level (quantity > 0, valid role/category/status enums). Foreign key constraints with `ON DELETE CASCADE` and `ON DELETE SET NULL` maintain referential integrity automatically. |

### 2.4 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                   │
│                                                     │
│  React (Vite) + Tailwind CSS + Recharts             │
│  React Router DOM  │  Axios (JWT interceptor)       │
│                                                     │
│  Pages: Login, Dashboard, Purchases, Transfers,     │
│         Assignments, Audit Logs, Admin              │
└─────────────────────────┬───────────────────────────┘
                          │  HTTP/HTTPS  (port 5173 → 5000)
                          │  Authorization: Bearer <JWT>
                          ▼
┌─────────────────────────────────────────────────────┐
│                  EXPRESS.JS API SERVER               │
│                       (port 5000)                   │
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │            Global Middleware               │     │
│  │  helmet · cors · express.json · requestLogger │  │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  ┌─────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │  authRoutes │  │ assetRoutes│  │purchaseRoutes│  │
│  │  /api/auth  │  │ /api/assets│  │/api/purchases│  │
│  └─────────────┘  └────────────┘  └─────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │             transferRoutes                   │   │
│  │  /api/transfers · /api/assignments           │   │
│  │  /api/expenditures                           │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │              RBAC Middleware Layer            │   │
│  │  authenticateToken → authorizeRoles →        │   │
│  │  enforceBaseScope                            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────┘
                          │  node-postgres (pg)
                          │  Connection Pool
                          ▼
┌─────────────────────────────────────────────────────┐
│                   POSTGRESQL 18                     │
│                                                     │
│  bases · equipment_types · users · purchases        │
│  transfers · assignments · expenditures · audit_logs│
└─────────────────────────────────────────────────────┘
```

---

## 3. Data Models / Schema

The database contains 8 tables. Tables are defined in `backend/models/schema.sql` and are designed to be idempotent — running the file drops all tables (in reverse dependency order) and recreates them fresh.

### 3.1 Table Definitions

#### `bases`
Represents an operational military installation.

```sql
CREATE TABLE bases (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  location   VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing identifier |
| `name` | VARCHAR(100) | Unique base name (e.g., "Fort Alpha") |
| `location` | VARCHAR(150) | Geographic descriptor (e.g., "Northern Region") |
| `created_at` | TIMESTAMP | Record creation timestamp |

---

#### `equipment_types`
Defines the catalogue of trackable asset types.

```sql
CREATE TABLE equipment_types (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  category   VARCHAR(50)  NOT NULL CHECK (category IN ('WEAPON', 'VEHICLE', 'AMMUNITION')),
  unit       VARCHAR(30)  NOT NULL DEFAULT 'unit',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing identifier |
| `name` | VARCHAR(100) | Unique equipment name (e.g., "M4 Carbine") |
| `category` | VARCHAR(50) | Constrained to `WEAPON`, `VEHICLE`, or `AMMUNITION` |
| `unit` | VARCHAR(30) | Display unit label (e.g., "unit", "rounds") |
| `created_at` | TIMESTAMP | Record creation timestamp |

---

#### `users`
System users with role-based access. The `base_id` FK is required for `BASE_COMMANDER` and `LOGISTICS_OFFICER` roles; `ADMIN` users have `NULL`.

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30)  NOT NULL CHECK (role IN ('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER')),
  base_id       INT REFERENCES bases(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing identifier |
| `username` | VARCHAR(50) | Unique login handle |
| `password_hash` | VARCHAR(255) | bcrypt hash (12 rounds) |
| `role` | VARCHAR(30) | Constrained to `ADMIN`, `BASE_COMMANDER`, `LOGISTICS_OFFICER` |
| `base_id` | INT FK | References `bases(id)`. Set NULL if base is deleted. `NULL` for ADMIN. |
| `created_at` | TIMESTAMP | Record creation timestamp |

---

#### `purchases`
Records incoming stock acquisitions at a specific base.

```sql
CREATE TABLE purchases (
  id                SERIAL PRIMARY KEY,
  base_id           INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  equipment_type_id INT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
  quantity          INT NOT NULL CHECK (quantity > 0),
  unit_cost         NUMERIC(12, 2) DEFAULT 0,
  supplier          VARCHAR(150),
  notes             TEXT,
  created_by        INT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing identifier |
| `base_id` | INT FK NOT NULL | The base receiving the stock |
| `equipment_type_id` | INT FK NOT NULL | The type of equipment purchased |
| `quantity` | INT | Must be > 0 (DB constraint) |
| `unit_cost` | NUMERIC(12,2) | Optional cost metadata; does not affect balances |
| `supplier` | VARCHAR(150) | Optional supplier name |
| `notes` | TEXT | Optional free-text notes |
| `created_by` | INT FK | User who created the record; set NULL if user is deleted |
| `created_at` | TIMESTAMP | Record creation timestamp |

---

#### `transfers`
Records asset movements between bases. Each transfer is atomic (created inside a DB transaction alongside its audit log entry).

```sql
CREATE TABLE transfers (
  id                    SERIAL PRIMARY KEY,
  source_base_id        INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  destination_base_id   INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  equipment_type_id     INT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
  quantity              INT NOT NULL CHECK (quantity > 0),
  status                VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'
                          CHECK (status IN ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
  notes                 TEXT,
  initiated_by          INT REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing identifier |
| `source_base_id` | INT FK NOT NULL | Origin base |
| `destination_base_id` | INT FK NOT NULL | Receiving base |
| `equipment_type_id` | INT FK NOT NULL | Equipment being moved |
| `quantity` | INT | Must be > 0. Validated against available stock before insert. |
| `status` | VARCHAR(20) | Default `COMPLETED` in v1. Schema supports `PENDING`, `IN_TRANSIT`, `CANCELLED`. |
| `notes` | TEXT | Optional transfer notes |
| `initiated_by` | INT FK | Requesting user; set NULL if user is deleted |
| `created_at` | TIMESTAMP | Record creation timestamp |

---

#### `assignments`
Records allocation of equipment to specific personnel or units at a base.

```sql
CREATE TABLE assignments (
  id                SERIAL PRIMARY KEY,
  base_id           INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  equipment_type_id INT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
  quantity          INT NOT NULL CHECK (quantity > 0),
  assigned_to       VARCHAR(150) NOT NULL,
  notes             TEXT,
  created_by        INT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing identifier |
| `base_id` | INT FK NOT NULL | Base where assignment is recorded |
| `equipment_type_id` | INT FK NOT NULL | Equipment type assigned |
| `quantity` | INT | Must be > 0 |
| `assigned_to` | VARCHAR(150) | Personnel name or unit designation (required) |
| `notes` | TEXT | Optional notes |
| `created_by` | INT FK | Assigning user |
| `created_at` | TIMESTAMP | Record creation timestamp |

---

#### `expenditures`
Records consumed, destroyed, or otherwise expended assets.

```sql
CREATE TABLE expenditures (
  id                SERIAL PRIMARY KEY,
  base_id           INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  equipment_type_id INT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
  quantity          INT NOT NULL CHECK (quantity > 0),
  reason            VARCHAR(255),
  notes             TEXT,
  created_by        INT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing identifier |
| `base_id` | INT FK NOT NULL | Base where expenditure occurred |
| `equipment_type_id` | INT FK NOT NULL | Equipment type expended |
| `quantity` | INT | Must be > 0 |
| `reason` | VARCHAR(255) | Optional reason (e.g., "Live-fire training exercise") |
| `notes` | TEXT | Optional additional notes |
| `created_by` | INT FK | Recording user |
| `created_at` | TIMESTAMP | Record creation timestamp |

---

#### `audit_logs`
Immutable event log. Written on every mutation and on login events.

```sql
CREATE TABLE audit_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL
               CHECK (action IN ('PURCHASE', 'TRANSFER', 'ASSIGNMENT',
                                 'EXPENDITURE', 'LOGIN', 'USER_CREATED')),
  entity_id  INT,
  details    TEXT NOT NULL,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-incrementing identifier |
| `user_id` | INT FK | The acting user; set NULL if user is deleted |
| `action` | VARCHAR(50) | Event type (constrained enum) |
| `entity_id` | INT | ID of the affected record (nullable for LOGIN events) |
| `details` | TEXT | Human-readable event description (required) |
| `ip_address` | VARCHAR(50) | Client IP address at time of request |
| `created_at` | TIMESTAMP | Event timestamp |

---

### 3.2 Entity Relationships

```
bases ──────────────────────────────────────┐
  │                                         │
  ├── users (base_id FK, ON DELETE SET NULL)│
  │                                         │
  ├── purchases (base_id FK, ON DELETE CASCADE)
  │     └── equipment_types (equipment_type_id FK)
  │     └── users (created_by FK)
  │
  ├── transfers (source_base_id / destination_base_id FK)
  │     └── equipment_types (equipment_type_id FK)
  │     └── users (initiated_by FK)
  │
  ├── assignments (base_id FK, ON DELETE CASCADE)
  │     └── equipment_types (equipment_type_id FK)
  │     └── users (created_by FK)
  │
  ├── expenditures (base_id FK, ON DELETE CASCADE)
  │     └── equipment_types (equipment_type_id FK)
  │     └── users (created_by FK)
  │
audit_logs
  └── users (user_id FK, ON DELETE SET NULL)
```

**Key relationship notes:**
- Deleting a `base` cascades to all its purchases, assignments, and expenditures.
- Deleting a `user` sets `created_by`/`initiated_by`/`user_id` to NULL (records are preserved; attribution is removed).
- `transfers` references `bases` twice (source and destination) — both with `ON DELETE CASCADE`.

### 3.3 Core Balance Formula

The dashboard uses these formulas, computed dynamically via SQL CTEs:

```
Net Movement     = Purchases + Transfers In - Transfers Out

Opening Balance  = (all Purchases before startDate)
                 + (all Transfers In before startDate, status=COMPLETED)
                 - (all Transfers Out before startDate, status=COMPLETED)
                 - (all Assignments before startDate)
                 - (all Expenditures before startDate)

Closing Balance  = Opening Balance + Net Movement - Assigned - Expended
```

When no `startDate` filter is applied, `opening_balance` returns `0` and `closing_balance` = `Net Movement - Assigned - Expended` across all time.

### 3.4 Indexes

Performance indexes defined in `schema.sql`:

```sql
CREATE INDEX idx_purchases_base       ON purchases(base_id);
CREATE INDEX idx_purchases_equipment  ON purchases(equipment_type_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);

CREATE INDEX idx_transfers_source        ON transfers(source_base_id);
CREATE INDEX idx_transfers_destination   ON transfers(destination_base_id);
CREATE INDEX idx_transfers_equipment     ON transfers(equipment_type_id);
CREATE INDEX idx_transfers_created_at    ON transfers(created_at);

CREATE INDEX idx_assignments_base    ON assignments(base_id);
CREATE INDEX idx_expenditures_base   ON expenditures(base_id);
CREATE INDEX idx_audit_logs_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

## 4. RBAC Explanation

### 4.1 Roles & Access Levels

The system defines three roles, each progressively more restrictive.

#### ADMIN
- **Scope:** Global — all bases, all data.
- **Permissions:** Full unrestricted access to every endpoint. Can create and list users, view all audit logs, perform any purchase/transfer/assignment/expenditure, and delete purchase records.
- **Base binding:** None. `base_id` is `NULL` in the database.

#### BASE_COMMANDER
- **Scope:** Single assigned base only, enforced server-side.
- **Permissions:** Can create and read purchases, transfers, assignments, and expenditures — but only for their own base. Cannot access audit logs. Cannot delete records. Cannot manage users.
- **Base binding:** `base_id` in `users` table. The `enforceBaseScope` middleware overwrites the `baseId` query parameter on every request to match `req.user.baseId`, making client-side bypass impossible.

#### LOGISTICS_OFFICER
- **Scope:** All bases (no scope restriction applied), but operation type is restricted.
- **Permissions:** Can create and read purchases and transfers only. Cannot create assignments or expenditures. Cannot access audit logs. Cannot manage users.
- **Base binding:** Has a `base_id` in the database for organizational reference, but `enforceBaseScope` does not restrict this role.

### 4.2 Middleware Enforcement

RBAC is enforced through three middleware functions defined in `backend/middlewares/`:

#### `authenticateToken` (`authMiddleware.js`)
Applied to every protected route. Reads the `Authorization` header, extracts the Bearer token, and verifies it against `process.env.JWT_SECRET` using `jsonwebtoken`.

```javascript
// Attaches decoded payload to req.user on success
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded; // { id, username, role, baseId, baseName }
```

Returns `401` if no token is present or the token has expired. Returns `403` for a structurally invalid token.

#### `authorizeRoles(...allowedRoles)` (`rbacMiddleware.js`)
A factory middleware that accepts a list of permitted roles and returns a middleware function that checks `req.user.role` against that list.

```javascript
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access Denied: Insufficient authorization level.',
      });
    }
    next();
  };
};
```

Usage example: `router.post('/register', authenticateToken, authorizeRoles('ADMIN'), register)`

#### `enforceBaseScope` (`rbacMiddleware.js`)
Applied to all list/read endpoints for purchases, transfers, assignments, expenditures, dashboard, and inventory summary. If the requesting user is a `BASE_COMMANDER`, this middleware **overwrites** `req.query.baseId` with the user's own `baseId` from the JWT payload — regardless of what the client submitted.

```javascript
export const enforceBaseScope = (req, res, next) => {
  if (req.user && req.user.role === 'BASE_COMMANDER') {
    req.query.baseId = String(req.user.baseId); // cannot be bypassed
  }
  next();
};
```

This is a critical security control. Even if a `BASE_COMMANDER` manually crafts a request with a different `baseId` query parameter, the server silently corrects it before the controller executes.

### 4.3 Role Permission Matrix

| Endpoint / Operation | ADMIN | BASE_COMMANDER | LOGISTICS_OFFICER |
|---------------------|:-----:|:--------------:|:-----------------:|
| `POST /api/auth/login` | ✅ | ✅ | ✅ |
| `GET /api/auth/me` | ✅ | ✅ | ✅ |
| `POST /api/auth/register` | ✅ | ❌ | ❌ |
| `GET /api/auth/users` | ✅ | ❌ | ❌ |
| `GET /api/assets/dashboard` | ✅ (all bases) | ✅ (own base) | ✅ (all bases) |
| `GET /api/assets/summary` | ✅ (all bases) | ✅ (own base) | ✅ (all bases) |
| `GET /api/assets/bases` | ✅ | ✅ | ✅ |
| `GET /api/assets/equipment-types` | ✅ | ✅ | ✅ |
| `GET /api/assets/audit-logs` | ✅ | ❌ | ❌ |
| `GET /api/purchases` | ✅ (all) | ✅ (own base) | ✅ (all) |
| `POST /api/purchases` | ✅ | ✅ (own base) | ✅ |
| `DELETE /api/purchases/:id` | ✅ | ❌ | ❌ |
| `GET /api/transfers` | ✅ (all) | ✅ (own base) | ✅ (all) |
| `POST /api/transfers` | ✅ | ✅ (from own base) | ✅ |
| `GET /api/assignments` | ✅ (all) | ✅ (own base) | ❌ |
| `POST /api/assignments` | ✅ | ✅ (own base) | ❌ |
| `GET /api/expenditures` | ✅ (all) | ✅ (own base) | ❌ |
| `POST /api/expenditures` | ✅ | ✅ (own base) | ❌ |

> **Note on LOGISTICS_OFFICER and GET assignments/expenditures:** The route definitions apply `authenticateToken` globally but not `authorizeRoles` on the GET routes. The role restriction for LOGISTICS_OFFICER on assignments/expenditures is enforced at the GET route level by the `enforceBaseScope` middleware not being the limiting factor — review the route file if stricter read-access is required for future versions.

---

## 5. API Logging

### 5.1 Audit Log Utility

The `auditLog` function in `backend/middlewares/loggerMiddleware.js` is the single, centralized mechanism for writing mutation events to the `audit_logs` table.

```javascript
export const auditLog = async ({ userId, action, entityId = null, details, ipAddress = null }) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, action, entityId || null, details, ipAddress || null]
    );
  } catch (err) {
    // Non-blocking — audit failures do not fail the primary request
    console.error('Audit log write failed:', err.message);
  }
};
```

**Design decisions:**
- **Non-blocking for most operations:** The `auditLog` call in purchase, assignment, and expenditure controllers is `await`-ed but its failure is caught and logged to `console.error` — the primary API response is not affected. This prioritizes availability over strict audit completeness.
- **Transactional for transfers:** The transfer controller checks out a dedicated DB `client`, begins a transaction, inserts the transfer record, and then writes the audit log entry using the same client — directly via `client.query(INSERT INTO audit_logs ...)` rather than calling `auditLog()`. This means if either the transfer insert or the audit log insert fails, the entire transaction rolls back. Both records commit atomically or not at all.

```javascript
// Inside transferController.js — audit log is inside the transaction
await client.query(
  `INSERT INTO audit_logs (user_id, action, entity_id, details, ip_address)
   VALUES ($1, 'TRANSFER', $2, $3, $4)`,
  [req.user.id, transfer.id, `Transferred ${quantity} units ...`, req.ip]
);
await client.query('COMMIT');
```

### 5.2 Request Logger

A lightweight HTTP request logger middleware (`requestLogger`) is applied globally in `server.js`:

```javascript
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
};
```

This logs every request to `stdout` in the format:
```
[2025-01-15T10:30:00.000Z] POST /api/auth/login → 200 (45ms)
```

This is a development-time logger. For production, replace with a structured logging library (e.g., `pino`, `winston`).

### 5.3 Logged Events

Every audit log entry captures the following fields:

| Field | Source | Description |
|-------|--------|-------------|
| `user_id` | `req.user.id` from JWT | The authenticated user performing the action |
| `action` | Controller constant | One of: `PURCHASE`, `TRANSFER`, `ASSIGNMENT`, `EXPENDITURE`, `LOGIN`, `USER_CREATED` |
| `entity_id` | Returned DB record `.id` | The primary key of the created/affected record |
| `details` | Controller-generated string | Human-readable description of the event |
| `ip_address` | `req.ip` | Client IP address (may be a reverse-proxy IP in production) |
| `created_at` | PostgreSQL `DEFAULT CURRENT_TIMESTAMP` | Server-side timestamp — cannot be forged by clients |

**Example log entries:**

```
action=LOGIN      details="User "admin_user" logged in successfully."
action=PURCHASE   details="Purchase: 50 units of equipment_type #1 at Base #1 from "GovSupply Corp"."
action=TRANSFER   details="Transferred 10 units (EquipType #1) from Base #1 → Base #2."
action=ASSIGNMENT details="Assigned 20 units of equip_type #1 at Base #1 to "1st Infantry Platoon"."
action=EXPENDITURE details="Expended 500 units of equip_type #6 at Base #1. Reason: Live-fire training exercise."
action=USER_CREATED details="Admin "admin_user" created user "new_user" with role "BASE_COMMANDER"."
```

---

## 6. Setup Instructions

### 6.1 Prerequisites

Ensure the following are installed and available on your `PATH` before proceeding:

| Tool | Minimum Version | Check Command |
|------|----------------|---------------|
| Node.js | v18.0.0 | `node --version` |
| npm | v8.0.0 | `npm --version` |
| PostgreSQL | 18 | `psql --version` |

### 6.2 Database Setup

**Step 1 — Create the database:**

```bash
psql -U postgres -c "CREATE DATABASE military_assets;"
```

**Step 2 — Apply the schema:**

This drops and recreates all 8 tables, applies indexes, and inserts the static reference data (bases and equipment types).

```bash
psql -U postgres -d military_assets -f backend/models/schema.sql
```

Expected output includes confirmation of table creation and the seed inserts for bases and equipment types.

### 6.3 Backend Setup

**Step 3 — Navigate to the backend directory:**

```bash
cd backend
```

**Step 4 — Create the environment file:**

```bash
cp .env.example .env
```

Open `.env` and fill in the required values (see Section 6.5 for the full reference).

**Step 5 — Install dependencies:**

```bash
npm install
```

**Step 6 — Seed the database with demo users and transaction data:**

```bash
node models/seed.js
```

The seed script will:
- Hash the demo passwords with bcrypt (12 rounds)
- Insert the three user accounts (admin, commander, logistics officer)
- Insert sample purchases across all three bases
- Insert a sample transfer, assignment, and expenditure
- Insert an initial audit log entry

Expected output:
```
🌱 Starting database seed...
📍 Bases found: Fort Alpha, Fort Bravo, Fort Charlie
👤 Users seeded
🔫 Equipment types found: M4 Carbine, M9 Pistol, ...
📦 Purchases seeded
🔄 Transfers seeded
📋 Assignments seeded
💥 Expenditures seeded
📝 Audit logs seeded

✅ Database seeded successfully!
```

**Step 7 — Start the backend server:**

```bash
npm run dev
```

The server starts on `http://localhost:5000`. You should see:
```
🚀 Military Asset Management API
   Running on: http://localhost:5000
   Environment: development
```

Verify the server is healthy:
```bash
curl http://localhost:5000/health
# {"status":"ok","timestamp":"..."}
```

### 6.4 Frontend Setup

**Step 8 — Open a new terminal and navigate to the frontend directory:**

```bash
cd frontend
```

**Step 9 — Install dependencies:**

```bash
npm install
```

**Step 10 — Start the frontend dev server:**

```bash
npm run dev
```

The Vite dev server starts on `http://localhost:5173`.

**Step 11 — Open the application:**

Navigate to `http://localhost:5173` in your browser. You will be presented with the login page.

### 6.5 Environment Variables Reference

#### `backend/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | No | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | No | `military_assets` | Database name |
| `DB_USER` | No | `postgres` | Database user |
| `DB_PASSWORD` | **Yes** | — | Database password (set this) |
| `JWT_SECRET` | **Yes** | — | Secret key for signing JWTs (use a long random string) |
| `JWT_EXPIRES_IN` | No | `24h` | JWT token expiry (e.g., `1h`, `7d`) |
| `PORT` | No | `5000` | API server port |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed CORS origin |
| `NODE_ENV` | No | `development` | Environment label |

**Example `.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=military_assets
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
JWT_SECRET=a_very_long_random_secret_string_at_least_32_chars
JWT_EXPIRES_IN=24h
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

#### `frontend/.env` (optional)

The frontend uses Vite's `import.meta.env` system. Create a `.env` file in the `frontend/` directory if you need to override the API base URL:

```env
VITE_API_URL=http://localhost:5000
```

---

## 7. API Endpoints

All endpoints are prefixed with the host `http://localhost:5000`.

**Authentication:** All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

**Standard error responses:**

| Status | Meaning |
|--------|---------|
| 400 | Bad Request — missing or invalid parameters |
| 401 | Unauthorized — no token, expired token |
| 403 | Forbidden — valid token but insufficient role |
| 404 | Not Found — resource or route does not exist |
| 409 | Conflict — uniqueness constraint violation |
| 500 | Internal Server Error |

---

### 7.1 Auth Routes

#### `POST /api/auth/login`
**Access:** Public  
**Description:** Authenticates a user and returns a JWT token.

**Request body:**
```json
{
  "username": "admin_user",
  "password": "AdminPass123!"
}
```

**Success response (200):**
```json
{
  "message": "Login successful",
  "token": "<jwt_token>",
  "user": {
    "id": 1,
    "username": "admin_user",
    "role": "ADMIN",
    "baseId": null,
    "baseName": null
  }
}
```

**Error responses:**
- `400` — username or password missing
- `401` — invalid credentials

**Side effect:** Writes a `LOGIN` audit log entry with the user's IP address.

---

#### `GET /api/auth/me`
**Access:** Authenticated (any role)  
**Description:** Returns the full profile of the currently authenticated user, including their base assignment.

**Success response (200):**
```json
{
  "id": 2,
  "username": "commander_alpha",
  "role": "BASE_COMMANDER",
  "base_id": 1,
  "base_name": "Fort Alpha",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

---

#### `POST /api/auth/register`
**Access:** ADMIN only  
**Description:** Creates a new user account. Requires the requestor to be authenticated with the ADMIN role.

**Request body:**
```json
{
  "username": "new_commander",
  "password": "SecurePass456!",
  "role": "BASE_COMMANDER",
  "baseId": 2
}
```

**Field validation:**
- `username`, `password`, `role` are required
- `role` must be one of `ADMIN`, `BASE_COMMANDER`, `LOGISTICS_OFFICER`
- `baseId` is optional (recommended for non-ADMIN roles)

**Success response (201):**
```json
{
  "message": "User created successfully.",
  "user": {
    "id": 4,
    "username": "new_commander",
    "role": "BASE_COMMANDER",
    "base_id": 2
  }
}
```

**Side effect:** Writes a `USER_CREATED` audit log entry.

---

#### `GET /api/auth/users`
**Access:** ADMIN only  
**Description:** Returns a list of all registered users with their base assignment details.

**Success response (200):** Array of user objects, ordered by `created_at DESC`.

```json
[
  {
    "id": 1,
    "username": "admin_user",
    "role": "ADMIN",
    "base_id": null,
    "base_name": null,
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  ...
]
```

---

### 7.2 Asset / Dashboard Routes

All routes in this section require authentication. The `enforceBaseScope` middleware is applied to `dashboard` and `summary` endpoints.

#### `GET /api/assets/dashboard`
**Access:** Authenticated (all roles)  
**Description:** Returns aggregated asset metrics. BASE_COMMMANDERs automatically see only their base's data.

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `baseId` | integer | No | Filter by base (ignored for BASE_COMMANDER — scope enforced server-side) |
| `equipmentTypeId` | integer | No | Filter by equipment type |
| `startDate` | ISO date string | No | Start of period (enables opening balance calculation) |
| `endDate` | ISO date string | No | End of period |

**Success response (200):**
```json
{
  "opening_balance": 120,
  "total_purchases": 50,
  "total_transfer_in": 10,
  "total_transfer_out": 5,
  "net_movement": 55,
  "total_assigned": 20,
  "total_expended": 500,
  "closing_balance": -465
}
```

> All values are integers. `closing_balance` can be negative if expenditures exceed available stock (the system does not block this at the read level).

---

#### `GET /api/assets/summary`
**Access:** Authenticated (all roles)  
**Description:** Returns a per-equipment-type inventory snapshot showing the current balance derived from all historical transactions.

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `baseId` | integer | No | Filter to a specific base |

**Success response (200):** Array of equipment snapshots.
```json
[
  {
    "equipment_type_id": 1,
    "equipment_name": "M4 Carbine",
    "category": "WEAPON",
    "unit": "unit",
    "purchased": 50,
    "transfers_in": 0,
    "transfers_out": 10,
    "assigned": 20,
    "expended": 0,
    "current_balance": 20
  },
  ...
]
```

---

#### `GET /api/assets/bases`
**Access:** Authenticated (all roles)  
**Description:** Returns all bases ordered by name.

**Success response (200):**
```json
[
  { "id": 1, "name": "Fort Alpha", "location": "Northern Region", "created_at": "..." },
  { "id": 2, "name": "Fort Bravo", "location": "Eastern Region",  "created_at": "..." },
  { "id": 3, "name": "Fort Charlie","location": "Southern Region","created_at": "..." }
]
```

---

#### `GET /api/assets/equipment-types`
**Access:** Authenticated (all roles)  
**Description:** Returns all equipment types ordered by category then name.

**Success response (200):**
```json
[
  { "id": 6, "name": "5.56mm Ammo",  "category": "AMMUNITION", "unit": "rounds" },
  { "id": 8, "name": "40mm Grenade", "category": "AMMUNITION", "unit": "rounds" },
  { "id": 7, "name": "9mm Ammo",     "category": "AMMUNITION", "unit": "rounds" },
  { "id": 4, "name": "Humvee",       "category": "VEHICLE",    "unit": "unit" },
  { "id": 5, "name": "MRAP",         "category": "VEHICLE",    "unit": "unit" },
  { "id": 1, "name": "M4 Carbine",   "category": "WEAPON",     "unit": "unit" },
  ...
]
```

---

#### `GET /api/assets/audit-logs`
**Access:** ADMIN only  
**Description:** Returns the audit trail in reverse chronological order. Supports pagination.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 100 | Number of records to return |
| `offset` | integer | 0 | Number of records to skip |

**Success response (200):** Array of audit log objects with joined `username`.
```json
[
  {
    "id": 10,
    "user_id": 1,
    "action": "TRANSFER",
    "entity_id": 1,
    "details": "Transferred 10 units (EquipType #1) from Base #1 → Base #2.",
    "ip_address": "::1",
    "created_at": "2025-01-15T10:30:00.000Z",
    "username": "admin_user"
  },
  ...
]
```

---

### 7.3 Purchase Routes

#### `GET /api/purchases`
**Access:** Authenticated (all roles). BASE_COMMANDER scope enforced.  
**Description:** Returns a paginated, filterable list of purchase records.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `baseId` | integer | Filter by base |
| `equipmentTypeId` | integer | Filter by equipment type |
| `startDate` | ISO date | Filter records on or after this date |
| `endDate` | ISO date | Filter records on or before this date |
| `limit` | integer | Default 50 |
| `offset` | integer | Default 0 |

**Success response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "base_id": 1,
      "equipment_type_id": 1,
      "quantity": 50,
      "unit_cost": "0.00",
      "supplier": null,
      "notes": null,
      "created_by": 1,
      "created_at": "...",
      "base_name": "Fort Alpha",
      "equipment_name": "M4 Carbine",
      "category": "WEAPON",
      "created_by_username": "admin_user"
    }
  ],
  "total": 8,
  "limit": 50,
  "offset": 0
}
```

---

#### `POST /api/purchases`
**Access:** ADMIN, BASE_COMMANDER, LOGISTICS_OFFICER  
**Description:** Records a new stock purchase at a base. BASE_COMMANDERs are validated to only purchase for their own base (controller-level check in addition to scope middleware).

**Request body:**
```json
{
  "baseId": 1,
  "equipmentTypeId": 1,
  "quantity": 25,
  "unitCost": 1200.00,
  "supplier": "GovSupply Corp",
  "notes": "Q1 resupply order"
}
```

**Required fields:** `baseId`, `equipmentTypeId`, `quantity`  
**Constraints:** `quantity` must be > 0

**Success response (201):**
```json
{
  "message": "Purchase recorded successfully.",
  "purchase": { ...full purchase record... }
}
```

**Side effect:** Writes a `PURCHASE` audit log entry.

---

#### `DELETE /api/purchases/:id`
**Access:** ADMIN only  
**Description:** Permanently deletes a purchase record by its ID. This is a hard delete — the record is removed from the database and balance calculations are immediately affected.

**URL parameter:** `id` — the purchase record's integer ID

**Success response (200):**
```json
{
  "message": "Purchase deleted.",
  "purchase": { ...deleted record... }
}
```

**Error responses:**
- `404` — purchase record not found

**Side effect:** Writes a `PURCHASE` audit log entry noting the deletion.

---

### 7.4 Transfer Routes

#### `GET /api/transfers`
**Access:** Authenticated (all roles). BASE_COMMANDER scope enforced (matches on source OR destination base).  
**Description:** Returns a paginated list of transfers. When `baseId` is supplied, returns transfers where the base is either the source or the destination.

**Query parameters:** `baseId`, `equipmentTypeId`, `startDate`, `endDate`, `limit` (default 50), `offset` (default 0)

**Success response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "source_base_id": 1,
      "destination_base_id": 2,
      "equipment_type_id": 1,
      "quantity": 10,
      "status": "COMPLETED",
      "notes": "Reallocation for training exercise",
      "initiated_by": 1,
      "created_at": "...",
      "source_base_name": "Fort Alpha",
      "destination_base_name": "Fort Bravo",
      "equipment_name": "M4 Carbine",
      "category": "WEAPON",
      "initiated_by_username": "admin_user"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

#### `POST /api/transfers`
**Access:** ADMIN, BASE_COMMANDER, LOGISTICS_OFFICER  
**Description:** Creates an atomic transfer between two bases. The operation:
1. Validates that source ≠ destination
2. Calculates available stock at the source base (purchases + transfers in − transfers out − assignments − expenditures)
3. Rejects the request if available stock < requested quantity
4. Opens a PostgreSQL transaction
5. Inserts the transfer record with `status = 'COMPLETED'`
6. Inserts the audit log entry using the same transaction client
7. Commits (or rolls back on any failure)

**Request body:**
```json
{
  "sourceBaseId": 1,
  "destinationBaseId": 2,
  "equipmentTypeId": 1,
  "quantity": 5,
  "notes": "Emergency resupply"
}
```

**Required fields:** `sourceBaseId`, `destinationBaseId`, `equipmentTypeId`, `quantity`

**Success response (201):**
```json
{
  "message": "Transfer completed successfully.",
  "transfer": { ...full transfer record... }
}
```

**Error responses:**
- `400` — missing fields, source equals destination, quantity <= 0
- `400` — `"Insufficient stock. Available: 20, Requested: 25"`
- `403` — BASE_COMMANDER attempting to transfer from another base

**Side effect:** Writes a `TRANSFER` audit log entry inside the transaction.

---

### 7.5 Assignment Routes

#### `GET /api/assignments`
**Access:** Authenticated. BASE_COMMANDER scope enforced. LOGISTICS_OFFICER does not have access to this route per the route definition (`authorizeRoles` is not applied to GET, but the frontend restricts navigation — review route definitions for stricter server-side read control if needed).  
**Description:** Returns a list of assignment records.

**Query parameters:** `baseId`, `equipmentTypeId`, `limit` (default 50), `offset` (default 0)

**Success response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "base_id": 1,
      "equipment_type_id": 1,
      "quantity": 20,
      "assigned_to": "1st Infantry Platoon",
      "notes": null,
      "created_by": 1,
      "created_at": "...",
      "base_name": "Fort Alpha",
      "equipment_name": "M4 Carbine",
      "category": "WEAPON",
      "created_by_username": "admin_user"
    }
  ]
}
```

---

#### `POST /api/assignments`
**Access:** ADMIN, BASE_COMMANDER  
**Description:** Creates an assignment record. BASE_COMMANDERs are restricted to their own base via a controller-level check.

**Request body:**
```json
{
  "baseId": 1,
  "equipmentTypeId": 1,
  "quantity": 10,
  "assignedTo": "Bravo Company",
  "notes": "Issued for field exercise"
}
```

**Required fields:** `baseId`, `equipmentTypeId`, `quantity`, `assignedTo`

**Success response (201):**
```json
{
  "message": "Assignment created.",
  "assignment": { ...full assignment record... }
}
```

**Side effect:** Writes an `ASSIGNMENT` audit log entry.

---

### 7.6 Expenditure Routes

#### `GET /api/expenditures`
**Access:** Authenticated. BASE_COMMANDER scope enforced.  
**Description:** Returns a list of expenditure records.

**Query parameters:** `baseId`, `equipmentTypeId`, `limit` (default 50), `offset` (default 0)

**Success response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "base_id": 1,
      "equipment_type_id": 6,
      "quantity": 500,
      "reason": "Live-fire training exercise",
      "notes": null,
      "created_by": 1,
      "created_at": "...",
      "base_name": "Fort Alpha",
      "equipment_name": "5.56mm Ammo",
      "category": "AMMUNITION",
      "created_by_username": "admin_user"
    }
  ]
}
```

---

#### `POST /api/expenditures`
**Access:** ADMIN, BASE_COMMANDER  
**Description:** Records an asset expenditure. BASE_COMMANDERs are restricted to their own base.

**Request body:**
```json
{
  "baseId": 1,
  "equipmentTypeId": 6,
  "quantity": 200,
  "reason": "Combat operations",
  "notes": "Sector 7 engagement"
}
```

**Required fields:** `baseId`, `equipmentTypeId`, `quantity`

**Success response (201):**
```json
{
  "message": "Expenditure recorded.",
  "expenditure": { ...full expenditure record... }
}
```

**Side effect:** Writes an `EXPENDITURE` audit log entry.

---

### 7.7 Health Check

#### `GET /health`
**Access:** Public  
**Description:** Server liveness check. Returns current server timestamp.

**Success response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 8. Login Credentials

### 8.1 Seeded Users

The following accounts are created by running `node models/seed.js`. These are development/demo credentials and **must be changed before any production deployment**.

| Role | Username | Password | Assigned Base | Access Scope |
|------|----------|----------|--------------|--------------|
| ADMIN | `admin_user` | `AdminPass123!` | None (Global) | Full access to all bases, all operations, audit logs, user management |
| BASE_COMMANDER | `commander_alpha` | `CommandPass123!` | Fort Alpha | Scoped to Fort Alpha only. Purchases, transfers, assignments, expenditures. |
| LOGISTICS_OFFICER | `logistics_officer` | `LogisticsPass123!` | Fort Alpha | Purchases and transfers across all bases. No assignments, expenditures, or audit logs. |

**To log in via the API:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin_user", "password": "AdminPass123!"}'
```

**Using the returned token:**
```bash
curl http://localhost:5000/api/assets/audit-logs \
  -H "Authorization: Bearer <token_from_login_response>"
```

### 8.2 Seeded Reference Data

The schema seed (`schema.sql`) and user seed (`seed.js`) together populate the following reference data:

#### Bases

| ID | Name | Location |
|----|------|----------|
| 1 | Fort Alpha | Northern Region |
| 2 | Fort Bravo | Eastern Region |
| 3 | Fort Charlie | Southern Region |

#### Equipment Types

| ID | Name | Category | Unit |
|----|------|----------|------|
| 1 | M4 Carbine | WEAPON | unit |
| 2 | M9 Pistol | WEAPON | unit |
| 3 | M249 SAW | WEAPON | unit |
| 4 | Humvee | VEHICLE | unit |
| 5 | MRAP | VEHICLE | unit |
| 6 | 5.56mm Ammo | AMMUNITION | rounds |
| 7 | 9mm Ammo | AMMUNITION | rounds |
| 8 | 40mm Grenade | AMMUNITION | rounds |

#### Demo Transactions (seeded by `seed.js`)

| Type | Detail |
|------|--------|
| Purchase | 50× M4 Carbine @ Fort Alpha |
| Purchase | 5,000× 5.56mm Ammo @ Fort Alpha |
| Purchase | 5× Humvee @ Fort Alpha |
| Purchase | 30× M9 Pistol @ Fort Bravo |
| Purchase | 3,000× 9mm Ammo @ Fort Bravo |
| Purchase | 3× MRAP @ Fort Bravo |
| Purchase | 10× M249 SAW @ Fort Charlie |
| Purchase | 200× 40mm Grenade @ Fort Charlie |
| Transfer | 10× M4 Carbine from Fort Alpha → Fort Bravo ("Reallocation for training exercise") |
| Assignment | 20× M4 Carbine assigned to "1st Infantry Platoon" at Fort Alpha |
| Expenditure | 500× 5.56mm Ammo expended at Fort Alpha ("Live-fire training exercise") |

---

*End of KristallBall Technical Documentation Report — Version 1.0.0*
