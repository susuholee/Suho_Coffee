import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { MessageCircle, X } from 'lucide-react';

const Dialog = styled.dialog`
  width: min(420px, calc(100vw - 32px)); margin: auto; padding: 28px;
  border: 1px solid #e6dfd5; border-radius: 20px; background: #fff; color: #332b27;
  box-shadow: 0 24px 80px #30221e30;
  &::backdrop { background: #21171380; backdrop-filter: blur(3px); }
  h2 { margin: 18px 0 10px; font-size: 20px; font-weight: 700; }
  p { color: #81736a; font-size: 14px; line-height: 1.7; }
`;
const Action = styled.button`
  flex: 1; padding: 12px 16px; border-radius: 10px; font-size: 14px; font-weight: 600;
  border: 1px solid ${({ $primary }) => $primary ? '#4a2c2a' : '#e6dfd5'};
  background: ${({ $primary }) => $primary ? '#4a2c2a' : '#fff'};
  color: ${({ $primary }) => $primary ? '#fff' : '#6e6763'};
  cursor: pointer; &:disabled { opacity: .55; cursor: wait; }
  &:focus-visible { outline: 3px solid #d4a96c; outline-offset: 3px; }
`;

export default function EndChatDialog({ onCancel, onConfirm }) {
  const dialogRef = useRef(null), submitting = useRef(false);
  const [pending, setPending] = useState(false), [error, setError] = useState('');
  const titleId = useId(), descriptionId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previousFocus?.focus?.(); };
  }, []);
  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true); setError('');
    try { await onConfirm(); }
    catch (failure) {
      setError(failure?.response?.data?.message || failure.message || '상담 종료에 실패했습니다. 다시 시도해 주세요.');
      submitting.current = false; setPending(false);
    }
  }
  return createPortal(<Dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={pending}
    onCancel={event => { event.preventDefault(); if (!submitting.current) onCancel(); }}
    onClick={event => {
      if (event.target !== dialogRef.current || submitting.current) return;
      const bounds = dialogRef.current.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCancel();
    }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 15, background: '#f1ede6', color: '#4a2c2a' }}><MessageCircle size={24} /></div>
      <button type="button" aria-label="상담 종료 팝업 닫기" disabled={pending} onClick={onCancel} style={{ padding: 4, color: '#81736a' }}><X size={20} /></button>
    </div>
    <h2 id={titleId}>이 상담을 종료할까요?</h2>
    <p id={descriptionId}>대화 내용을 요약해 상담 기록에 저장합니다.<br />종료 후에는 새 상담에서 대화를 이어갈 수 있어요.</p>
    {error && <p role="alert" style={{ marginTop: 12, color: '#b91c1c' }}>{error}</p>}
    {pending && <p role="status" style={{ marginTop: 12 }}>대화를 요약하고 있어요. 잠시만 기다려 주세요.</p>}
    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
      <Action type="button" autoFocus disabled={pending} onClick={onCancel}>계속 상담하기</Action>
      <Action type="button" $primary disabled={pending} onClick={confirm}>{pending ? '종료 처리 중…' : '상담 종료'}</Action>
    </div>
  </Dialog>, document.body);
}
