-- Contract: store the MinIO object key of the uploaded contract document (PDF).
ALTER TABLE contract ADD COLUMN IF NOT EXISTS document_key VARCHAR(300);
