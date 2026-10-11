import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import styled from 'styled-components';
import { MessageCircle, X, Maximize2 } from 'lucide-react';
import ChatPanel from './ChatPanel';

const Launcher = styled.button`
  position: fixed; right: 24px; bottom: 24px; z-index: 800; display: flex; gap: 9px; align-items: center;
  padding: 16px 20px; border-radius: 24px; color: white; background: #4a2c2a; box-shadow: 0 8px 30px #4a2c2a35; font-weight: 700;
`;
const Window = styled.div`
  position: fixed; right: 24px; bottom: 92px; z-index: 800; width: 420px; height: min(700px, calc(100dvh - 120px));
  display: flex; flex-direction: column; background: white; border-radius: 20px; box-shadow: 0 16px 60px #30221e35;
  @media(max-width: 500px) { right: 8px; bottom: 80px; width: calc(100vw - 16px); height: calc(100dvh - 100px); }
`;
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  if (pathname === '/chat') return null;
  return <>
    {open && <Window role="region" aria-label="빠른 AI 상담">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}>
        <Link to="/chat" onClick={() => setOpen(false)} style={{ fontSize: 12, display: 'flex', gap: 6 }}><Maximize2 size={14} /> 전체 상담 화면</Link>
        <button aria-label="상담창 닫기" onClick={() => setOpen(false)}><X size={18} /></button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}><ChatPanel compact /></div>
    </Window>}
    <Launcher aria-expanded={open} aria-label={open ? 'AI 상담 닫기' : 'AI 상담 열기'} onClick={() => setOpen(value => !value)}><MessageCircle size={22} /> AI 상담</Launcher>
  </>;
}
