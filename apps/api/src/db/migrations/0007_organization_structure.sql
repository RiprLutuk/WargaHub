-- 0007_organization_structure.sql: Struktur Pengurus & Organisasi RT/RW

CREATE TABLE IF NOT EXISTS organization_officers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'PENGURUS_INTI',
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  period TEXT NOT NULL DEFAULT '2024 - 2027',
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_officers ON organization_officers(organization_id, active, order_index);
