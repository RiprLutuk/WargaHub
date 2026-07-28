ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_complaints_active ON complaints (organization_id, deleted_at, created_at);
