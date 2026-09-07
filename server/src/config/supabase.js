const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseServiceKey && supabaseUrl !== 'https://your-project.supabase.co') {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase] 클라이언트가 정상적으로 연결되었습니다.');
  } catch (err) {
    console.warn('[Supabase] 클라이언트 생성 실패 (로컬 모드로 전환됩니다):', err.message);
  }
} else {
  console.log('[Supabase] 설정이 감지되지 않아 로컬 인메모리 DB 모드로 안전하게 동작합니다.');
}

module.exports = { supabase };
