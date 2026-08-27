const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_RENDER';
const ADMIN_USER = process.env.ADMIN_USER || 'ADMIN';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ADMIN';

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

async function dbReady() {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'customer',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      phone VARCHAR(50),
      address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS shops (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      shop_name VARCHAR(150) NOT NULL,
      phone VARCHAR(50),
      address TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    );
  `);
}

function tokenFor(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : null;
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: '로그인 세션이 만료되었습니다.' }); }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  next();
}

app.get('/', (req, res) => {
  const file = path.join(__dirname, 'comter.html');
  fs.readFile(file, 'utf8', (err, html) => {
    if (err) return res.status(500).send('메인 페이지를 불러올 수 없습니다.');
    const script = '<script src="/comter-ui.js"></script>';
    if (!html.includes('/comter-ui.js')) html = html.replace('</body>', `${script}</body>`);
    res.type('html').send(html);
  });
});

app.get('/api/health', async (req, res) => {
  try { await dbReady(); res.json({ ok: true, database: true }); }
  catch (e) { res.status(503).json({ ok: false, database: false, error: e.message }); }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    await dbReady();
    const { name, username, password, type = 'customer', phone = '', address = '', shopName = '' } = req.body;
    if (!name || !username || !password) return res.status(400).json({ error: '이름, 아이디, 비밀번호를 입력하세요.' });
    if (!['customer', 'shop'].includes(type)) return res.status(400).json({ error: '회원 유형이 올바르지 않습니다.' });
    if (password.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
    const exists = await pool.query('SELECT id FROM users WHERE username=$1', [username.trim()]);
    if (exists.rowCount) return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
    const role = type === 'shop' ? 'shop' : 'customer';
    const status = type === 'shop' ? 'pending' : 'active';
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(
      'INSERT INTO users(name,username,password_hash,role,status,phone,address) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,username,role,status',
      [name.trim(), username.trim(), hash, role, status, phone, address]
    );
    if (type === 'shop') {
      await pool.query('INSERT INTO shops(user_id,shop_name,phone,address,status) VALUES($1,$2,$3,$4,$5)', [r.rows[0].id, shopName || name, phone, address, 'pending']);
      return res.status(201).json({ ok: true, message: '업체 가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.', status: 'pending' });
    }
    res.status(201).json({ ok: true, message: '회원가입이 완료되었습니다.' });
  } catch (e) { console.error(e); res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다.' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      return res.json({ ok: true, user: { username: ADMIN_USER, role: 'admin', status: 'active' }, token: tokenFor({ id: 0, username: ADMIN_USER, role: 'admin' }) });
    }
    await dbReady();
    const r = await pool.query('SELECT * FROM users WHERE username=$1', [username?.trim()]);
    if (!r.rowCount || !(await bcrypt.compare(password || '', r.rows[0].password_hash))) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    const user = r.rows[0];
    if (user.role === 'shop' && user.status !== 'approved') return res.status(403).json({ error: '업체 계정은 관리자 승인 후 로그인할 수 있습니다.', status: user.status });
    const safe = { id: user.id, name: user.name, username: user.username, role: user.role, status: user.status };
    res.json({ ok: true, user: safe, token: tokenFor(safe) });
  } catch (e) { console.error(e); res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' }); }
});

app.get('/api/me', auth, async (req, res) => {
  if (req.user.role === 'admin') return res.json({ user: req.user });
  try { await dbReady(); const r = await pool.query('SELECT id,name,username,role,status,phone,address,created_at FROM users WHERE id=$1', [req.user.id]); if (!r.rowCount) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' }); res.json({ user: r.rows[0] }); }
  catch { res.status(500).json({ error: '조회 오류' }); }
});

app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  try { await dbReady();
    const [customers, shops, pending, approved] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role='customer'"),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role='shop'"),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role='shop' AND status='pending'"),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role='shop' AND status='approved'")
    ]);
    res.json({ customers: customers.rows[0].count, shops: shops.rows[0].count, pending: pending.rows[0].count, approved: approved.rows[0].count });
  } catch { res.status(500).json({ error: '통계 조회 오류' }); }
});

app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try { await dbReady(); const r = await pool.query("SELECT id,name,username,role,status,phone,address,created_at FROM users ORDER BY created_at DESC"); res.json({ users: r.rows }); }
  catch { res.status(500).json({ error: '회원 조회 오류' }); }
});

app.get('/api/admin/shops', auth, adminOnly, async (req, res) => {
  try { await dbReady(); const r = await pool.query(`SELECT s.id,s.user_id,s.shop_name,s.phone,s.address,s.status,s.created_at,s.approved_at,u.name,u.username FROM shops s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC`); res.json({ shops: r.rows }); }
  catch { res.status(500).json({ error: '업체 조회 오류' }); }
});

app.patch('/api/admin/shops/:id', auth, adminOnly, async (req, res) => {
  try {
    await dbReady();
    const status = req.body.status;
    if (!['approved','pending','rejected'].includes(status)) return res.status(400).json({ error: '잘못된 상태입니다.' });
    const r = await pool.query('SELECT user_id FROM shops WHERE id=$1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: '업체를 찾을 수 없습니다.' });
    await pool.query("UPDATE shops SET status=$1,approved_at=CASE WHEN $1='approved' THEN NOW() ELSE NULL END WHERE id=$2", [status, req.params.id]);
    await pool.query('UPDATE users SET status=$1 WHERE id=$2', [status === 'approved' ? 'approved' : status, r.rows[0].user_id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: '업체 상태 변경 오류' }); }
});

app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try { await dbReady(); await pool.query("DELETE FROM users WHERE id=$1 AND role<>'admin'", [req.params.id]); res.json({ ok: true }); }
  catch { res.status(500).json({ error: '회원 삭제 오류' }); }
});

app.delete('/api/admin/shops/:id', auth, adminOnly, async (req, res) => {
  try { await dbReady(); const r = await pool.query('SELECT user_id FROM shops WHERE id=$1', [req.params.id]); if (!r.rowCount) return res.status(404).json({ error: '업체를 찾을 수 없습니다.' }); await pool.query('DELETE FROM users WHERE id=$1', [r.rows[0].user_id]); res.json({ ok: true }); }
  catch { res.status(500).json({ error: '업체 삭제 오류' }); }
});

app.listen(PORT, () => console.log(`Comter server listening on ${PORT}`));
