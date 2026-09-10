# 문서 업로드 및 AI 요약

이번 범위는 PDF·DOCX·PPTX 업로드, 원본 보관, 본문 추출, JSON 요약입니다. 공지 등록·노션 전송·엑셀·OCR은 포함하지 않습니다.

## 실행

`server/.env`에 `GEMINI_API_KEY`와 사용 가능한 모델 이름인 `GEMINI_MODEL`을 설정하고 서버를 재시작하세요. 설정이 없으면 본문은 저장하고 요약 단계에서 설정 필요 메시지를 표시합니다. 설정 후 화면의 **다시 시도**로 요약을 진행할 수 있습니다.

루트에서 `npm run dev`를 실행합니다. 승인된 계정으로 로그인한 뒤 문서 페이지에서 업로드하세요.

## Supabase

새 프로젝트에는 `supabase/schema.sql`을 먼저 적용하고, 기존·신규 프로젝트 모두 `supabase/migrations/20260910_document_summary.sql`을 적용하세요.

서버 환경 변수:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SERVICE_ROLE_KEY
SUPABASE_DOCUMENT_BUCKET=documents
GEMINI_API_KEY=YOUR_GEMINI_KEY
GEMINI_MODEL=YOUR_AVAILABLE_MODEL
```

원본은 비공개 Storage 버킷에, 본문은 `extracted_text`에, 출처는 `extracted_sections JSONB`에, 요약은 `summary JSONB`에 저장합니다. 키를 프런트엔드에 넣지 마세요. 다운로드는 승인된 세션을 확인한 뒤 60초 서명 URL을 발급합니다. 기존 documents 버킷이 있다면 비공개 설정인지 확인하세요.

Supabase 미설정 시 `server/src/data/documents.json`과 `server/uploads/documents/`를 사용합니다. 로컬 모드는 단일 서버 프로세스용입니다. 기존 원본이 저장되지 않았던 문서는 다시 업로드해야 다운로드·요약할 수 있습니다.

## 처리 흐름

업로드 형식·크기 확인 → 원본 저장 → `queued` 문서 저장 → HTTP 202 응답 → 백그라운드 추출 → 요약 → `completed`.

문서 행 자체가 영속 작업입니다. 서버 시작 시 대기 작업을 처리하고, 비정상 종료된 작업은 3분 임대 만료 후 재개합니다. Supabase는 행 잠금으로 중복 실행을 막습니다. 파싱은 별도 프로세스에서 수행합니다. 일시적 실패는 최대 3회 시도하며, 저장된 본문은 재사용합니다. 본문이 없으면 `needs_ocr`로 종료하고 AI를 호출하지 않습니다.

항상 실행되는 Node 서버가 필요합니다. 요청 종료 후 실행을 중단하는 서버리스 환경에는 별도 상시 워커가 필요합니다. 워커를 끄려면 `DOCUMENT_WORKER_ENABLED=false`를 설정합니다.

PDF는 페이지 번호, PPTX는 실제 슬라이드 순서, DOCX는 문단·표 행 순서를 기록합니다. 이미지·차트의 시각적 의미와 OCR은 지원하지 않습니다. 업로드 50MB, 추출 본문 80만 자, 파싱 2분 제한입니다. 긴 본문은 나눠 요약 후 통합하며 요약은 원문을 대체하지 않습니다.

## 검증

서버: `npm run test:documents` / 클라이언트: `npm run build`.
자동 테스트는 실제 Office 파싱과 로컬 영속 저장을 사용하며 AI 호출은 테스트 응답으로 대체합니다. 실제 Gemini·Supabase 연결 검증은 자격 증명과 마이그레이션 적용 후 필요합니다.

구현 참고: [Gemini 구조화 응답](https://ai.google.dev/gemini-api/docs/structured-output), [Supabase Storage](https://supabase.com/docs/guides/storage/quickstart).
