import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import AdminMembersPage from './pages/AdminMembersPage';
import DocumentsPage from './pages/DocumentsPage';
import AiChatPage from './pages/AiChatPage';
import WorkflowsPage from './pages/WorkflowsPage';
import LogsPage from './pages/LogsPage';
import CalendarPage from './pages/CalendarPage';
import ChatWidget from './components/chat/ChatWidget';

// React Query 클라이언트 인스턴스
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <Router>
          <Routes>
            {/* 인증 페이지 (사이드바 없는 독립 레이아웃) */}
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* 대시보드 및 내부 서비스 페이지 (AppLayout 적용) */}
            <Route
              path="/*"
              element={
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/documents" element={<DocumentsPage />} />
                    <Route path="/chat" element={<AiChatPage />} />
                    <Route path="/workflows" element={<WorkflowsPage />} />
                    <Route path="/logs" element={<LogsPage />} />
                    <Route path="/admin/members" element={<AdminMembersPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  <ChatWidget />
                </AppLayout>
              }
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
