-- ==============================================================================
-- 수호카페 통합 자동화 플랫폼 Supabase 전체 DDL 스키마 (schema.sql)
-- ==============================================================================

-- 1. pgvector 확장 활성화 (AI 문서 임베딩용)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- ① users (사용자 및 RBAC 관리)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NULL, -- 휴대폰 번호 추가
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ------------------------------------------------------------------------------
-- ② documents (스마트 문서 관리)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  extracted_text TEXT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ------------------------------------------------------------------------------
-- ③ document_embeddings (RAG 벡터 지식 베이스)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding VECTOR(768) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_embeddings_hnsw
  ON document_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- 코사인 유사도 검색 함수
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_index INT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.chunk_index,
    de.content,
    de.metadata,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM document_embeddings de
  WHERE 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- ④ notices (사내 공지사항 및 외부 알림 연동)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  discord_notified BOOLEAN NOT NULL DEFAULT FALSE,
  notion_notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- ⑤ chat_sessions (AI 고객 응대 세션 & 3단 요약)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(100) DEFAULT '방문 고객',
  title VARCHAR(255) NOT NULL DEFAULT '새로운 상담 세션',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'escalated')),
  summary_core TEXT NULL,
  summary_action TEXT NULL,
  summary_followup TEXT NULL,
  escalated_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ------------------------------------------------------------------------------
-- ⑥ chat_messages (상담 대화 내역)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  rag_sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
  ON chat_messages(session_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- ⑦ workflows (자동화 시나리오 엔진)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('cron', 'github_webhook', 'jira_webhook', 'document_upload', 'manual')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('db_insert', 'discord_webhook', 'notion_api', 'hr_onboarding')),
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ------------------------------------------------------------------------------
-- ⑧ execution_logs (실행 이력 및 모니터링 로그)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'fail', 'running')),
  duration_ms INTEGER DEFAULT 0,
  trigger_payload JSONB DEFAULT '{}'::jsonb,
  action_result JSONB DEFAULT '{}'::jsonb,
  error_log TEXT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_workflow
  ON execution_logs(workflow_id, executed_at DESC);
