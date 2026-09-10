-- Run after schema.sql on a new project, or directly on an existing project.
-- The document row is also the durable queue entry; insert and queue registration are atomic.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS extracted_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS summary JSONB,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS lease_token UUID,
  ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_documents_processing
  ON public.documents (status, next_attempt_at, created_at);

CREATE OR REPLACE FUNCTION public.claim_document_processing(worker_token UUID)
RETURNS SETOF public.documents
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE selected_id UUID;
BEGIN
  SELECT id INTO selected_id FROM public.documents
  WHERE storage_path IS NOT NULL AND (
    (status = 'queued' AND next_attempt_at <= NOW()) OR
    (status IN ('extracting', 'summarizing') AND COALESCE(lease_until, '-infinity'::timestamptz) <= NOW())
  )
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;
  IF selected_id IS NULL THEN RETURN; END IF;
  RETURN QUERY UPDATE public.documents SET
    status = CASE WHEN COALESCE(extracted_text, '') = '' THEN 'extracting' ELSE 'summarizing' END,
    attempts = attempts + 1, lease_token = worker_token,
    lease_until = NOW() + INTERVAL '3 minutes', updated_at = NOW()
  WHERE id = selected_id RETURNING *;
END;
$$;

-- Only the server service role can access private documents and claim work.
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.documents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO service_role;
REVOKE ALL ON FUNCTION public.claim_document_processing(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_document_processing(UUID) TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800, ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]) ON CONFLICT (id) DO NOTHING;
