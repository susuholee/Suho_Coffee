import React, { useState } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Coffee, 
  Mail, 
  Lock, 
  User, 
  Phone,
  Shield, 
  Users, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 10% 20%, rgba(217, 119, 6, 0.05) 0%, transparent 40%),
              radial-gradient(circle at 90% 80%, rgba(74, 44, 42, 0.08) 0%, transparent 40%),
              ${({ theme }) => theme.colors.background};
  padding: 32px 16px;
`;

const SignupCard = styled.div`
  width: 100%;
  max-width: 500px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  gap: 22px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 28px 20px;
  }
`;

const HeaderGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
`;

const BrandIcon = styled.div`
  width: 50px;
  height: 50px;
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.colors.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textWhite};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.5px;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const NoticeBox = styled.div`
  background-color: ${({ theme }) => theme.colors.warningBg};
  border: 1px solid rgba(217, 119, 6, 0.25);
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: #92400E;
  line-height: 1.4;
`;

const ErrorBanner = styled.div`
  background-color: ${({ theme }) => theme.colors.dangerBg};
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.danger};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
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

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-items: center;
  pointer-events: none;
`;

const StyledInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 44px 0 42px;
  font-size: 14px;
  background-color: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const InputWithButtonWrapper = styled.div`
  display: flex;
  gap: 8px;
`;

const CheckBtn = styled.button`
  flex-shrink: 0;
  padding: 0 16px;
  height: 44px;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.accent};
    background-color: ${({ theme }) => theme.colors.accentLight};
  }
`;

const FeedbackText = styled.div`
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ $status, theme }) => {
    if ($status === 'success') return theme.colors.success;
    if ($status === 'error') return theme.colors.danger;
    return theme.colors.textMuted;
  }};
`;

const PasswordRulesBox = styled.div`
  background: ${({ theme }) => theme.colors.surfaceSubtle};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 12px;
  margin-top: 4px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
`;

const RuleItem = styled.div`
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ $valid, theme }) => ($valid ? theme.colors.success : theme.colors.textMuted)};
  font-weight: ${({ $valid }) => ($valid ? '600' : '400')};
`;

const TogglePasswordBtn = styled.button`
  position: absolute;
  right: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-items: center;
  padding: 4px;

  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const RoleSelectGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const RoleCard = styled.div`
  border: 2px solid ${({ $selected, theme }) => 
    $selected ? theme.colors.accent : theme.colors.border};
  background-color: ${({ $selected, theme }) => 
    $selected ? theme.colors.accentLight : theme.colors.surfaceSubtle};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
  }
`;

const RoleTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $selected, theme }) => 
    $selected ? '#92400E' : theme.colors.textPrimary};
`;

const RoleDesc = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const SubmitButton = styled.button`
  width: 100%;
  height: 48px;
  background-color: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textWhite};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 15px;
  font-weight: 700;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.accentHover};
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const FooterText = styled.div`
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};

  a {
    color: ${({ theme }) => theme.colors.accent};
    font-weight: 600;
    margin-left: 6px;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const SuccessModalOverlay = styled.div`
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

const SuccessModalBox = styled.div`
  width: 100%;
  max-width: 440px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 36px 28px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 18px;
`;

const SuccessIconWrap = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.successBg};
  color: ${({ theme }) => theme.colors.success};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const formatPhoneNumber = (value) => {
  const cleaned = ('' + value).replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
};

export default function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null); // { status: 'success'|'error', text: '' }
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    role: 'member', // 'member' | 'admin'
  });

  // 비밀번호 유효성 검사 4대 조건
  const passwordRules = {
    hasLength: formData.password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };
  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const isConfirmMatch = formData.passwordConfirm.length > 0 && formData.password === formData.passwordConfirm;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData((prev) => ({ ...prev, phone: formatPhoneNumber(value) }));
    } else if (name === 'email') {
      setFormData((prev) => ({ ...prev, email: value }));
      // 이메일 변경 시 중복 검사 상태 초기화
      setEmailFeedback(null);
      setIsEmailVerified(false);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (errorMsg) setErrorMsg('');
  };

  // 이메일(ID) 중복 확인 핸들러
  const handleCheckEmail = async () => {
    if (!formData.email) {
      setEmailFeedback({ status: 'error', text: '이메일을 먼저 입력해 주세요.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailFeedback({ status: 'error', text: '올바른 이메일 형식이 아닙니다.' });
      return;
    }

    try {
      setCheckingEmail(true);
      const res = await axios.post('/api/auth/check-email', { email: formData.email });
      if (res.data.available) {
        setEmailFeedback({ status: 'success', text: res.data.message });
        setIsEmailVerified(true);
      } else {
        setEmailFeedback({ status: 'error', text: res.data.message });
        setIsEmailVerified(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || '중복 확인 중 오류가 발생했습니다.';
      setEmailFeedback({ status: 'error', text: msg });
      setIsEmailVerified(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleRoleSelect = (role) => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. 중복 확인 체크 여부
    if (!isEmailVerified) {
      setErrorMsg('이메일(ID) 중복 확인을 진행해 주세요.');
      return;
    }

    // 2. 패스워드 유효성 체크
    if (!isPasswordValid) {
      setErrorMsg('비밀번호 유효성 조건(8자 이상, 영문, 숫자, 특수문자)을 모두 만족해야 합니다.');
      return;
    }

    // 3. 패스워드 일치 체크
    if (!isConfirmMatch) {
      setErrorMsg('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('/api/auth/signup', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      });

      if (res.data.success) {
        setSuccessInfo(res.data.user);
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message || '회원가입 처리 중 오류가 발생했습니다.';
      setErrorMsg(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <SignupCard>
        <HeaderGroup>
          <BrandIcon>
            <Coffee size={26} />
          </BrandIcon>
          <div>
            <Title>수호카페 계정 생성</Title>
            <Subtitle>사내 통합 자동화 및 워크플로우 플랫폼</Subtitle>
          </div>
        </HeaderGroup>

        <NoticeBox>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>승인 대기(Pending) 시스템 안내</strong>
            <div style={{ marginTop: '2px' }}>
              회원가입 완료 후 팀장(Admin)의 권한 승인이 완료되어야 시스템 접근이 가능합니다.
            </div>
          </div>
        </NoticeBox>

        {errorMsg && (
          <ErrorBanner>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </ErrorBanner>
        )}

        <Form onSubmit={handleSubmit}>
          {/* 이름 */}
          <FormGroup>
            <Label htmlFor="name">이름 (실명)</Label>
            <InputWrapper>
              <InputIcon>
                <User size={18} />
              </InputIcon>
              <StyledInput
                id="name"
                name="name"
                type="text"
                placeholder="홍길동"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </InputWrapper>
          </FormGroup>

          {/* 사내 이메일 + 중복 확인 버튼 */}
          <FormGroup>
            <Label htmlFor="email">사내 이메일 (ID)</Label>
            <InputWithButtonWrapper>
              <InputWrapper style={{ flex: 1 }}>
                <InputIcon>
                  <Mail size={18} />
                </InputIcon>
                <StyledInput
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@suhocafe.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </InputWrapper>
              <CheckBtn 
                type="button" 
                onClick={handleCheckEmail} 
                disabled={checkingEmail || !formData.email}
              >
                {checkingEmail ? <Loader2 size={15} className="animate-spin" /> : '중복 확인'}
              </CheckBtn>
            </InputWithButtonWrapper>
            {emailFeedback && (
              <FeedbackText $status={emailFeedback.status}>
                {emailFeedback.status === 'success' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <AlertCircle size={14} />
                )}
                {emailFeedback.text}
              </FeedbackText>
            )}
          </FormGroup>

          {/* 휴대폰 번호 */}
          <FormGroup>
            <Label htmlFor="phone">휴대폰 번호</Label>
            <InputWrapper>
              <InputIcon>
                <Phone size={18} />
              </InputIcon>
              <StyledInput
                id="phone"
                name="phone"
                type="tel"
                placeholder="010-1234-5678"
                maxLength={13}
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </InputWrapper>
          </FormGroup>

          {/* 비밀번호 + 실시간 유효성 체크 */}
          <FormGroup>
            <Label htmlFor="password">비밀번호</Label>
            <InputWrapper>
              <InputIcon>
                <Lock size={18} />
              </InputIcon>
              <StyledInput
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="8자 이상 영문/숫자/특수문자 조합"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <TogglePasswordBtn
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </TogglePasswordBtn>
            </InputWrapper>

            {/* 실시간 패스워드 유효성 룰 박스 */}
            {formData.password.length > 0 && (
              <PasswordRulesBox>
                <RuleItem $valid={passwordRules.hasLength}>
                  {passwordRules.hasLength ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  8자리 이상
                </RuleItem>
                <RuleItem $valid={passwordRules.hasLetter}>
                  {passwordRules.hasLetter ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  영문 포함
                </RuleItem>
                <RuleItem $valid={passwordRules.hasNumber}>
                  {passwordRules.hasNumber ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  숫자 포함
                </RuleItem>
                <RuleItem $valid={passwordRules.hasSpecial}>
                  {passwordRules.hasSpecial ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  특수문자 포함
                </RuleItem>
              </PasswordRulesBox>
            )}
          </FormGroup>

          {/* 비밀번호 확인 + 일치 여부 피드백 */}
          <FormGroup>
            <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
            <InputWrapper>
              <InputIcon>
                <Lock size={18} />
              </InputIcon>
              <StyledInput
                id="passwordConfirm"
                name="passwordConfirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호 재입력"
                value={formData.passwordConfirm}
                onChange={handleChange}
                required
              />
            </InputWrapper>
            {formData.passwordConfirm.length > 0 && (
              <FeedbackText $status={isConfirmMatch ? 'success' : 'error'}>
                {isConfirmMatch ? (
                  <>
                    <CheckCircle2 size={14} /> 비밀번호가 일치합니다.
                  </>
                ) : (
                  <>
                    <XCircle size={14} /> 비밀번호가 일치하지 않습니다.
                  </>
                )}
              </FeedbackText>
            )}
          </FormGroup>

          {/* 신청 역할 선택 (RBAC) */}
          <FormGroup>
            <Label>신청 역할 (Role)</Label>
            <RoleSelectGrid>
              <RoleCard
                $selected={formData.role === 'member'}
                onClick={() => handleRoleSelect('member')}
              >
                <Users size={18} color={formData.role === 'member' ? '#D97706' : '#6E6763'} />
                <RoleTitle $selected={formData.role === 'member'}>팀원 (Member)</RoleTitle>
                <RoleDesc>문서/AI 자동화 이용</RoleDesc>
              </RoleCard>

              <RoleCard
                $selected={formData.role === 'admin'}
                onClick={() => handleRoleSelect('admin')}
              >
                <Shield size={18} color={formData.role === 'admin' ? '#D97706' : '#6E6763'} />
                <RoleTitle $selected={formData.role === 'admin'}>팀장 (Admin)</RoleTitle>
                <RoleDesc>멤버 승인 및 시스템 제어</RoleDesc>
              </RoleCard>
            </RoleSelectGrid>
          </FormGroup>

          {/* 가입 신청 버튼 */}
          <SubmitButton type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                가입 처리 중...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                가입 신청하기
              </>
            )}
          </SubmitButton>
        </Form>

        <FooterText>
          이미 계정이 있으신가요?
          <Link to="/login">로그인</Link>
        </FooterText>
      </SignupCard>

      {/* 가입 완료 및 승인 대기 안내 모달 */}
      {successInfo && (
        <SuccessModalOverlay>
          <SuccessModalBox>
            <SuccessIconWrap>
              <CheckCircle2 size={36} />
            </SuccessIconWrap>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                가입 신청이 완료되었습니다!
              </h2>
              <p style={{ fontSize: '14px', color: '#6E6763', lineHeight: '1.6' }}>
                <strong>{successInfo.name}</strong> 님의 계정이 정상 등록되었습니다.<br />
                현재 상태는 <span style={{ color: '#D97706', fontWeight: 700 }}>승인 대기(Pending)</span> 입니다.<br />
                팀장(Admin)의 검토 및 승인 후 서비스 로그인이 가능합니다.
              </p>
            </div>
            <div style={{
              width: '100%',
              background: '#F8F6F2',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '13px',
              textAlign: 'left',
              color: '#4A2C2A'
            }}>
              <div>• 이메일: {successInfo.email}</div>
              <div>• 연락처: {successInfo.phone || '미기재'}</div>
              <div>• 희망 역할: {successInfo.role === 'admin' ? '팀장 (Admin)' : '팀원 (Member)'}</div>
              <div>• 계정 상태: {successInfo.status}</div>
            </div>
            <SubmitButton
              onClick={() => {
                setSuccessInfo(null);
                navigate('/login');
              }}
            >
              로그인 화면으로 이동
            </SubmitButton>
          </SuccessModalBox>
        </SuccessModalOverlay>
      )}
    </PageContainer>
  );
}
