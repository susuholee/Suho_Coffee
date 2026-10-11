import React, { useRef, useState } from 'react';
import WarningDialog from '../components/WarningDialog';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Coffee, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
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

const LoginCard = styled.div`
  width: 100%;
  max-width: 440px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 28px 20px;
  }
`;

const HeaderGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
`;

const BrandIcon = styled.div`
  width: 52px;
  height: 52px;
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
  line-height: 1.5;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  height: 46px;
  padding: 0 44px 0 42px;
  font-size: 14px;
  background-color: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
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
  margin-top: 6px;

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

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, setIsPending] = useState(false);
  const emailRef = useRef(null), passwordRef = useRef(null), warningFocusRef = useRef(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
    if (isPending) setIsPending(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg('');
    setIsPending(false);
    const email = formData.email.trim();
    setFormData(previous => ({ ...previous, email }));
    emailRef.current.value = email;
    warningFocusRef.current = null;
    if (!email || !emailRef.current.validity.valid) {
      warningFocusRef.current = emailRef.current;
      setErrorMsg(!email ? '사내 이메일을 입력해 주세요.' : '올바른 이메일 주소를 입력해 주세요. 예: admin@suhocoffee.com');
      return;
    }
    if (!formData.password) {
      warningFocusRef.current = passwordRef.current;
      setErrorMsg('비밀번호를 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('/api/auth/login', { ...formData, email });

      if (res.data.success) {
        // 로그인 성공 시 대시보드로 이동
        navigate('/');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.status === 'pending') {
        setIsPending(true);
      } else {
        setErrorMsg(data?.message || '로그인 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <LoginCard>
        <HeaderGroup>
          <BrandIcon>
            <Coffee size={28} />
          </BrandIcon>
          <div>
            <Title>수호카페 로그인</Title>
            <Subtitle>사내 통합 자동화 및 워크플로우 플랫폼</Subtitle>
          </div>
        </HeaderGroup>

        {(errorMsg || isPending) && <WarningDialog
          title={isPending ? '관리자 승인 대기 중입니다' : '로그인 정보를 확인해 주세요'}
          message={isPending ? '가입 승인이 아직 완료되지 않았습니다. 관리자 승인 후 로그인이 가능합니다.' : errorMsg}
          returnFocusRef={warningFocusRef}
          onClose={() => { setErrorMsg(''); setIsPending(false); }}
        />}

        <Form noValidate onSubmit={handleSubmit}>
          {/* 사내 이메일 */}
          <FormGroup>
            <Label htmlFor="email">사내 이메일 (ID)</Label>
            <InputWrapper>
              <InputIcon>
                <Mail size={18} />
              </InputIcon>
              <StyledInput
                id="email"
                ref={emailRef}
                name="email"
                type="email"
                placeholder="user@suhocafe.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </InputWrapper>
          </FormGroup>

          {/* 비밀번호 */}
          <FormGroup>
            <Label htmlFor="password">비밀번호</Label>
            <InputWrapper>
              <InputIcon>
                <Lock size={18} />
              </InputIcon>
              <StyledInput
                id="password"
                ref={passwordRef}
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호 입력"
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
          </FormGroup>

          {/* 로그인 버튼 */}
          <SubmitButton type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                로그인 중...
              </>
            ) : (
              <>
                <LogIn size={18} />
                로그인하기
              </>
            )}
          </SubmitButton>
        </Form>


        <FooterText>
          계정이 없으신가요?
          <Link to="/signup">회원가입</Link>
        </FooterText>
      </LoginCard>
    </PageContainer>
  );
}
