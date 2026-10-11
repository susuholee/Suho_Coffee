import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import EndChatDialog from './EndChatDialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus, Send, FileText, Sparkles, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';

const Shell = styled.section`
  display: grid; grid-template-columns: ${({ $compact }) => $compact ? '1fr' : '260px minmax(0, 1fr)'};
  height: ${({ $compact }) => $compact ? '100%' : 'calc(100dvh - 160px)'}; min-height: 400px;
  background: #fff; border: 1px solid #e6dfd5; border-radius: 20px; overflow: hidden;
  @media(max-width: 850px) { grid-template-columns: 1fr; height: ${({ $compact }) => $compact ? '100%' : 'calc(100dvh - 120px)'}; }
`;
const Sidebar = styled.aside`
  display: flex; flex-direction: column; min-height: 0; background: #faf8f5; border-right: 1px solid #e6dfd5; padding: 18px; gap: 14px;
  @media(max-width: 850px) { display: none; }
`;
const Button = styled.button`
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 12px; border: 1px solid #e6dfd5; border-radius: 10px; background: #fff; color: #4a2c2a; cursor: pointer; font-size: 12px;
  &:hover:not(:disabled) { background: #f1ede6; } &:disabled { opacity: .5; cursor: not-allowed; }
`;
const SessionButton = styled.button`
  width: 100%; text-align: left; padding: 13px; border-radius: 12px; background: ${({ $active }) => $active ? '#eee4d7' : 'transparent'};
  color: #332b27; cursor: pointer; border: 1px solid ${({ $active }) => $active ? '#dbc9b3' : 'transparent'};
  strong { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; }
  small { display: block; margin-top: 7px; color: #81736a; }
`;
const Main = styled.div`display: flex; flex-direction: column; min-height: 0; min-width: 0;`;
const Header = styled.header`
  padding: 16px 20px; border-bottom: 1px solid #eee7dd; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  h2 { margin: 0; font-size: 17px; } small { color: #81736a; }
`;
const Avatar = styled.div`width: 38px; height: 38px; border-radius: 13px; color: #fff; background: #4a2c2a; display: grid; place-items: center; flex-shrink: 0;`;
const Scroll = styled.div`flex: 1; min-height: 0; overflow-y: auto; padding: 20px; background: #fdfbf8;`;
const Row = styled.div`display: flex; justify-content: ${({ $user }) => $user ? 'flex-end' : 'flex-start'}; margin: 16px 0;`;
const Bubble = styled.div`
  max-width: 90%; padding: 13px 16px; border-radius: 16px; line-height: 1.7; font-size: 14px; overflow-wrap: anywhere;
  background: ${({ $user }) => $user ? '#4a2c2a' : '#fff'}; color: ${({ $user }) => $user ? '#fff' : '#332b27'};
  border: 1px solid ${({ $user }) => $user ? '#4a2c2a' : '#e9e1d7'};
`;
const InputForm = styled.form`
  padding: 14px 18px; border-top: 1px solid #eee7dd; display: flex; gap: 10px; background: #fff;
  textarea { flex: 1; min-width: 0; border: 1px solid #ddd3c6; border-radius: 12px; resize: none; padding: 12px; font: inherit; line-height: 1.5; }
`;
const Notice = styled.div`padding: 10px 16px; font-size: 13px; line-height: 1.5; background: #fff4df; color: #854d0e;`;
const Summary = styled.section`
  background: #f1f6ee; padding: 18px; border: 1px solid #d7e5d0; border-radius: 14px; margin: 12px 0;
  h3 { font-size: 15px; margin-bottom: 12px; } h4 { margin: 12px 0 5px; font-size: 13px; } p { white-space: pre-wrap; font-size: 13px; line-height: 1.65; }
`;
const MobileSessions = styled.select`
  max-width: 100%; padding: 8px; border: 1px solid #e6dfd5; border-radius: 8px;
  display: ${({ $compact }) => $compact ? 'block' : 'none'};
  @media(max-width: 850px) { display: block; }
`;
const messageOf = error => error?.response?.data?.message || error.message || '요청에 실패했습니다.';
const locationLabel = source => `${({ page: '페이지', slide: '슬라이드', sheet: '시트', paragraph: '문단' })[source.kind] || '본문'} ${source.name || source.number || ''}`;

async function streamAnswer(id, payload, onEvent, signal) {
  const response = await fetch(`/api/chat/sessions/${id}/messages`, { method: 'POST', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, stream: true }) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '답변을 요청하지 못했습니다.');
  }
  if (!response.body) throw new Error('이 브라우저에서 실시간 응답을 읽을 수 없습니다.');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', doneEvent = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let split;
      while ((split = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, split); buffer = buffer.slice(split + 2);
        const event = block.split('\n').find(line => line.startsWith('event: '))?.slice(7);
        const raw = block.split('\n').filter(line => line.startsWith('data: ')).map(line => line.slice(6)).join('\n');
        if (!event || !raw) continue;
        const data = JSON.parse(raw);
        if (event === 'error') throw new Error(data.message);
        if (event === 'done') doneEvent = true;
        onEvent(event, data);
      }
      if (done) break;
    }
    if (!doneEvent) throw new Error('연결이 끊겼습니다. 기록을 확인한 뒤 다시 시도하세요.');
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export default function ChatPanel({ compact = false }) {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState(null), [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false), [draft, setDraft] = useState('');
  const [error, setError] = useState(''), [retry, setRetry] = useState(null);
  const [showSummary, setShowSummary] = useState(false), [showKnowledge, setShowKnowledge] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const endRef = useRef(null), abortRef = useRef(null), sendingRef = useRef(false);
  const { data: viewer, isFetching: loadingViewer, error: viewerError } = useQuery({ queryKey: ['chatViewer'], queryFn: async () => (await axios.get('/api/auth/me')).data.user, staleTime: 0 });
  const owner = viewer?.id;
  const listKey = ['chatSessions', owner];
  const { data: sessions = [], error: listError, isLoading: loadingSessions } = useQuery({ queryKey: listKey,
    queryFn: async () => (await axios.get('/api/chat/sessions')).data.sessions, enabled: Boolean(owner) && !loadingViewer });
  const { data: session, error: sessionError, isLoading: loadingSession } = useQuery({ queryKey: ['chatSession', owner, selectedId],
    queryFn: async () => (await axios.get('/api/chat/sessions/' + selectedId)).data.session, enabled: Boolean(owner && selectedId) && !loadingViewer, refetchInterval: streaming ? false : 10000 });
  const { data: knowledgeData, error: knowledgeError } = useQuery({ queryKey: ['chatKnowledge', owner],
    queryFn: async () => (await axios.get('/api/chat/knowledge')).data, enabled: Boolean(owner) && !loadingViewer, refetchInterval: 10000 });
  useEffect(() => { setSelectedId(null); setError(''); setRetry(null); }, [owner]);
  useEffect(() => { if (!selectedId && sessions.length) setSelectedId(sessions[0].id); }, [sessions, selectedId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [session?.messages, draft, showSummary]);
  useEffect(() => () => abortRef.current?.abort(), []);
  const putSession = value => { client.setQueryData(['chatSession', owner, value.id], value); client.invalidateQueries({ queryKey: listKey }); };
  const create = useMutation({ mutationFn: async () => (await axios.post('/api/chat/sessions', {})).data.session,
    onSuccess: value => { putSession(value); setSelectedId(value.id); setShowSummary(false); setError(''); setRetry(null); }, onError: e => setError(messageOf(e)) });
  const summarize = useMutation({ mutationFn: async close => (await axios.post('/api/chat/sessions/' + selectedId + '/summarize', { close })).data.session,
    onSuccess: value => { putSession(value); setShowSummary(true); setError(''); }, onError: e => setError(messageOf(e)) });
  const remove = useMutation({ mutationFn: async id => axios.delete('/api/chat/sessions/' + id), onSuccess: (_, id) => {
    client.removeQueries({ queryKey: ['chatSession', owner, id] }); client.invalidateQueries({ queryKey: listKey }); setSelectedId(null); setRetry(null); setShowSummary(false);
  }, onError: e => setError(messageOf(e)) });
  const reindex = useMutation({ mutationFn: async () => axios.post('/api/chat/knowledge/reindex'),
    onSuccess: () => client.invalidateQueries({ queryKey: ['chatKnowledge', owner] }), onError: e => setError(messageOf(e)) });
  const busy = streaming || create.isPending || summarize.isPending || remove.isPending;
  const closed = session && session.status !== 'active';
  async function send(text, previousRequest) {
    if (!text.trim() || sendingRef.current || busy) return;
    sendingRef.current = true;
    setError(''); setDraft(''); setRetry(null); setShowSummary(false);
    let id = previousRequest?.id || selectedId;
    const requestId = previousRequest?.requestId || crypto.randomUUID();
    try {
      if (!id) id = (await create.mutateAsync()).id;
      setStreaming(true); setInput('');
      abortRef.current = new AbortController();
      await streamAnswer(id, { message: text.trim(), requestId }, (event, data) => {
        if (event === 'delta') setDraft(value => value + data.text);
        if (event === 'user' || event === 'done') putSession(data.session);
        if (event === 'done') setDraft('');
      }, abortRef.current.signal);
    } catch (e) {
      if (e.name !== 'AbortError') { setError(messageOf(e)); if (id) setRetry({ id, requestId, text: text.trim() }); else setInput(text); }
    } finally {
      setStreaming(false); setDraft(''); sendingRef.current = false;
      if (id) client.invalidateQueries({ queryKey: ['chatSession', owner, id] });
    }
  }
  if (viewerError) return <Notice role="alert">로그인이 필요합니다. <a href="/login">로그인하기</a></Notice>;
  if (loadingViewer || !viewer) return <Notice>상담을 준비하고 있습니다...</Notice>;
  const knowledge = knowledgeData?.knowledge;
  const ready = knowledge?.documents.filter(doc => doc.status === 'ready' && doc.model === knowledge.model).length || 0;
  const working = knowledge?.documents.some(doc => ['queued', 'indexing'].includes(doc.status));
  return <Shell $compact={compact} aria-label="수호봇 AI 상담">
    {!compact && <Sidebar>
      <strong>상담 기록</strong><Button onClick={() => create.mutate()} disabled={busy}><Plus size={15} /> 새 상담</Button>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loadingSessions && <p>기록을 불러오는 중...</p>}
        {!loadingSessions && !sessions.length && <small>첫 질문을 남겨 상담을 시작하세요.</small>}
        {sessions.map(item => <SessionButton key={item.id} $active={item.id === selectedId} disabled={busy} onClick={() => { setSelectedId(item.id); setError(''); setRetry(null); setShowSummary(false); }}>
          <strong>{item.title}</strong><small>{item.status === 'active' ? '상담 중' : '상담 종료'} · {new Date(item.created_at).toLocaleDateString('ko-KR')}{item.summary?.needsEscalation ? ' · 추가 확인' : ''}</small>
        </SessionButton>)}
      </div>
      <small>대화는 로그인한 계정에 저장됩니다. 관리자는 상담 기록을 확인할 수 있습니다.</small>
    </Sidebar>}
    <Main>
      <Header>
        <Avatar><Bot size={23} /></Avatar><div style={{ flex: 1 }}><h2>수호봇</h2><small>{streaming ? '답변 작성 중' : '커피 추천부터 사내 문서 안내까지'}</small></div>
        <Button aria-label="새 상담 시작" onClick={() => create.mutate()} disabled={busy}><Plus size={15} /> 새 상담</Button>
        <MobileSessions $compact={compact} aria-label="상담 선택" value={selectedId || ''} disabled={busy} onChange={e => { setSelectedId(e.target.value); setRetry(null); setError(''); setShowSummary(false); }}>
          <option value="" disabled>상담 기록 선택</option>{sessions.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </MobileSessions>
      </Header>
      {(error || listError || sessionError) && <Notice role="alert">{error || messageOf(listError || sessionError)} {retry && retry.id === selectedId && <Button disabled={busy} onClick={() => send(retry.text, retry)}>답변 다시 요청</Button>}</Notice>}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #eee7dd', fontSize: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setShowKnowledge(value => !value)} style={{ color: '#786455', textAlign: 'left' }}><FileText size={12} /> {knowledgeError ? '문서 검색 설정 필요' : working ? `문서 지식 준비 중 · ${ready}개 사용 가능` : `검색 가능한 문서 ${ready}개`}</button>
        {session && <>
          <Button disabled={busy || !session.messages.some(m => m.sender === 'user')} onClick={() => session.summary ? setShowSummary(value => !value) : summarize.mutate(false)}><Sparkles size={13} /> {summarize.isPending ? '요약 중...' : '대화 요약'}</Button>
          {!closed && <Button disabled={busy || !session.messages.some(m => m.sender === 'user')} onClick={() => setShowEndDialog(true)}>상담 종료</Button>}
          <Button aria-label="상담 삭제" disabled={busy} onClick={() => { if (window.confirm('이 상담 기록을 삭제할까요?')) remove.mutate(session.id); }}><Trash2 size={13} /></Button>
        </>}
      </div>
      {showKnowledge && <Notice>
        {knowledgeError ? messageOf(knowledgeError) : <>
          <p>커피 지식과 취향별 원두 추천을 안내합니다. 수호커피의 상품·가격·규정은 등록된 문서를 바탕으로 답변합니다.</p>
          <div style={{ maxHeight: 110, overflowY: 'auto' }}>{knowledge?.documents.map(doc => <p key={doc.document_id}>{doc.title} · {({ queued: '대기', indexing: '학습 중', ready: doc.model === knowledge.model ? '사용 가능' : '갱신 필요', failed: '실패' })[doc.status]}{doc.error_message ? ' — ' + doc.error_message : ''}</p>)}</div>
          {knowledgeData?.canManage && <Button disabled={reindex.isPending} onClick={() => reindex.mutate()}><RefreshCw size={12} /> 문서 지식 갱신·재시도</Button>}
        </>}
      </Notice>}
      <Scroll role="log" aria-label="상담 대화" aria-live="polite">
        {!session && !loadingSession && <div style={{ textAlign: 'center', padding: '35px 10px', color: '#6e6763' }}><Bot size={42} /><h3 style={{ margin: '16px 0' }}>무엇을 도와드릴까요?</h3><p>매뉴얼, FAQ, 운영 규정에 대해 물어보세요.</p>
          {['매장 오픈 준비 절차를 알려주세요.', '환불 규정을 알려주세요.', '머신 이상 시 조치 방법을 알려주세요.'].map(question => <Button key={question} disabled={busy} onClick={() => send(question)} style={{ margin: '8px 4px' }}>{question}</Button>)}
        </div>}
        {loadingSession && <p>상담 기록을 불러오는 중...</p>}
        {session?.messages.map(message => <Row key={message.id} $user={message.sender === 'user'}><Bubble $user={message.sender === 'user'}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
          {message.error && <div style={{ fontSize: 12 }}><p>답변을 완료하지 못했습니다.</p>
            {!closed && message.sender === 'user' && <Button disabled={busy} onClick={() => send(message.text, { id: session.id, requestId: message.id })}>이 질문 다시 요청</Button>}
          </div>}
          {message.source_docs?.length > 0 && <details style={{ marginTop: 10, fontSize: 12 }}><summary>참고 문서 {message.source_docs.length}곳</summary>
            {message.source_docs.map((source, i) => <details key={source.chunkId || i} style={{ marginTop: 8 }}><summary>[문서{source.sourceNumber || i + 1}] {source.title} · {locationLabel(source)}</summary>
              <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{source.excerpt}</p><a href={'/api/documents/' + source.id + '/download'}>원본 다운로드</a>
            </details>)}
          </details>}
          <small style={{ display: 'block', opacity: .65, marginTop: 6 }}>{new Date(message.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</small>
        </Bubble></Row>)}
        {streaming && <Row><Bubble><div style={{ whiteSpace: 'pre-wrap' }}>{draft || '관련 문서를 찾아보고 있어요…'}</div></Bubble></Row>}
        {(showSummary || closed) && session?.summary && <Summary aria-label="상담 요약">
          <h3><CheckCircle2 size={16} /> {closed ? '상담이 종료되었습니다' : '현재까지의 대화 요약'}</h3>
          <h4>핵심 문의</h4><p>{session.summary.inquiry}</p><h4>조치 사항</h4><p>{session.summary.actionTaken}</p>
          <h4>추가 확인 필요 여부 · {session.summary.needsEscalation ? '필요' : '없음'}</h4><p>{session.summary.followUp}</p>
        </Summary>}
        <div ref={endRef} />
      </Scroll>
      <InputForm onSubmit={e => { e.preventDefault(); send(input); }}>
        <textarea aria-label="질문 입력" rows={2} maxLength={4000} value={input} disabled={busy || Boolean(closed)}
          placeholder={closed ? '종료된 상담입니다. 새 상담을 시작해 주세요.' : '궁금한 점을 입력하세요. Enter로 전송'} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy && !closed) send(input); } }} />
        <Button type="submit" aria-label="질문 보내기" disabled={!input.trim() || busy || Boolean(closed)}><Send size={18} /></Button>
      </InputForm>
    </Main>
    {showEndDialog && <EndChatDialog onCancel={() => setShowEndDialog(false)} onConfirm={async () => {
      await summarize.mutateAsync(true);
      setShowEndDialog(false);
    }} />}
  </Shell>;
}
