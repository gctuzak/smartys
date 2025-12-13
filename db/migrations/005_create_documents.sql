-- Create documents table to store Excel/PDF files metadata
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id),
  company_id UUID REFERENCES companies(id),
  person_id UUID REFERENCES persons(id),
  owner_email TEXT,
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_proposal ON documents (proposal_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents (company_id);
CREATE INDEX IF NOT EXISTS idx_documents_person ON documents (person_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_email ON documents (owner_email);
