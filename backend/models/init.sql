-- ============================================================
-- KristallBall - Combined Schema + Static Seed
-- Run this file on your hosted PostgreSQL to initialize
-- ============================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS expenditures CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS equipment_types CASCADE;
DROP TABLE IF EXISTS bases CASCADE;

CREATE TABLE bases (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipment_types (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50)  NOT NULL CHECK (category IN ('WEAPON', 'VEHICLE', 'AMMUNITION')),
  unit     VARCHAR(30)  NOT NULL DEFAULT 'unit',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30)  NOT NULL CHECK (role IN ('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER')),
  base_id       INT REFERENCES bases(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE audit_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL
               CHECK (action IN ('PURCHASE', 'TRANSFER', 'ASSIGNMENT', 'EXPENDITURE', 'LOGIN', 'USER_CREATED')),
  entity_id  INT,
  details    TEXT NOT NULL,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_purchases_base       ON purchases(base_id);
CREATE INDEX idx_purchases_equipment  ON purchases(equipment_type_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);
CREATE INDEX idx_transfers_source     ON transfers(source_base_id);
CREATE INDEX idx_transfers_destination ON transfers(destination_base_id);
CREATE INDEX idx_transfers_equipment  ON transfers(equipment_type_id);
CREATE INDEX idx_transfers_created_at ON transfers(created_at);
CREATE INDEX idx_assignments_base     ON assignments(base_id);
CREATE INDEX idx_expenditures_base    ON expenditures(base_id);
CREATE INDEX idx_audit_logs_user      ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Bases
INSERT INTO bases (name, location) VALUES
  ('Fort Alpha',   'Northern Region'),
  ('Fort Bravo',   'Eastern Region'),
  ('Fort Charlie', 'Southern Region');

-- Equipment Types
INSERT INTO equipment_types (name, category, unit) VALUES
  ('M4 Carbine',   'WEAPON',     'unit'),
  ('M9 Pistol',    'WEAPON',     'unit'),
  ('M249 SAW',     'WEAPON',     'unit'),
  ('Humvee',       'VEHICLE',    'unit'),
  ('MRAP',         'VEHICLE',    'unit'),
  ('5.56mm Ammo',  'AMMUNITION', 'rounds'),
  ('9mm Ammo',     'AMMUNITION', 'rounds'),
  ('40mm Grenade', 'AMMUNITION', 'rounds');
