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

async function excel({ rows = '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>매출</t></is></c></row><row r="2"><c r="A2" s="1"><v>45292</v></c><c r="C2" s="2"><v>1234</v></c><c r="D2" s="3"><v>0.125</v></c><c r="E2"><f>C2*2</f><v>2468</v></c><c r="F2"><f>C2*3</f></c><c r="G2" t="e"><v>#DIV/0!</v></c></row>', date1904 = false } = {}) {
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
  return office({
    'xl/workbook.xml': `<workbook xmlns:r="urn:r"><workbookPr date1904="${date1904 ? 1 : 0}"/><sheets><sheet name="매출" sheetId="2" r:id="second"/><sheet name="빈 시트" sheetId="1" r:id="first"/><sheet name="비공개" sheetId="3" state="hidden" r:id="hidden"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships><Relationship Id="first" Type="${rel}worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="second" Type="${rel}worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="hidden" Type="${rel}worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="styles" Type="${rel}styles" Target="styles.xml"/><Relationship Id="strings" Type="${rel}sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
    'xl/sharedStrings.xml': '<sst><si><r><t>거래</t></r><r><t>일자</t></r></si></sst>',
    'xl/styles.xml': '<styleSheet><numFmts><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="#,##0&quot;원&quot;"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="164"/><xf numFmtId="165"/><xf numFmtId="10"/></cellXfs></styleSheet>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData/></worksheet>',
    'xl/worksheets/sheet2.xml': `<worksheet><sheetData>${rows}</sheetData><mergeCells><mergeCell ref="A1:B1"/></mergeCells></worksheet>`,
    'xl/worksheets/sheet3.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>HIDDEN_SECRET</t></is></c></row></sheetData></worksheet>',
  });
}

test('XLSX preserves sheet order, sparse cell addresses, formats and cached formula results', async () => {
  const result = await parseInWorker(await excel(), '매출.xlsx');
  assert.deepEqual(result.sections.map(s => s.name), ['매출', '빈 시트']);
  for (const value of ['거래일자', '2024-01-01', '1,234원', '12.50%', 'E2="2468"', 'F2="[수식 계산 결과 없음]"', '#DIV/0!', '병합 범위: A1:B1']) assert.ok(result.text.includes(value), value);
  assert.equal(result.sections[0].formula_count, 2);
  assert.ok(result.sections[0].warnings.some(w => w.includes('숨김 시트')));
  assert.equal(result.sections[1].text, '');
  assert.ok(!result.text.includes('HIDDEN_SECRET'));
  assert.ok(!result.text.includes('C2*3'));
});

test('XLSX supports the 1904 calendar and retains literal strings and booleans', async () => {
  const result = await extractDocument(await excel({ date1904: true, rows: '<row r="1"><c r="A1" s="1"><v>0</v></c><c r="B1" t="b"><v>0</v></c><c r="C1" t="inlineStr"><is><t>=DO_NOT_EXECUTE()</t></is></c><c r="D1"><v>0</v></c></row>' }), 'dates.xlsx');
  assert.match(result.text, /1904-01-01/);
  assert.match(result.text, /FALSE/);
  assert.match(result.text, /=DO_NOT_EXECUTE/);
  assert.match(result.text, /D1="0"/);
});

test('empty or oversized spreadsheets fail clearly instead of partial summaries or OCR', async () => {
  await assert.rejects(extractDocument(await excel({ rows: '' }), 'empty.xlsx'), /셀 데이터가 없습니다/);
  await assert.rejects(extractDocument(await excel({ rows: '<row r="10001"><c r="A10001"><v>1</v></c></row>' }), 'big.xlsx'), /10,000행/);
  await assert.rejects(extractDocument(await excel({ rows: '<row r="1"><c r="IW1"><v>1</v></c></row>' }), 'wide.xlsx'), /256열/);
  await assert.rejects(validateDocument(await excel(), 'legacy.xls'), /XLSX/);
});

test('XLSX goes through persistent storage, extraction and JSON summary and can be deleted', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'suho-excel-pipeline-'));
  const store = createDocumentStore({ dataDir: dir, storageDir: dir });
  const id = randomUUID(), storage_path = id + '.xlsx', buffer = await excel();
  await store.saveOriginal(storage_path, buffer, 'xlsx');
  await store.insert({ id, storage_path, file_name: '매출.xlsx', status: 'queued', created_at: new Date().toISOString() });
  const pipeline = createDocumentPipeline({ store, parse: extractDocument, summarize: createDocumentSummarizer({ generate: async content => {
    assert.match(content, /매출/); assert.match(content, /12.50%/);
    return summary;
  } }) });
  await pipeline.processNext();
  const doc = await store.get(id);
  assert.equal(doc.status, 'completed');
  assert.deepEqual(doc.summary, summary);
  assert.deepEqual(await store.readOriginal(doc), buffer);
  assert.equal(doc.extracted_sections[0].kind, 'sheet');
  await store.remove(id);
  assert.equal(await store.get(id), null);
});

test('rename preserves original and summary; deletion removes both record and file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'suho-document-edit-'));
  const store = createDocumentStore({ dataDir: dir, storageDir: dir });
  const id = randomUUID(), storage_path = id + '.pdf';
  await store.saveOriginal(storage_path, Buffer.from('%PDF-test'), 'pdf');
  await store.insert({ id, title: 'Before', file_name: 'original.pdf', storage_path, status: 'completed', summary, created_at: new Date().toISOString() });
  await store.update(id, { title: 'After' });
  const renamed = await store.get(id);
  assert.equal(renamed.title, 'After');
  assert.equal(renamed.file_name, 'original.pdf');
  assert.deepEqual(renamed.summary, summary);
  await store.remove(id);
  assert.equal(await store.get(id), null);
  assert.equal(fs.existsSync(path.join(dir, storage_path)), false);
});

test('deletion blocks active jobs and cancels queued jobs before storage cleanup', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'suho-document-delete-'));
  const store = createDocumentStore({ dataDir: dir, storageDir: dir });
  const id = randomUUID(), storage_path = id + '.pdf';
  await store.saveOriginal(storage_path, Buffer.from('%PDF-test'), 'pdf');
  await store.insert({ id, storage_path, status: 'summarizing', created_at: new Date().toISOString() });
  await assert.rejects(store.remove(id), { status: 409 });
  assert.equal(fs.existsSync(path.join(dir, storage_path)), true);
  await store.update(id, { status: 'queued' });
  const removeOriginal = store.removeOriginal.bind(store);
  store.removeOriginal = async key => {
    assert.equal(await store.claim(), null);
    await removeOriginal(key);
  };
  await store.remove(id);
  assert.equal(await store.get(id), null);
});

test('failed storage deletion preserves document and permits retry', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'suho-document-delete-fail-'));
  const store = createDocumentStore({ dataDir: dir, storageDir: dir });
  const id = randomUUID(), storage_path = id + '.pdf';
  await store.insert({ id, storage_path, status: 'completed', created_at: new Date().toISOString() });
  const removeOriginal = store.removeOriginal.bind(store);
  store.removeOriginal = async () => { throw new Error('Storage unavailable'); };
  await assert.rejects(store.remove(id), /Storage unavailable/);
  assert.equal((await store.get(id)).status, 'completed');
  store.removeOriginal = removeOriginal;
  await store.remove(id); // A missing original is safe to clean up again.
  assert.equal(await store.get(id), null);
});

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
