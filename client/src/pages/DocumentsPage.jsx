import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  FileText, 
  UploadCloud, 
  FileCheck, 
  FileCode, 
  Send, 
  Eye, 
  Loader2, 
  RefreshCw,
  Download,
  Sparkles,
  X
} from 'lucide-react';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
  }
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PageSubtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const TopGrid = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const CardTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DropZone = styled.div`
  border: 2px dashed ${({ $isDragging, theme }) => 
    $isDragging ? theme.colors.accent : theme.colors.border};
  background-color: ${({ $isDragging, theme }) => 
    $isDragging ? theme.colors.accentLight : theme.colors.surfaceSubtle};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
    background-color: ${({ theme }) => theme.colors.accentLight};
  }
`;

const DropIconWrap = styled.div`
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.accent};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const SelectedFileCard = styled.div`
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SelectedFileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const StyledInput = styled.input`
  width: 100%;
  height: 42px;
  padding: 0 14px;
  font-size: 14px;
  background-color: ${({ theme }) => theme.colors.surface};
`;

const CheckboxOptionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  padding: 14px;
  border-radius: ${({ theme }) => theme.radii.md};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    accent-color: ${({ theme }) => theme.colors.accent};
    cursor: pointer;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  height: 46px;
  background-color: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textWhite};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.accentHover};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
`;

const Th = styled.th`
  padding: 14px 20px;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Td = styled.td`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textPrimary};
  vertical-align: middle;
`;

const Tr = styled.tr`
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: #FAF8F5;
  }

  &:last-child td {
    border-bottom: none;
  }
`;

const FileTypeBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  background-color: ${({ $type }) => {
    if ($type === 'pdf') return '#FEE2E2';
    if ($type === 'docx' || $type === 'doc') return '#DBEAFE';
    if ($type === 'pptx' || $type === 'ppt') return '#FEF3C7';
    return '#E0E7FF';
  }};
  color: ${({ $type }) => {
    if ($type === 'pdf') return '#DC2626';
    if ($type === 'docx' || $type === 'doc') return '#1D4ED8';
    if ($type === 'pptx' || $type === 'ppt') return '#D97706';
    return '#4338CA';
  }};
`;

const TextPreviewModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(38, 34, 32, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 20px;
`;

const TextPreviewModalBox = styled.div`
  width: 100%;
  max-width: 680px;
  max-height: 80vh;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 28px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const TextContentBox = styled.div`
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 18px;
  font-size: 13px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: pre-wrap;
  overflow-y: auto;
  max-height: 400px;
  font-family: monospace;
`;

const STATUS_LABELS = {
  queued: '처리 대기', extracting: '본문 추출 중', summarizing: 'AI 요약 중',
  completed: '요약 완료', failed: '처리 실패', needs_ocr: 'OCR 필요', legacy: '기존 문서',
};
const isProcessing = doc => ['queued', 'extracting', 'summarizing'].includes(doc?.status);
const errorMessage = error => error?.response?.data?.message || error?.message || '요청을 처리하지 못했습니다.';
const formatFileSize = bytes => bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + ' MB' : Math.ceil((bytes || 0) / 1024) + ' KB';

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [fileError, setFileError] = useState('');

  const { data: documents = [], isLoading, error: listError, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await axios.get('/api/documents')).data.documents || [],
    refetchInterval: query => query.state.data?.some(isProcessing) ? 2000 : false,
  });
  const { data: previewDoc, error: previewError, isLoading: previewLoading } = useQuery({
    queryKey: ['document', selectedId],
    queryFn: async () => (await axios.get('/api/documents/' + selectedId)).data.document,
    enabled: Boolean(selectedId),
    refetchInterval: query => isProcessing(query.state.data) ? 2000 : false,
  });
  useEffect(() => {
    if (!selectedId) return;
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    return () => previousFocus?.focus?.();
  }, [selectedId]);

  const uploadMutation = useMutation({
    mutationFn: async formData => (await axios.post('/api/documents/upload', formData)).data,
    onSuccess: data => {
      setMessage(data.message);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelectedFile(null);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: error => setFileError(errorMessage(error)),
  });
  const retryMutation = useMutation({
    mutationFn: async id => (await axios.post('/api/documents/' + id + '/retry')).data,
    onSuccess: data => {
      setMessage(data.message);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', data.document.id] });
    },
    onError: error => setFileError(errorMessage(error)),
  });
  function chooseFile(file) {
    if (!file || uploadMutation.isPending) return;
    setFileError('');
    setMessage('');
    if (!/\.(pdf|docx|pptx)$/i.test(file.name)) {
      setFileError('PDF, DOCX, PPTX 파일만 지원합니다.');
      return;
    }
    if (!file.size || file.size > 50 * 1024 * 1024) {
      setFileError('빈 파일 또는 50MB를 초과한 파일은 업로드할 수 없습니다.');
      return;
    }
    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 255));
  }
  function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || uploadMutation.isPending) return;
    setFileError('');
    setMessage('');
    const form = new FormData();
    form.append('file', selectedFile);
    form.append('title', title.trim() || selectedFile.name);
    uploadMutation.mutate(form);
  }
  function dialogKeys(event) {
    if (event.key === 'Escape') setSelectedId(null);
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialogRef.current.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]'));
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  }
  return (
    <Container>
      <HeaderSection>
        <TitleGroup>
          <PageTitle><FileText size={24} color="#D97706" /> 문서 업로드 및 AI 요약</PageTitle>
          <PageSubtitle>PDF·Word·PPT의 본문을 추출하고 핵심 내용, 대상, 기한과 할 일을 정리합니다.</PageSubtitle>
        </TitleGroup>
        <button onClick={() => refetch()} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: 10 }}>
          <RefreshCw size={16} /> 새로고침
        </button>
      </HeaderSection>
      {message && <div role="status" style={{ color: '#166534' }}>{message}</div>}
      {fileError && <div role="alert" style={{ color: '#B91C1C' }}>{fileError}</div>}
      <TopGrid>
        <Card>
          <CardTitle><UploadCloud size={18} /> 문서 파일 업로드</CardTitle>
          <input type="file" aria-label="문서 파일 선택" ref={fileInputRef} accept=".pdf,.docx,.pptx"
            onChange={event => chooseFile(event.target.files?.[0])} disabled={uploadMutation.isPending} style={{ display: 'none' }} />
          <DropZone $isDragging={isDragging} role="button" tabIndex={0} aria-label="문서 파일 찾아보기"
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInputRef.current?.click(); } }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={event => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={event => { event.preventDefault(); setIsDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}>
            <DropIconWrap><UploadCloud size={28} /></DropIconWrap>
            <strong>클릭하거나 파일을 이곳에 끌어다 놓으세요</strong>
            <span style={{ fontSize: 13 }}>PDF, Word(.docx), PPT(.pptx) · 최대 50MB</span>
          </DropZone>
          {selectedFile && <SelectedFileCard>
            <SelectedFileInfo><FileCheck size={22} /><div>{selectedFile.name}<br /><small>{formatFileSize(selectedFile.size)}</small></div></SelectedFileInfo>
            <button type="button" aria-label="선택 파일 제거" disabled={uploadMutation.isPending} onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}><X size={18} /></button>
          </SelectedFileCard>}
          <PageSubtitle>스캔본과 이미지 안의 글자는 OCR이 필요합니다. 현재는 텍스트가 포함된 문서를 지원합니다.</PageSubtitle>
        </Card>
        <Card>
          <CardTitle><Sparkles size={18} /> 핵심 내용 자동 정리</CardTitle>
          <PageSubtitle>파일 저장 후 분석을 시작합니다. 이 화면을 떠나도 서버에서 처리를 계속합니다.</PageSubtitle>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="docTitle">문서 제목</Label>
              <StyledInput id="docTitle" maxLength={255} value={title} onChange={event => setTitle(event.target.value)}
                disabled={uploadMutation.isPending} placeholder="예: 하반기 직원 교육 안내" required />
            </FormGroup>
            <SubmitButton type="submit" disabled={uploadMutation.isPending || !selectedFile}>
              {uploadMutation.isPending ? <><Loader2 size={16} /> 파일 저장 중...</> : <><Send size={16} /> 업로드 및 요약 시작</>}
            </SubmitButton>
          </Form>
          <PageSubtitle>문서에 없는 대상·기한은 미기재로 표시합니다. 중요한 날짜와 금액은 원문과 함께 확인하세요.</PageSubtitle>
        </Card>
      </TopGrid>
      <Card>
        <CardTitle><FileCode size={18} /> 등록된 문서 ({documents.length}건)</CardTitle>
        {listError ? <div role="alert">{errorMessage(listError)} <button onClick={() => refetch()}>다시 불러오기</button></div> :
          <TableWrapper><Table>
            <thead><tr><Th>문서 제목 / 파일명</Th><Th>포맷·크기</Th><Th>처리 상태</Th><Th>등록 일시</Th><Th>문서 확인</Th></tr></thead>
            <tbody>
              {isLoading ? <tr><Td colSpan={5}>문서 목록을 불러오는 중...</Td></tr> : documents.length === 0 ?
                <tr><Td colSpan={5}>아직 등록된 문서가 없습니다. 첫 문서를 업로드해 보세요.</Td></tr> :
                documents.map(doc => <Tr key={doc.id}>
                  <Td><strong>{doc.title}</strong><div style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{doc.file_name}</div></Td>
                  <Td><FileTypeBadge $type={doc.file_type}>{doc.file_type}</FileTypeBadge><div>{formatFileSize(doc.file_size)}</div></Td>
                  <Td>
                    <strong style={{ color: doc.status === 'failed' ? '#B91C1C' : doc.status === 'completed' ? '#166534' : '#6E6763' }}>
                      {STATUS_LABELS[doc.status || 'legacy'] || doc.status}
                    </strong>
                    {isProcessing(doc) && <div style={{ fontSize: 12 }}>문서를 분석하고 있어요</div>}
                    {doc.error_message && <div style={{ fontSize: 12, maxWidth: 280 }}>{doc.error_message}</div>}
                    {doc.status === 'failed' && doc.has_original && <button disabled={retryMutation.isPending} onClick={() => retryMutation.mutate(doc.id)} style={{ marginTop: 8 }}>다시 시도</button>}
                  </Td>
                  <Td>{doc.created_at ? new Date(doc.created_at).toLocaleString('ko-KR') : '-'}</Td>
                  <Td>
                    <button aria-label={doc.title + ' 요약·원문 보기'} onClick={() => setSelectedId(doc.id)} style={{ display: 'flex', gap: 6, padding: 8 }}><Eye size={16} /> 요약·원문</button>
                    {doc.has_original && <a href={'/api/documents/' + doc.id + '/download'} style={{ display: 'flex', gap: 6, padding: 8 }}><Download size={16} /> 원본 다운로드</a>}
                  </Td>
                </Tr>)}
            </tbody>
          </Table></TableWrapper>}
      </Card>
      {selectedId && <TextPreviewModalOverlay onClick={() => setSelectedId(null)}>
        <TextPreviewModalBox ref={dialogRef} role="dialog" aria-modal="true" aria-label="문서 요약 및 원문" tabIndex={-1}
          onKeyDown={dialogKeys} onClick={event => event.stopPropagation()} style={{ overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <h2>{previewDoc?.title || '문서 상세'}</h2>
            <button aria-label="문서 상세 닫기" onClick={() => setSelectedId(null)}><X size={22} /></button>
          </div>
          {previewLoading && <p>문서를 불러오는 중...</p>}
          {previewError && <p role="alert">{errorMessage(previewError)}</p>}
          {previewDoc && <>
            <p role="status">{STATUS_LABELS[previewDoc.status || 'legacy'] || previewDoc.status}</p>
            {previewDoc.error_message && <p role="alert">{previewDoc.error_message}</p>}
            {previewDoc.summary ? <section aria-label="AI 요약">
              <h3>{previewDoc.summary.title}</h3>
              <p style={{ whiteSpace: 'pre-wrap', margin: '12px 0', lineHeight: 1.7 }}>{previewDoc.summary.summary}</p>
              <h4>핵심 내용</h4>
              {previewDoc.summary.key_points.length ? <ul style={{ paddingLeft: 22, margin: '10px 0' }}>{previewDoc.summary.key_points.map((point, i) => <li key={i}>{point}</li>)}</ul> : <p>별도 항목 없음</p>}
              <p>대상: {previewDoc.summary.target_audience ?? '미기재'}</p>
              <p>기한: {previewDoc.summary.deadline ?? '미기재'}</p>
              <h4 style={{ marginTop: 12 }}>할 일</h4>
              {previewDoc.summary.action_items.length ? <ul style={{ paddingLeft: 22, margin: '10px 0' }}>{previewDoc.summary.action_items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>별도 항목 없음</p>}
              <details style={{ marginTop: 12 }}><summary>요약 JSON 보기</summary><TextContentBox>{JSON.stringify(previewDoc.summary, null, 2)}</TextContentBox></details>
            </section> : <p>{isProcessing(previewDoc) ? '요약을 준비하고 있습니다. 완료되면 자동으로 표시됩니다.' : '생성된 AI 요약이 없습니다.'}</p>}
            <details open={!previewDoc.summary}>
              <summary>추출 원문과 출처 보기</summary>
              <TextContentBox style={{ marginTop: 12 }}>{previewDoc.extracted_text || '추출된 본문이 없습니다.'}</TextContentBox>
            </details>
            {previewDoc.has_original && <a href={'/api/documents/' + previewDoc.id + '/download'}>원본 다운로드</a>}
          </>}
        </TextPreviewModalBox>
      </TextPreviewModalOverlay>}
    </Container>
  );
}
