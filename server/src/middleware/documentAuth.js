const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Use the application's existing signed session and recheck current membership.
module.exports = async function documentAuth(req, res, next) {
  try {
    const decoded = jwt.verify(req.cookies?.suho_token || '', process.env.JWT_SECRET || 'suho-coffee-jwt-secret-key');
    let user;
    if (supabase) {
      const { data, error } = await supabase.from('users').select('id,name,status').eq('id', decoded.id).single();
      if (error) throw error;
      user = data;
    } else {
      user = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/users.json'), 'utf8')).find(item => item.id === decoded.id);
    }
    if (!user || user.status !== 'approved') throw new Error('승인된 계정이 필요합니다.');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: '승인된 계정으로 로그인해 주세요.' });
  }
};
