CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  locale TEXT NOT NULL DEFAULT 'id-ID',
  currency TEXT NOT NULL DEFAULT 'IDR',
  modules JSONB NOT NULL DEFAULT '{"billing":true,"finance":true,"patrol":true,"complaints":true,"activities":true,"documents":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rws (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE rts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rw_id TEXT NOT NULL REFERENCES rws(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (organization_id, rw_id, code)
);

CREATE TABLE blocks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rt_id TEXT NOT NULL REFERENCES rts(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (organization_id, rt_id, code)
);

CREATE TABLE households (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rt_id TEXT NOT NULL REFERENCES rts(id),
  block_id TEXT REFERENCES blocks(id),
  code TEXT NOT NULL,
  address TEXT NOT NULL,
  occupancy_status TEXT NOT NULL CHECK (occupancy_status IN ('OCCUPIED', 'EMPTY')),
  ownership_status TEXT NOT NULL CHECK (ownership_status IN ('OWNER_OCCUPIED', 'RENTED', 'OTHER')),
  private_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, code)
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('INVITED', 'ACTIVE', 'INACTIVE')),
  communication_preference TEXT NOT NULL DEFAULT 'IN_APP',
  accessibility_needs TEXT,
  participation_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
  privacy_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, email)
);

CREATE TABLE household_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  can_manage BOOLEAN NOT NULL DEFAULT FALSE,
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_at DATE,
  UNIQUE (organization_id, household_id, user_id)
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE permissions (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE user_roles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'ORGANIZATION',
  scope_id TEXT,
  UNIQUE (organization_id, user_id, role_id, scope_type, scope_id)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_digest TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE login_history (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256 TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PUBLIC', 'PRIVATE', 'SENSITIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('PUBLIC', 'RESIDENT')),
  urgency TEXT NOT NULL DEFAULT 'NORMAL' CHECK (urgency IN ('NORMAL', 'IMPORTANT', 'EMERGENCY')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, slug)
);

CREATE TABLE announcement_reads (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, announcement_id, user_id)
);

CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL REFERENCES households(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  period TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'MANDATORY' CHECK (kind IN ('MANDATORY', 'VOLUNTARY', 'DONATION')),
  recurrence TEXT NOT NULL DEFAULT 'ONE_TIME' CHECK (recurrence IN ('ONE_TIME', 'MONTHLY')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  amount_paid BIGINT NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIALLY_PAID', 'PAID', 'WAIVED', 'VOID')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cash_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('CASH', 'BANK')),
  masked_number TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (organization_id, name)
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bill_id TEXT NOT NULL REFERENCES bills(id),
  household_id TEXT NOT NULL REFERENCES households(id),
  submitted_by TEXT NOT NULL REFERENCES users(id),
  verified_by TEXT REFERENCES users(id),
  proof_file_id TEXT REFERENCES files(id),
  idempotency_key TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('BANK_TRANSFER', 'CASH')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'PAID', 'REJECTED')),
  note TEXT,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMPTZ,
  UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE finance_transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  reviewed_by TEXT REFERENCES users(id),
  payment_id TEXT UNIQUE REFERENCES payments(id),
  reversal_of_id TEXT UNIQUE REFERENCES finance_transactions(id),
  kind TEXT NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'REVIEWED', 'POSTED', 'REVERSED')),
  occurred_at TIMESTAMPTZ NOT NULL,
  proof_file_id TEXT REFERENCES files(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaints (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  assigned_to TEXT REFERENCES users(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'PUBLIC')),
  location TEXT,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, ticket_number)
);

CREATE TABLE complaint_status_histories (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  message TEXT,
  public_to_reporter BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  coordinator_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER,
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_needs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  contribution_type TEXT NOT NULL,
  target INTEGER NOT NULL CHECK (target > 0),
  UNIQUE (organization_id, activity_id, contribution_type)
);

CREATE TABLE activity_responses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contribution_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, activity_id, user_id)
);

CREATE TABLE patrol_assignments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'SWAP_PENDING', 'COMPLETED', 'EXCUSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patrol_swap_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_assignment_id TEXT NOT NULL REFERENCES patrol_assignments(id),
  target_assignment_id TEXT NOT NULL REFERENCES patrol_assignments(id),
  requester_id TEXT NOT NULL REFERENCES users(id),
  target_user_id TEXT NOT NULL REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'ACCEPTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (source_assignment_id <> target_assignment_id)
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('PUBLIC', 'INTERNAL', 'SENSITIVE')),
  current_version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, slug)
);

CREATE TABLE document_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES files(id),
  version INTEGER NOT NULL,
  checksum_sha256 TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, document_id, version)
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  deduplication_key TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, user_id, deduplication_key)
);

CREATE TABLE notification_preferences (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  in_app BOOLEAN NOT NULL DEFAULT TRUE,
  email BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  digest TEXT NOT NULL DEFAULT 'IMMEDIATE' CHECK (digest IN ('IMMEDIATE', 'DAILY', 'EMERGENCY_ONLY')),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE notification_deliveries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  request_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  before_value JSONB,
  after_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, key)
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD')),
  attempts INTEGER NOT NULL DEFAULT 0,
  run_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_households_org ON households (organization_id, code);
CREATE INDEX idx_users_org_email ON users (organization_id, email);
CREATE INDEX idx_sessions_digest_active ON sessions (token_digest, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_announcements_public ON announcements (organization_id, status, visibility, publish_at);
CREATE INDEX idx_bills_household_status ON bills (organization_id, household_id, status, due_at);
CREATE INDEX idx_payments_status ON payments (organization_id, status, submitted_at);
CREATE INDEX idx_finance_period ON finance_transactions (organization_id, occurred_at, status);
CREATE INDEX idx_complaints_reporter ON complaints (organization_id, reporter_id, status);
CREATE INDEX idx_complaints_assignee ON complaints (organization_id, assigned_to, status);
CREATE INDEX idx_activities_starts ON activities (organization_id, starts_at);
CREATE INDEX idx_patrol_user_time ON patrol_assignments (organization_id, user_id, starts_at);
CREATE INDEX idx_notifications_user ON notifications (organization_id, user_id, read_at, created_at);
CREATE INDEX idx_audit_entity ON audit_logs (organization_id, entity_type, entity_id, created_at);
CREATE INDEX idx_jobs_ready ON jobs (status, run_at) WHERE status IN ('PENDING', 'FAILED');
