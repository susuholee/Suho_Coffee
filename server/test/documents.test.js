const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const JSZip = require('jszip');
const { extractDocument, validateDocument } = require('../src/services/fileParser');
const { parseInWorker } = require('../src/services/documentParserWorker');
const { createDocumentSummarizer, validateSummary } = require('../src/services/documentSummary');
const { createDocumentStore } = require('../src/services/documentStore');
const { createDocumentPipeline } = require('../src/services/documentPipeline');
const summary = { title: '교육 안내', summary: '교육비는 100원입니다.', key_points: ['교육비 100원'], target_audience: null, deadline: null, action_items: [] };
async function office(files) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  for (const [name, xml] of Object.entries(files)) zip.file(name, xml);
  return zip.generateAsync({ type: 'nodebuffer' });
}
const word = () => office({ 'word/document.xml': '<w:document xmlns:w="urn:word"><w:body><w:p><w:r><w:t>교육 안내</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>교육비</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>100원</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>' });

test('DOCX worker preserves Korean paragraphs and table cells', async () => {
  const result = await parseInWorker(await word(), '교육.docx');
  assert.match(result.text, /교육 안내/);
  assert.match(result.text, /교육비\t100원/);
  assert.equal(result.sections[1].number, 2);
});
test('PPTX follows presentation order rather than slide filenames', async () => {
  const slide = value => `<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${value}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
  const buffer = await office({
    'ppt/presentation.xml': '<p:presentation xmlns:p="urn:p" xmlns:r="urn:r"><p:sldIdLst><p:sldId id="1" r:id="second"/><p:sldId id="2" r:id="first"/></p:sldIdLst></p:presentation>',
    'ppt/_rels/presentation.xml.rels': '<Relationships><Relationship Id="first" Target="slides/slide1.xml"/><Relationship Id="second" Target="slides/slide2.xml"/></Relationships>',
    'ppt/slides/slide1.xml': slide('나중'), 'ppt/slides/slide2.xml': slide('처음'),
  });
  const result = await extractDocument(buffer, '교육.pptx');
  assert.deepEqual(result.sections.map(s => s.text), ['처음', '나중']);
  assert.equal(result.sections[0].number, 1);
});
test('wrong formats and invalid JSON summaries are rejected', async () => {
  await assert.rejects(validateDocument(Buffer.from('fake'), 'fake.pdf'));
  await assert.rejects(validateDocument(await word(), 'fake.pptx'));
  await assert.rejects(validateDocument(await word(), 'sheet.xlsx'));
  assert.throws(() => validateSummary({ ...summary, deadline: undefined }));
  assert.deepEqual(validateSummary({ ...summary, unexpected: 'ignored' }), summary);
});
test('long documents include the final chunk and merge summaries', async () => {
  const inputs = [];
  const summarize = createDocumentSummarizer({ generate: async input => { inputs.push(input); return JSON.stringify(summary); } });
  assert.deepEqual(await summarize('가'.repeat(32000) + '마지막 내용'), summary);
  assert.ok(inputs.some(input => input.includes('마지막 내용')));
  assert.equal(inputs.length, 4);
});
test('durable queue saves original, resumes after restart, and retries AI without reparsing', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'suho-documents-test-'));
  const options = { dataDir: dir, storageDir: path.join(dir, 'originals') };
  const store = createDocumentStore(options);
  const id = randomUUID(), key = id + '.docx', buffer = await word();
  await store.saveOriginal(key, buffer, 'docx');
  await store.insert({ id, storage_path: key, file_name: '교육.docx', status: 'queued', created_at: new Date().toISOString() });
  const restarted = createDocumentStore(options);
  assert.deepEqual(await restarted.readOriginal(await restarted.get(id)), buffer);
  let parsed = 0, calls = 0;
  const pipeline = createDocumentPipeline({ store: restarted, retryDelay: 0,
    parse: async (...args) => { parsed++; return extractDocument(...args); },
    summarize: async () => { if (++calls === 1) throw new Error('temporary failure'); return summary; },
  });
  await pipeline.processNext();
  assert.equal((await store.get(id)).status, 'queued');
  await pipeline.processNext();
  const done = await store.get(id);
  assert.equal(done.status, 'completed');
  assert.deepEqual(done.summary, summary);
  assert.equal(parsed, 1);
  assert.equal(await pipeline.processNext(), false);
  assert.equal((await store.list()).length, 1);
});
test('empty text stops before AI', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'suho-empty-test-'));
  const store = createDocumentStore({ dataDir: dir, storageDir: dir });
  const id = randomUUID(), key = id + '.pdf';
  await store.saveOriginal(key, Buffer.from('%PDF-1.4'), 'pdf');
  await store.insert({ id, storage_path: key, file_name: 'scan.pdf', status: 'queued', created_at: new Date().toISOString() });
  const pipeline = createDocumentPipeline({ store, parse: async () => ({ text: '', sections: [] }), summarize: async () => { throw new Error('AI must not run'); } });
  await pipeline.processNext();
  assert.equal((await store.get(id)).status, 'needs_ocr');
});

test('PDF extracts page text in the parser worker', async () => {
  const stream = 'BT /F1 12 Tf 50 100 Td (Education 2026) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const result = await parseInWorker(Buffer.from(pdf), 'education.pdf');
  assert.match(result.text, /Education 2026/);
  assert.equal(result.sections[0].number, 1);
});
