-- Apply after schema.sql and the document pipeline migration.
BEGIN;
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS summary JSONB,
  ADD COLUMN IF NOT EXISTS processing_token UUID,
  ADD COLUMN IF NOT EXISTS processing_until TIMESTAMPTZ;

-- Preserve conversations already stored in the original normalized table.
UPDATE public.chat_sessions s SET transcript = history.messages
FROM (
  SELECT session_id, jsonb_agg(jsonb_build_object('id', id,
    'sender', CASE WHEN sender='assistant' THEN 'ai' ELSE sender END,
    'text', message, 'source_docs', rag_sources, 'created_at', created_at)
    ORDER BY created_at, id) AS messages
  FROM public.chat_messages GROUP BY session_id
) history WHERE s.id=history.session_id AND s.transcript='[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.knowledge_jobs (
  document_id UUID PRIMARY KEY REFERENCES public.documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  error_message TEXT,
  lock_token UUID,
  lock_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.enqueue_document_knowledge() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.extracted_text, '') <> '' THEN
    INSERT INTO knowledge_jobs(document_id) VALUES(NEW.id)
    ON CONFLICT (document_id) DO UPDATE SET status='queued', attempts=0,
      error_message=NULL, lock_token=NULL, lock_until=NULL, updated_at=NOW();
  ELSE
    DELETE FROM knowledge_jobs WHERE document_id=NEW.id;
    DELETE FROM document_embeddings WHERE document_id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_document_knowledge ON public.documents;
CREATE TRIGGER trigger_document_knowledge AFTER INSERT OR UPDATE OF extracted_text, title
ON public.documents FOR EACH ROW EXECUTE FUNCTION public.enqueue_document_knowledge();
INSERT INTO public.knowledge_jobs(document_id)
SELECT id FROM public.documents WHERE COALESCE(extracted_text,'') <> ''
ON CONFLICT (document_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_knowledge_job(worker_token UUID) RETURNS JSONB
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE chosen UUID; payload JSONB;
BEGIN
  SELECT j.document_id INTO chosen FROM knowledge_jobs j JOIN documents d ON d.id=j.document_id
  WHERE d.status <> 'deleting' AND COALESCE(d.extracted_text,'') <> '' AND (
    j.status='queued' OR (j.status='indexing' AND j.lock_until<NOW())
  ) ORDER BY j.updated_at FOR UPDATE OF j SKIP LOCKED LIMIT 1;
  IF chosen IS NULL THEN RETURN NULL; END IF;
  UPDATE knowledge_jobs SET status='indexing', attempts=attempts+1,
    lock_token=worker_token, lock_until=NOW()+INTERVAL '3 minutes', updated_at=NOW()
  WHERE document_id=chosen;
  SELECT jsonb_build_object('id',d.id,'title',d.title,'text',d.extracted_text,
    'sections',d.extracted_sections,'attempts',j.attempts)
  INTO payload FROM documents d JOIN knowledge_jobs j ON j.document_id=d.id WHERE d.id=chosen;
  RETURN payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_knowledge_job(doc_id UUID, worker_token UUID, embedding_model TEXT, chunks JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  PERFORM 1 FROM public.knowledge_jobs WHERE document_id=doc_id AND lock_token=worker_token FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  DELETE FROM public.document_embeddings WHERE document_id=doc_id;
  INSERT INTO public.document_embeddings(document_id,chunk_index,content,embedding,metadata)
  SELECT doc_id,(item->>'index')::integer,item->>'content',
    (item->'embedding')::text::vector(768),item->'metadata'
  FROM jsonb_array_elements(chunks) item;
  UPDATE public.knowledge_jobs SET status='ready', model=embedding_model,error_message=NULL,
    lock_token=NULL,lock_until=NULL,updated_at=NOW() WHERE document_id=doc_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_chat_knowledge(query_embedding VECTOR(768), embedding_model TEXT,
  match_threshold FLOAT DEFAULT 0.55, match_count INTEGER DEFAULT 6)
RETURNS TABLE(id UUID,document_id UUID,title TEXT,content TEXT,metadata JSONB,similarity FLOAT)
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT e.id,e.document_id,d.title::text,e.content,e.metadata,1-(e.embedding <=> query_embedding)
  FROM public.document_embeddings e JOIN public.documents d ON d.id=e.document_id
  JOIN public.knowledge_jobs j ON j.document_id=d.id
  WHERE j.status='ready' AND j.model=embedding_model AND d.status <> 'deleting'
    AND 1-(e.embedding <=> query_embedding)>match_threshold
  ORDER BY e.embedding <=> query_embedding LIMIT LEAST(GREATEST(match_count,1),10);
$$;

CREATE OR REPLACE FUNCTION public.claim_chat_session(session_id UUID, worker_token UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE chat_sessions SET processing_token=worker_token, processing_until=NOW()+INTERVAL '3 minutes'
  WHERE id=session_id AND (processing_token IS NULL OR processing_until<NOW());
  RETURN FOUND;
END;
$$;

ALTER TABLE public.knowledge_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.knowledge_jobs, public.document_embeddings, public.chat_sessions, public.chat_messages FROM anon, authenticated;
GRANT ALL ON public.knowledge_jobs, public.document_embeddings, public.chat_sessions, public.chat_messages TO service_role;
REVOKE ALL ON FUNCTION public.claim_knowledge_job(UUID), public.finish_knowledge_job(UUID,UUID,TEXT,JSONB),
  public.search_chat_knowledge(VECTOR,TEXT,FLOAT,INTEGER), public.claim_chat_session(UUID,UUID),
  public.match_document_chunks(VECTOR,FLOAT,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_knowledge_job(UUID), public.finish_knowledge_job(UUID,UUID,TEXT,JSONB),
  public.search_chat_knowledge(VECTOR,TEXT,FLOAT,INTEGER), public.claim_chat_session(UUID,UUID) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
