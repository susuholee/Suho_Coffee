const { parseInWorker } = require('./documentParserWorker');
const { createDocumentSummarizer } = require('./documentSummary');

function createDocumentPipeline({ store, parse = parseInWorker, summarize = createDocumentSummarizer(), now = () => new Date(), retryDelay = 10000, logger = console } = {}) {
  let active = false;
  let timer;
  async function processNext() {
    if (active) return false;
    active = true;
    let doc, heartbeat;
    try {
      doc = await store.claim();
      if (!doc) return false;
      const update = patch => store.update(doc.id, patch, doc.lease_token);
      heartbeat = setInterval(() => {
        update({ lease_until: new Date(now().getTime() + 180000).toISOString() }).catch(error => logger.error('[문서 작업 갱신]', error.message));
      }, 30000);
      heartbeat.unref?.();
      if (!doc.extracted_text) {
        const original = await store.readOriginal(doc);
        const extracted = await parse(original, doc.file_name);
        doc = await update({ extracted_text: extracted.text, extracted_sections: extracted.sections });
        if (!extracted.text.trim()) {
          await update({ status: 'needs_ocr', error_message: '추출 가능한 본문이 없습니다. 이미지 문서로 텍스트 추출(OCR)이 필요합니다.', lease_token: null, lease_until: null });
          return true;
        }
      }
      await update({ status: 'summarizing', error_message: null });
      const summary = await summarize(doc.extracted_text);
      await update({ summary, status: 'completed', completed_at: now().toISOString(), error_message: null, lease_token: null, lease_until: null });
      return true;
    } catch (error) {
      if (doc) {
        const retry = !error.permanent && doc.attempts < 3;
        // Provider error messages may contain URLs/API keys; never store them verbatim.
        const message = /generativelanguage|API key|fetch|https?:\/\//i.test(error.message)
          ? 'AI 서비스 호출에 실패했습니다. API 설정과 사용량을 확인한 뒤 다시 시도하세요.' : error.message;
        await store.update(doc.id, {
          status: retry ? 'queued' : 'failed', error_message: message,
          next_attempt_at: new Date(now().getTime() + retryDelay * doc.attempts).toISOString(), lease_token: null, lease_until: null,
        }, doc.lease_token).catch(saveError => logger.error('[문서 오류 저장]', saveError.message));
      } else logger.error('[문서 작업 조회]', error.message);
      return false;
    } finally { clearInterval(heartbeat); active = false; }
  }
  return {
    processNext,
    start() {
      if (timer) return;
      timer = setInterval(() => { void processNext(); }, 2000);
      timer.unref?.();
      void processNext();
    },
    stop() { clearInterval(timer); timer = null; },
  };
}
module.exports = { createDocumentPipeline };
