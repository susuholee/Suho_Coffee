const path = require('path');
const SSF = require('ssf');
const elements = (node, name) => Array.from(node.getElementsByTagNameNS('*', name));
const children = (node, name) => Array.from(node?.childNodes || []).filter(n => n.nodeType === 1 && n.localName === name);
const richText = node => elements(node, 't').filter(n => n.parentNode?.localName !== 'rPh').map(n => n.textContent).join('');

// Read SpreadsheetML data only: never execute formulas, macros or external links.
async function extractExcel(zip, readXml, budget, invalid) {
  const workbook = await readXml(zip, 'xl/workbook.xml', budget);
  const relations = await readXml(zip, 'xl/_rels/workbook.xml.rels', budget);
  const refs = elements(relations, 'Relationship');
  const targetPath = relation => {
    if (!relation || relation.getAttribute('TargetMode') === 'External') throw invalid('외부 엑셀 참조는 읽을 수 없습니다.');
    const target = relation.getAttribute('Target');
    const name = path.posix.normalize(target.startsWith('/') ? target.slice(1) : 'xl/' + target);
    if (!name.startsWith('xl/') || name.includes('\\')) throw invalid('엑셀 내부 참조가 올바르지 않습니다.');
    return name;
  };
  const part = suffix => refs.find(r => r.getAttribute('Type').endsWith('/' + suffix));
  const stringsPart = part('sharedStrings');
  const strings = stringsPart ? elements(await readXml(zip, targetPath(stringsPart), budget), 'si').map(richText) : [];
  const formats = { ...SSF.get_table() };
  let styles = [];
  if (part('styles')) {
    const doc = await readXml(zip, targetPath(part('styles')), budget);
    for (const format of elements(doc, 'numFmt')) formats[format.getAttribute('numFmtId')] = format.getAttribute('formatCode');
    styles = children(elements(doc, 'cellXfs')[0], 'xf').map(xf => Number(xf.getAttribute('numFmtId') || 0));
  }
  const date1904 = ['1', 'true'].includes(elements(workbook, 'workbookPr')[0]?.getAttribute('date1904'));
  const sheets = elements(workbook, 'sheet');
  if (sheets.length > 20) throw invalid('엑셀은 최대 20개 시트까지 지원합니다. 파일을 나눠 업로드하세요.');
  const skipped = sheets.filter(s => ['hidden', 'veryHidden'].includes(s.getAttribute('state'))).length;
  const sections = [];
  let totalCells = 0, totalText = 0;
  for (let index = 0; index < sheets.length; index++) {
    const sheet = sheets[index];
    if (['hidden', 'veryHidden'].includes(sheet.getAttribute('state'))) continue;
    const name = sheet.getAttribute('name');
    const relationId = Array.from(sheet.attributes).find(a => a.localName === 'id' && a.namespaceURI)?.value;
    const relation = refs.find(r => r.getAttribute('Id') === relationId);
    if (!relation?.getAttribute('Type').endsWith('/worksheet')) throw invalid('일반 워크시트만 지원합니다. 차트 시트는 제거 후 업로드하세요.');
    const doc = await readXml(zip, targetPath(relation), budget);
    const warnings = new Set();
    if (skipped) warnings.add(`숨김 시트 ${skipped}개는 요약에서 제외했습니다.`);
    if (elements(doc, 'col').some(c => ['1', 'true'].includes(c.getAttribute('hidden')))) warnings.add('숨김 열의 셀 데이터도 포함했습니다.');
    const lines = [];
    let rowCount = 0, formulaCount = 0;
    for (const row of elements(doc, 'row')) {
      const rowNumber = Number(row.getAttribute('r') || rowCount + 1);
      if (++rowCount > 10000 || rowNumber > 10000) throw invalid('시트당 10,000행까지 지원합니다. 파일을 나눠 업로드하세요.');
      const cells = [];
      let columnIndex = 0;
      for (const cell of children(row, 'c')) {
        if (++totalCells > 100000) throw invalid('엑셀은 전체 100,000셀까지 지원합니다. 파일을 나눠 업로드하세요.');
        const reference = cell.getAttribute('r');
        const column = /^([A-Z]+)[1-9][0-9]*$/.exec(reference)?.[1];
        if (!column) throw invalid('셀 주소가 올바르지 않습니다. Excel에서 다시 저장해 주세요.');
        columnIndex = Array.from(column).reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0);
        if (columnIndex > 256) throw invalid('시트당 256열까지 지원합니다. 파일을 나눠 업로드하세요.');
        const type = cell.getAttribute('t');
        const raw = children(cell, 'v')[0]?.textContent;
        const formula = children(cell, 'f')[0];
        let value = '';
        if (formula) {
          formulaCount++;
          warnings.add('수식은 재계산하지 않고 파일에 저장된 결과를 사용합니다. 최신 값인지 원본에서 확인하세요.');
        }
        if (formula && (raw == null || (raw === '' && type !== 'str'))) {
          value = '[수식 계산 결과 없음]';
          warnings.add('계산 결과가 없는 수식이 있습니다. Excel에서 재계산·저장한 뒤 업로드하세요.');
        } else if (type === 'inlineStr') value = richText(cell);
        else if (type === 's') {
          if (!/^\d+$/.test(raw || '') || strings[Number(raw)] === undefined) throw invalid('엑셀 문자열 참조가 손상되었습니다.');
          value = strings[Number(raw)];
        } else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE';
        else if (type === 'e') { value = '[셀 오류: ' + raw + ']'; warnings.add('오류 셀은 유효한 수치로 해석하지 않습니다.'); }
        else if (type === 'str' || type === 'd') value = raw || '';
        else if (raw != null && raw !== '') {
          const formatId = styles[Number(cell.getAttribute('s') || 0)] || 0;
          const format = formats[formatId];
          try {
            if (format === undefined || !Number.isFinite(Number(raw))) throw new Error('Unsupported format');
            value = formatId === 0 ? raw : SSF.format(format, Number(raw), { date1904 });
            if (!value) value = raw;
          } catch {
            value = raw + ' [표시 형식 확인 필요]';
            warnings.add('지원되지 않는 표시 형식은 원시 값으로 표시했습니다. 날짜·단위를 원본에서 확인하세요.');
          }
        }
        if (value !== '') cells.push(reference + '=' + JSON.stringify(value));
      }
      if (cells.length) lines.push(`행 ${rowNumber}${row.getAttribute('hidden') === '1' ? ' (숨김 행 포함)' : ''}: ${cells.join(' | ')}`);
    }
    const merges = elements(doc, 'mergeCell').map(cell => cell.getAttribute('ref'));
    if (merges.length) warnings.add('병합 셀은 왼쪽 위 셀의 값만 기록합니다. 빈 셀을 0으로 해석하지 마세요.');
    let text = lines.join('\n');
    if (text) text = `시트명: ${JSON.stringify(name)}\n${Array.from(warnings).map(w => '주의: ' + w).join('\n')}\n${merges.length ? '병합 범위: ' + merges.join(', ') + '\n' : ''}${text}`;
    totalText += text.length;
    if (totalText > 800000) throw invalid('추출 본문이 80만 자를 초과합니다. 파일을 나눠 업로드하세요.');
    sections.push({ kind: 'sheet', number: index + 1, name, text, row_count: rowCount, formula_count: formulaCount, warnings: Array.from(warnings) });
  }
  if (!sections.some(s => s.text.trim())) throw invalid('요약할 셀 데이터가 없습니다. 숨김 시트는 제외하며 이미지·차트만 있는 엑셀은 지원하지 않습니다.');
  return sections;
}
module.exports = { extractExcel };
