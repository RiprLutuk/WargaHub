CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_digest TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  requested_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaint_comments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'REPORTER'
    CHECK (visibility IN ('REPORTER', 'INTERNAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance_reports (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'REVIEWED', 'PUBLISHED')),
  opening_balance BIGINT NOT NULL,
  income_total BIGINT NOT NULL,
  expense_total BIGINT NOT NULL,
  closing_balance BIGINT NOT NULL,
  public_summary JSONB,
  prepared_by TEXT NOT NULL REFERENCES users(id),
  reviewed_by TEXT REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, period)
);

CREATE INDEX idx_password_reset_active
  ON password_reset_tokens (token_digest, expires_at) WHERE used_at IS NULL;
CREATE INDEX idx_complaint_comments
  ON complaint_comments (organization_id, complaint_id, created_at);
CREATE INDEX idx_finance_reports_public
  ON finance_reports (organization_id, status, period);
