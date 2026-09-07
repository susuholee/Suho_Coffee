import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  FileText, 
  UploadCloud, 
  FileCheck, 
  FileCode, 
  Send, 
  Bell, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Search,
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

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [autoNotice, setAutoNotice] = useState(true);
  const [notifyNotion, setNotifyNotion] = useState(true); // 노션 기본 활성화
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // 1. 문서 목록 패칭 (React Query)
  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await axios.get('/api/documents');
      return res.data.documents || [];
    },
  });

  // 2. 파일 업로드 및 텍스트 파싱 Mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await axios.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      alert(`🎉 문서 등록 및 노션 연동 완료!\n${data.message}`);
      queryClient.invalidateQueries(['documents']);
      // 입력 초기화
      setSelectedFile(null);
      setTitle('');
    },
    onError: (err) => {
      alert(err.response?.data?.message || '문서 업로드 처리 중 오류가 발생했습니다.');
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('업로드할 파일을 선택해 주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title || selectedFile.name);
    formData.append('autoNotice', autoNotice);
    formData.append('notifyNotion', notifyNotion);

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Container>
      <HeaderSection>
        <TitleGroup>
          <PageTitle>
            <FileText size={24} color="#D97706" /> 스마트 문서 관리 및 공지 자동화
          </PageTitle>
          <PageSubtitle>
            사내 매뉴얼, 공지문(PDF, Word, PPT)을 업로드하면 텍스트가 자동 추출·적재되며 사내 공지 및 Discord/Notion 채널로 즉시 전송됩니다.
          </PageSubtitle>
        </TitleGroup>

        <button 
          onClick={() => refetch()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: '#FFFFFF',
            border: '1px solid #E6DFD5',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#6E6763',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} /> 새로고침
        </button>
      </HeaderSection>

      {/* 상단 2열 그리드: 파일 업로더 & 공지 연동 옵션 */}
      <TopGrid>
        {/* 파일 드래그앤드롭 카드 */}
        <Card>
          <CardTitle>
            <UploadCloud size={18} color="#D97706" /> 문서 파일 업로드 (Multer 연동)
          </CardTitle>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf,.docx,.doc,.pptx,.ppt,image/*" 
            style={{ display: 'none' }} 
          />

          {!selectedFile ? (
            <DropZone 
              $isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <DropIconWrap>
                <UploadCloud size={28} />
              </DropIconWrap>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#262220' }}>
                  클릭하거나 파일을 이곳에 끌어다 놓으세요
                </div>
                <div style={{ fontSize: '12px', color: '#6E6763', marginTop: '4px' }}>
                  지원 포맷: PDF, Word(.docx), PPT(.pptx), 이미지 (최대 50MB)
                </div>
              </div>
            </DropZone>
          ) : (
            <SelectedFileCard>
              <SelectedFileInfo>
                <FileCheck size={24} color="#10B981" />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6E6763' }}>
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              </SelectedFileInfo>
              <button 
                type="button" 
                onClick={() => setSelectedFile(null)}
                style={{ color: '#EF4444', padding: '6px', cursor: 'pointer' }}
                title="파일 제거"
              >
                <X size={18} />
              </button>
            </SelectedFileCard>
          )}

          <div style={{ fontSize: '12px', color: '#6E6763', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#D97706" />
            업로드된 문서는 서버에서 즉시 본문 텍스트가 파싱되어 AI RAG 지식 베이스로 연결됩니다.
          </div>
        </Card>

        {/* 메타데이터 및 공지 자동화 옵션 카드 */}
        <Card>
          <CardTitle>
            <Bell size={18} color="#D97706" /> 공지사항 & 외부 채널 푸시 설정
          </CardTitle>

          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="docTitle">문서 제목</Label>
              <StyledInput
                id="docTitle"
                type="text"
                placeholder="예: 2026 수호카페 가맹점 운영 매뉴얼"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </FormGroup>

            <CheckboxOptionGroup>
              <CheckboxLabel>
                <input 
                  type="checkbox" 
                  checked={autoNotice} 
                  onChange={(e) => setAutoNotice(e.target.checked)} 
                />
                사내 공지사항(Notices)으로 자동 등록
              </CheckboxLabel>

              <CheckboxLabel>
                <input 
                  type="checkbox" 
                  checked={notifyNotion} 
                  onChange={(e) => setNotifyNotion(e.target.checked)} 
                />
                <strong>노션(Notion) 사내 데이터베이스 페이지 자동 생성</strong>
              </CheckboxLabel>
            </CheckboxOptionGroup>

            <SubmitButton type="submit" disabled={uploadMutation.isPending || !selectedFile}>
              {uploadMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  파일 파싱 및 공지 등록 중...
                </>
              ) : (
                <>
                  <Send size={16} />
                  문서 업로드 및 자동화 실행
                </>
              )}
            </SubmitButton>
          </Form>
        </Card>
      </TopGrid>

      {/* 하단: 업로드된 사내 문서 목록 */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E6DFD5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CardTitle style={{ margin: 0 }}>
            <FileCode size={18} color="#D97706" /> 등록된 사내 문서 목록 ({documents.length}건)
          </CardTitle>
        </div>

        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>문서 제목 / 원본 파일명</Th>
                <Th>포맷</Th>
                <Th>파일 크기</Th>
                <Th>등록 일시</Th>
                <Th>외부 알림</Th>
                <Th style={{ textAlign: 'right' }}>추출된 텍스트</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <Td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    문서 목록 로딩 중...
                  </Td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <Td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: '#A09893' }}>
                    <AlertCircle size={36} style={{ marginBottom: '8px' }} />
                    <div>아직 등록된 문서가 없습니다. 첫 문서를 업로드해 보세요!</div>
                  </Td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <Tr key={doc.id}>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{doc.title}</div>
                      <div style={{ fontSize: '12px', color: '#6E6763' }}>{doc.file_name}</div>
                    </Td>

                    <Td>
                      <FileTypeBadge $type={doc.file_type}>
                        {doc.file_type}
                      </FileTypeBadge>
                    </Td>

                    <Td style={{ fontSize: '13px', color: '#6E6763' }}>
                      {formatFileSize(doc.file_size)}
                    </Td>

                    <Td style={{ fontSize: '13px', color: '#6E6763' }}>
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                    </Td>

                    <Td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {doc.notion_notified ? (
                          <a 
                            href={doc.notion_page_url || '#'} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px', 
                              padding: '3px 8px', 
                              background: '#F4F4F5', 
                              color: '#18181B', 
                              borderRadius: '4px', 
                              fontWeight: 700,
                              border: '1px solid #E4E4E7'
                            }}
                          >
                            <span>📝 Notion 연동</span>
                          </a>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#A09893' }}>미연동</span>
                        )}
                      </div>
                    </Td>

                    <Td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: '#F1EDE6',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#4A2C2A',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={14} /> 텍스트 보기
                      </button>
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrapper>
      </Card>

      {/* 추출된 텍스트 미리보기 모달 */}
      {previewDoc && (
        <TextPreviewModalOverlay onClick={() => setPreviewDoc(null)}>
          <TextPreviewModalBox onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#262220' }}>
                  {previewDoc.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#6E6763', marginTop: '2px' }}>
                  파싱된 원문 텍스트 (AI RAG 임베딩 대상 데이터)
                </div>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                style={{ color: '#6E6763', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <TextContentBox>
              {previewDoc.extracted_text || '추출된 본문 텍스트가 없습니다.'}
            </TextContentBox>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  padding: '8px 18px',
                  background: '#4A2C2A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </TextPreviewModalBox>
        </TextPreviewModalOverlay>
      )}
    </Container>
  );
}
