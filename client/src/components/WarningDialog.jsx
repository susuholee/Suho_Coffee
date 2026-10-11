import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { AlertCircle } from 'lucide-react';

const Dialog = styled.dialog`
  width: min(420px, calc(100vw - 32px)); margin: auto; padding: 28px;
  border: 1px solid #e6dfd5; border-radius: 20px; background: #fff; color: #332b27;
  box-shadow: 0 24px 80px #30221e30;
  &::backdrop { background: #21171380; backdrop-filter: blur(3px); }
  h2 { margin: 14px 0 10px; font-size: 20px; }
  p { color: #81736a; font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
  button { width: 100%; margin-top: 24px; padding: 13px; border-radius: 10px;
    background: #bf7b2b; color: #fff; font-weight: 700; cursor: pointer; }
  button:focus-visible { outline: 3px solid #d4a96c; outline-offset: 3px; }
`;

export default function WarningDialog({ title = '입력 내용을 확인해 주세요', message, onClose, returnFocusRef }) {
  const ref = useRef(null);
  const titleId = useId(), descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); (returnFocusRef?.current || previous)?.focus?.(); };
  }, [returnFocusRef]);
  return createPortal(<Dialog ref={ref} role="alertdialog" aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <AlertCircle size={32} color="#bf7b2b" aria-hidden="true" />
    <h2 id={titleId}>{title}</h2>
    <p id={descriptionId}>{message}</p>
    <button type="button" autoFocus onClick={onClose}>확인</button>
  </Dialog>, document.body);
}
