export const theme = {
  colors: {
    // 수호카페 프리미엄 에스프레소 & 웜 우드
    primary: '#4A2C2A',
    primaryHover: '#3B2321',
    primaryLight: '#F5ECE8',
    
    // 모던 앰버 골드 (포인트 컬러)
    accent: '#D97706',
    accentHover: '#B45309',
    accentLight: '#FEF3C7',

    // 배경 및 서피스 (웜 크림 & 퓨어 화이트)
    background: '#F8F6F2',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1EDE6',
    border: '#E6DFD5',
    borderFocus: '#D97706',

    // 텍스트 계열
    textPrimary: '#262220',
    textSecondary: '#6E6763',
    textMuted: '#A09893',
    textWhite: '#FFFFFF',

    // 상태 색상 (RBAC 배지, 로그 상태 등)
    success: '#10B981',
    successBg: '#ECFDF5',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',
    danger: '#EF4444',
    dangerBg: '#FEF2F2',
    info: '#3B82F6',
    infoBg: '#EFF6FF',
    
    // RBAC 역할 배지 색상
    adminBadge: '#7C3AED',
    adminBadgeBg: '#F5F3FF',
    memberBadge: '#0284C7',
    memberBadgeBg: '#F0F9FF',
    pendingBadge: '#D97706',
    pendingBadgeBg: '#FFFBEB',
  },

  // 반응형 브레이크포인트
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    laptop: '1024px',
    desktop: '1280px',
  },

  // 모던 그림자 & 라운딩
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(62, 39, 35, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(62, 39, 35, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    glass: '0 8px 32px 0 rgba(74, 44, 42, 0.08)',
  },

  radii: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    full: '9999px',
  },

  transitions: {
    fast: '0.15s ease',
    normal: '0.25s ease',
    smooth: '0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
