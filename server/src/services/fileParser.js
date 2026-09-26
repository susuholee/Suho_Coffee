const path = require('path');
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
function invalid(message) { return Object.assign(new Error(message), { status: 400, permanent: true }); }
async function validateDocument(buffer, fileName) {
  const type = path.extname(fileName).slice(1).toLowerCase();
  if (!MIME_TYPES[type]) throw invalid('PDF, DOCX, PPTX, XLSX 파일만 지원합니다.');
  if (!buffer.length || buffer.length > MAX_FILE_SIZE) throw invalid('빈 파일 또는 50MB를 초과한 파일은 업로드할 수 없습니다.');
  if (type === 'pdf') {
    if (buffer.subarray(0, 5).toString() !== '%PDF-') throw invalid('확장자와 실제 PDF 파일 형식이 일치하지 않습니다.');
  } else {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) throw invalid('올바른 Office 파일이 아닙니다. 암호가 걸린 문서는 해제 후 업로드하세요.');
    let zip;
    try { zip = await JSZip.loadAsync(buffer); } catch { throw invalid('손상되었거나 암호화된 Office 파일입니다.'); }
    if (Object.keys(zip.files).length > 10000) throw invalid('문서 내부 항목 수가 처리 한도를 초과했습니다.');
    const mainPart = { docx: 'word/document.xml', pptx: 'ppt/presentation.xml', xlsx: 'xl/workbook.xml' }[type];
    if (!zip.file('[Content_Types].xml') || !zip.file(mainPart)) {
      throw invalid('확장자와 실제 Office 파일 형식이 일치하지 않습니다.');
    }
  }
  return type;
}
async function readXml(zip, name, budget) {
  const entry = zip.file(name);
  if (!entry) throw invalid('문서의 필수 구성 요소가 없습니다: ' + name);
  const xml = await new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const stream = entry.internalStream('nodebuffer');
    stream.on('data', chunk => {
      size += chunk.length;
      budget.bytes += chunk.length;
      if (size > 10 * 1024 * 1024 || budget.bytes > 40 * 1024 * 1024) {
        stream.pause();
        reject(invalid('문서의 압축 해제 크기가 처리 한도를 초과했습니다.'));
      } else chunks.push(chunk);
    }).on('error', reject).on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))).resume();
  });
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw invalid('외부 엔티티가 포함된 문서는 지원하지 않습니다.');
  let malformed = false;
  const doc = new DOMParser({ errorHandler: { warning: () => {}, error: () => { malformed = true; }, fatalError: () => { malformed = true; } } }).parseFromString(xml, 'text/xml');
  if (malformed || !doc.documentElement) throw invalid('문서 XML이 손상되었습니다.');
  return doc;
}
const elements = (node, name) => Array.from(node.getElementsByTagNameNS('*', name));
function inlineText(node) {
  if (node.nodeType !== 1) return '';
  if (node.localName === 't') return node.textContent;
  if (node.localName === 'tab') return '\t';
  if (node.localName === 'br' || node.localName === 'cr') return '\n';
  return Array.from(node.childNodes).map(inlineText).join('');
}
function structuredText(node) {
  const parts = [];
  for (const child of Array.from(node.childNodes || [])) {
    if (child.nodeType !== 1) continue;
    if (child.localName === 'p') parts.push(inlineText(child));
    else if (child.localName === 'tbl') {
      const rows = Array.from(child.childNodes).filter(row => row.localName === 'tr');
      for (const row of rows) {
        const cells = Array.from(row.childNodes).filter(cell => cell.localName === 'tc');
        parts.push(cells.map(cell => elements(cell, 'p').map(inlineText).join(' / ')).join('\t'));
      }
    } else parts.push(...structuredText(child));
  }
  return parts.filter(text => text.trim());
}
async function extractDocument(buffer, fileName) {
  const type = await validateDocument(buffer, fileName);
  let sections = [];
  if (type === 'pdf') {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      sections = result.pages.map(page => ({ kind: 'page', number: page.num, text: page.text.trim() }));
    } finally { await parser.destroy(); }
  } else {
    const zip = await JSZip.loadAsync(buffer);
    const budget = { bytes: 0 };
    if (type === 'docx') {
      const doc = await readXml(zip, 'word/document.xml', budget);
      sections = structuredText(doc.documentElement).map((text, i) => ({ kind: 'paragraph', number: i + 1, text }));
    } else if (type === 'xlsx') {
      sections = await require('./excelParser').extractExcel(zip, readXml, budget, invalid);
    } else {
      const presentation = await readXml(zip, 'ppt/presentation.xml', budget);
      const relations = await readXml(zip, 'ppt/_rels/presentation.xml.rels', budget);
      const targets = new Map(elements(relations, 'Relationship').filter(r => r.getAttribute('TargetMode') !== 'External').map(r => [r.getAttribute('Id'), r.getAttribute('Target')]));
      const slides = elements(presentation, 'sldId');
      for (let i = 0; i < slides.length; i++) {
        const relation = Array.from(slides[i].attributes).find(a => a.localName === 'id' && a.namespaceURI);
        const target = targets.get(relation?.value);
        const name = target?.startsWith('/') ? target.slice(1) : path.posix.normalize('ppt/' + target);
        if (!target || !/^ppt\/slides\/[^/]+\.xml$/.test(name)) throw invalid('슬라이드 참조가 올바르지 않습니다.');
        const slide = await readXml(zip, name, budget);
        sections.push({ kind: 'slide', number: i + 1, text: structuredText(slide.documentElement).join('\n') });
      }
    }
  }
  const labels = { page: '페이지', slide: '슬라이드', paragraph: '문단', sheet: '시트' };
  const text = sections.filter(s => s.text.trim()).map(s => '[' + labels[s.kind] + ' ' + s.number + ']\n' + s.text).join('\n\n');
  if (text.length > 800000) throw invalid('추출 본문이 80만 자를 초과합니다. 문서를 나눠 업로드하세요.');
  return { text, sections };
}
async function extractTextFromBuffer(buffer, fileName) { return (await extractDocument(buffer, fileName)).text; }
module.exports = { validateDocument, extractDocument, extractTextFromBuffer, MIME_TYPES, MAX_FILE_SIZE };
