const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

const fs = require('fs');
const path = require('path');
const dataFilePath = path.join(__dirname, '../data/users.json');

// 데이터 폴더 및 users.json 영속성 파일 초기화
if (!fs.existsSync(path.dirname(dataFilePath))) {
  fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
}



const loadLocalUsers = () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('users.json 로드 실패:', err);
  }
  return [];
};

const saveLocalUsers = (users) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('users.json 저장 실패:', err);
  }
};

let localUsers = loadLocalUsers();
if (!fs.existsSync(dataFilePath)) {
  saveLocalUsers(localUsers);
}

// Supabase가 실제 연동되어 있는지 판별하는 헬퍼
const isSupabaseConfigured = () => {
  return (
    process.env.SUPABASE_URL && 
    process.env.SUPABASE_URL !== 'https://your-project.supabase.co' &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  );
};

/**
 * 회원가입 (POST /api/auth/signup)
 */
exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // 1. 유효성 검사
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '이름, 이메일, 비밀번호는 필수 입력 항목입니다.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 최소 8자 이상이어야 합니다.',
      });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'member';
    const status = 'pending'; // 신규 가입은 무조건 승인 대기 상태

    // 2. 비밀번호 단방향 암호화 (bcrypt salt 10 rounds)
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 3. DB 적재 (Supabase 또는 로컬 폴백)
    if (isSupabaseConfigured()) {
      // 3-A. Supabase 연동 모드
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '이미 등록된 이메일 주소입니다.',
        });
      }

      const { data: newUser, error } = await supabase
        .from('users')
        .insert([
          {
            name,
            email,
            phone: phone || null,
            password_hash,
            role: assignedRole,
            status,
          }
        ])
        .select('id, email, name, phone, role, status, created_at')
        .single();

      if (error) {
        console.error('❌ Supabase INSERT 오류:', error);
        return res.status(500).json({
          success: false,
          message: '데이터베이스 저장 중 오류가 발생했습니다: ' + error.message,
        });
      }

      return res.status(201).json({
        success: true,
        message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
        user: newUser,
        mode: 'supabase',
      });
    } else {
      // 3-B. 로컬 인메모리 폴백 모드 (Supabase 프로젝트 생성 전 안전한 테스트 환경)
      const existing = localUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({
          success: false,
          message: '이미 등록된 이메일 주소입니다.',
        });
      }

      const newUser = {
        id: 'user_' + Date.now(),
        name,
        email,
        phone: phone || null,
        password_hash, // 실제 bcrypt 암호화된 해시값 저장
        role: assignedRole,
        status, // 'pending'
        created_at: new Date().toISOString(),
      };

      localUsers.push(newUser);
      saveLocalUsers(localUsers);

      console.log(`👤 [회원가입 성공 - 로컬 모드] ${newUser.name} (${newUser.email}) - 역할: ${newUser.role}, 상태: ${newUser.status}`);

      // password_hash를 제외한 안전한 사용자 정보 응답
      const { password_hash: _, ...safeUser } = newUser;

      return res.status(201).json({
        success: true,
        message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
        user: safeUser,
        mode: 'local_fallback',
      });
    }
  } catch (err) {
    console.error('❌ 회원가입 처리 오류:', err);
    return res.status(500).json({
      success: false,
      message: '서버 내부 처리 중 오류가 발생했습니다.',
    });
  }
};

/**
 * 이메일(ID) 중복 확인 (POST /api/auth/check-email)
 */
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        available: false,
        message: '이메일을 입력해 주세요.',
      });
    }

    // 이메일 정규식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: '올바른 이메일 형식이 아닙니다.',
      });
    }

    let isDuplicate = false;

    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      isDuplicate = !!data;
    } else {
      isDuplicate = localUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
    }

    if (isDuplicate) {
      return res.status(200).json({
        success: true,
        available: false,
        message: '이미 등록된 이메일(ID)입니다.',
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
      message: '사용 가능한 이메일(ID)입니다.',
    });
  } catch (err) {
    console.error('❌ 이메일 중복 확인 오류:', err);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
};

/**
 * 사용자 목록 조회 (관리자용 가입 대기 확인용: GET /api/auth/users)
 */
exports.getUsers = async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, phone, role, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, users: data });
    } else {
      const safeList = localUsers.map(({ password_hash, ...rest }) => rest);
      return res.status(200).json({ success: true, users: safeList });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 유저 상태 변경 (팀장 승인/반려: PATCH /api/auth/users/:id/status)
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, role } = req.body; // status: 'approved' | 'rejected', role optional

    if (!status && !role) {
      return res.status(400).json({ success: false, message: '변경할 상태나 역할을 지정해 주세요.' });
    }

    if (isSupabaseConfigured()) {
      const updatePayload = {};
      if (status) updatePayload.status = status;
      if (role) updatePayload.role = role;

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select('id, email, name, phone, role, status, updated_at')
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, message: '사용자 상태가 갱신되었습니다.', user: data });
    } else {
      const user = localUsers.find((u) => u.id === id || u.email === id);
      if (!user) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
      }

      if (status) user.status = status;
      if (role) user.role = role;
      user.updated_at = new Date().toISOString();

      saveLocalUsers(localUsers);

      console.log(`✅ [RBAC 승인 갱신] ${user.name} (${user.email}) ➔ 상태: ${user.status}, 역할: ${user.role}`);

      const { password_hash, ...safeUser } = user;
      return res.status(200).json({
        success: true,
        message: `사용자(${user.name})의 상태가 '${user.status}'(으)로 변경되었습니다.`,
        user: safeUser,
      });
    }
  } catch (err) {
    console.error('❌ 유저 상태 변경 오류:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 로그인 (POST /api/auth/login)
 * 요구사항: 쿠키 + bcrypt 암호화 인증 및 RBAC 승인 상태(pending/approved) 제어
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'suho-coffee-jwt-secret-key';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 모두 입력해 주세요.',
      });
    }

    let user = null;

    // 1. 유저 조회
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      if (!error && data) user = data;
    } else {
      user = localUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: '등록되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.',
      });
    }

    // 2. bcrypt 비밀번호 비교
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: '등록되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.',
      });
    }

    // 3. RBAC 승인 상태 검사 (pending 차단)
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        status: 'pending',
        message: '현재 가입 승인 대기(Pending) 중입니다. 팀장(Admin)의 승인 후 로그인해 주세요.',
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        status: 'rejected',
        message: '가입 승인이 거절된 계정입니다. 관리자에게 문의하세요.',
      });
    }

    // 4. 보안 쿠키 발급 (JWT HttpOnly Cookie)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('suho_token', token, {
      httpOnly: true, // 자바스크립트 탈취 방지
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24시간 유지
    });

    const { password_hash, ...safeUser } = user;

    console.log(`🔑 [로그인 성공] ${safeUser.name} (${safeUser.email}) - 역할: ${safeUser.role}`);

    return res.status(200).json({
      success: true,
      message: '로그인되었습니다.',
      user: safeUser,
    });
  } catch (err) {
    console.error('❌ 로그인 오류:', err);
    return res.status(500).json({
      success: false,
      message: '서버 내부 처리 중 오류가 발생했습니다.',
    });
  }
};

/**
 * 현재 로그인 사용자 정보 조회 (GET /api/auth/me)
 */
exports.getMe = async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'suho-coffee-jwt-secret-key';
    const token = req.cookies?.suho_token;

    if (!token) {
      return res.status(401).json({ success: false, message: '인증되지 않은 사용자입니다.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    let user;
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('users').select('id,email,name,phone,role,status').eq('id', decoded.id).single();
      if (error) throw error;
      user = data;
    } else {
      user = localUsers.find(item => item.id === decoded.id);
    }
    if (!user || user.status !== 'approved') return res.status(401).json({ success: false, message: '다시 로그인해주세요.' });
    const { password_hash, ...safeUser } = user;
    return res.status(200).json({ success: true, user: safeUser });
  } catch (err) {
    return res.status(401).json({ success: false, message: '유효하지 않거나 만료된 세션입니다.' });
  }
};

/**
 * 로그아웃 (POST /api/auth/logout)
 */
exports.logout = (req, res) => {
  res.clearCookie('suho_token');
  return res.status(200).json({ success: true, message: '로그아웃되었습니다.' });
};

module.exports = exports;
