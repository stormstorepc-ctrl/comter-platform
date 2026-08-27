(() => {
  const ORANGE = '#f97316';
  const ORANGE_DARK = '#ea580c';
  const style = document.createElement('style');
  style.textContent = `
    :root { --comter-orange:${ORANGE}; --comter-orange-dark:${ORANGE_DARK}; }
    html, body { background:#ffffff !important; color:#111111 !important; }
    body { min-height:100vh; }
    header { background:rgba(255,255,255,.96) !important; border-color:#e5e7eb !important; }
    header a, header button, nav, nav button, nav a { color:#111111 !important; }
    header a:first-child { color:${ORANGE_DARK} !important; }
    header a:first-child span { color:#111111 !important; }
    header button:last-child { background:${ORANGE} !important; color:#fff !important; box-shadow:0 8px 20px rgba(249,115,22,.25) !important; }
    .hero-bg { background:linear-gradient(rgba(255,255,255,.86),rgba(255,255,255,.96)), url('https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1600&q=80') !important; background-size:cover !important; background-position:center !important; }
    h1,h2,h3,h4,h5,h6,p,span,label { color:inherit; }
    .hero-bg h1 { color:#111111 !important; }
    .hero-bg p, .text-gray-400, .text-gray-500, .text-gray-600 { color:#6b7280 !important; }
    .bg-\\[\\#16161A\\], .bg-\\[\\#0B0B0D\\], .bg-gray-900, .bg-gray-800 { background:#ffffff !important; }
    [class*="border-gray-800"], [class*="border-gray-700"] { border-color:#e5e7eb !important; }
    input, select, textarea { background:#fff !important; color:#111 !important; border-color:#d1d5db !important; }
    option { background:#fff !important; color:#111 !important; }
    button.bg-red-600, button.bg-red-700, .bg-red-600 { background:${ORANGE} !important; color:#fff !important; }
    .text-red-600, .text-red-500, .hover\\:text-red-500:hover { color:${ORANGE_DARK} !important; }
    .hover\\:border-red-600:hover { border-color:${ORANGE} !important; }
    .shadow-red-600\\/30 { box-shadow:0 8px 20px rgba(249,115,22,.25) !important; }
    .text-yellow-400 { color:#d97706 !important; }
    .bg-black\\/70 { background:rgba(17,24,39,.72) !important; }
    .modal { background:rgba(17,24,39,.55) !important; }
    .modal > div { background:#fff !important; color:#111 !important; border-color:#e5e7eb !important; }
    a:hover, button:hover { transition:all .2s ease; }
    @media (max-width:768px) { header .max-w-7xl { padding-left:16px !important; padding-right:16px !important; } }
  `;
  document.head.appendChild(style);

  function openLogin() {
    if (document.getElementById('comterLoginModal')) return document.getElementById('comterLoginModal').classList.remove('hidden');
    const modal = document.createElement('div');
    modal.id = 'comterLoginModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(17,24,39,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
      <div style="width:100%;max-width:420px;background:#fff;color:#111;border:1px solid #e5e7eb;border-radius:20px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.18);position:relative">
        <button id="comterLoginClose" style="position:absolute;right:16px;top:12px;border:0;background:transparent;color:#6b7280;font-size:24px;cursor:pointer">×</button>
        <div style="font-size:26px;font-weight:900;letter-spacing:-1px;color:#ea580c">COMTER<span style="color:#111">.</span></div>
        <p style="margin:6px 0 20px;color:#6b7280;font-size:14px">컴터어때 로그인</p>
        <form id="comterLoginForm">
          <input id="comterUsername" required autocomplete="username" placeholder="아이디" style="box-sizing:border-box;width:100%;padding:13px;border:1px solid #d1d5db;border-radius:12px;margin-bottom:10px;color:#111;background:#fff">
          <input id="comterPassword" required type="password" autocomplete="current-password" placeholder="비밀번호" style="box-sizing:border-box;width:100%;padding:13px;border:1px solid #d1d5db;border-radius:12px;margin-bottom:12px;color:#111;background:#fff">
          <button type="submit" style="width:100%;padding:13px;border:0;border-radius:12px;background:#f97316;color:#fff;font-weight:800;cursor:pointer">로그인</button>
        </form>
        <div id="comterLoginMsg" style="min-height:20px;margin-top:12px;font-size:13px;color:#dc2626"></div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <a href="signup.html" style="flex:1;text-align:center;border:1px solid #e5e7eb;border-radius:12px;padding:11px;color:#111;text-decoration:none;font-size:13px">회원가입</a>
          <a href="login.html" style="flex:1;text-align:center;border:1px solid #e5e7eb;border-radius:12px;padding:11px;color:#111;text-decoration:none;font-size:13px">로그인 페이지</a>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('comterLoginClose').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('comterLoginForm').onsubmit = async e => {
      e.preventDefault();
      const msg = document.getElementById('comterLoginMsg');
      msg.style.color = '#6b7280'; msg.textContent = '로그인 중...';
      try {
        const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ username:document.getElementById('comterUsername').value.trim(), password:document.getElementById('comterPassword').value }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || '로그인에 실패했습니다.');
        localStorage.setItem('comter_token', d.token);
        localStorage.setItem('comter_user', JSON.stringify(d.user));
        location.href = d.user.role === 'admin' ? 'admin.html' : 'comter.html';
      } catch (err) { msg.style.color = '#dc2626'; msg.textContent = err.message; }
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const buttons = [...document.querySelectorAll('button')];
    const loginButton = buttons.find(b => (b.textContent || '').replace(/\s+/g,' ').trim().includes('로그인 / 회원가입'));
    if (loginButton) {
      loginButton.type = 'button';
      loginButton.onclick = openLogin;
    }
  });
})();
