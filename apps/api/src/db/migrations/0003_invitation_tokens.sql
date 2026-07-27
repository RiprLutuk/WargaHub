ALTER TABLE password_reset_tokens
  ADD COLUMN purpose TEXT NOT NULL DEFAULT 'PASSWORD_RESET'
  CHECK (purpose IN ('PASSWORD_RESET', 'INVITATION'));

CREATE INDEX idx_invitation_tokens_active
  ON password_reset_tokens (token_digest, expires_at)
  WHERE used_at IS NULL AND purpose = 'INVITATION';
