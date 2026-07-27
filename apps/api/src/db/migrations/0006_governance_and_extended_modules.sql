-- Governance & Extended Modules Migration (0.2 / 0.3 & Post-MVP Modules)

-- 1. Voting, Musyawarah, & Polling (PRD 12.11)
CREATE TABLE polls (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  ballot_type TEXT NOT NULL DEFAULT 'PER_RESIDENT' CHECK (ballot_type IN ('PER_RESIDENT', 'PER_HOUSEHOLD')),
  anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  quorum_percentage INTEGER NOT NULL DEFAULT 50 CHECK (quorum_percentage BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMPTZ NOT NULL,
  result_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE poll_options (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0)
);

CREATE TABLE poll_votes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE CASCADE,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, poll_id, user_id)
);

-- 2. Surat & Administrasi (PRD 12.12)
CREATE TABLE letter_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  applicant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  letter_type TEXT NOT NULL,
  purpose TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachment_file_id TEXT REFERENCES files(id),
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED', 'ISSUED')),
  letter_number TEXT,
  verification_token TEXT UNIQUE,
  rejection_reason TEXT,
  issued_by TEXT REFERENCES users(id),
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Program & Proyek Lingkungan (PRD 12.9)
CREATE TABLE programs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pic_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'INFRASTRUCTURE',
  budget BIGINT NOT NULL DEFAULT 0 CHECK (budget >= 0),
  spent BIGINT NOT NULL DEFAULT 0 CHECK (spent >= 0),
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  public_updates TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Fasilitas & Peminjaman (PRD 12.14)
CREATE TABLE facilities (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  fee BIGINT NOT NULL DEFAULT 0 CHECK (fee >= 0),
  deposit BIGINT NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE facility_reservations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Parkir, Kendaraan, & Tamu (PRD 12.15 & 12.16)
CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CAR', 'MOTORCYCLE', 'OTHER')),
  brand_model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, plate_number)
);

CREATE TABLE guests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  registered_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  phone TEXT,
  purpose TEXT NOT NULL,
  pass_code TEXT NOT NULL UNIQUE,
  expected_arrival TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'EXPECTED' CHECK (status IN ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')),
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. UMKM & Jasa Warga (PRD 12.17)
CREATE TABLE umkms (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  operating_hours TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bantuan Sosial (PRD 12.18)
CREATE TABLE social_aid_programs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_amount BIGINT NOT NULL DEFAULT 0 CHECK (target_amount >= 0),
  collected_amount BIGINT NOT NULL DEFAULT 0 CHECK (collected_amount >= 0),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DISTRIBUTING', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Kehilangan & Penemuan (PRD 12.19)
CREATE TABLE lost_found_items (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('LOST', 'FOUND')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  photo_file_id TEXT REFERENCES files(id),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_polls_org ON polls(organization_id, status);
CREATE INDEX idx_letter_requests_org ON letter_requests(organization_id, applicant_id, status);
CREATE INDEX idx_programs_org ON programs(organization_id, status);
CREATE INDEX idx_facilities_org ON facilities(organization_id, active);
CREATE INDEX idx_vehicles_household ON vehicles(organization_id, household_id);
CREATE INDEX idx_guests_org ON guests(organization_id, pass_code);
CREATE INDEX idx_umkms_org ON umkms(organization_id, category);
CREATE INDEX idx_social_aid_org ON social_aid_programs(organization_id, status);
CREATE INDEX idx_lost_found_org ON lost_found_items(organization_id, kind, status);
