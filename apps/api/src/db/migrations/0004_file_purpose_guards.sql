CREATE UNIQUE INDEX uq_payment_proof_file
  ON payments (organization_id, proof_file_id)
  WHERE proof_file_id IS NOT NULL;

CREATE UNIQUE INDEX uq_document_version_file
  ON document_versions (organization_id, file_id)
  WHERE file_id IS NOT NULL;
