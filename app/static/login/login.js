const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');

usernameInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') passwordInput.focus();
});

passwordInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') login();
});

async function login() {
  const btn = document.querySelector('.login-button');
  const username = (usernameInput.value || '').trim();
  const password = (passwordInput.value || '').trim();
  if (!username || !password) return;

  if (btn) { btn.disabled = true; btn.textContent = '登录中…'; }
  try {
    const res = await fetch('/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      const data = await res.json();
      const rawApiKey = data.api_key || '';
      if (rawApiKey) {
        cachedApiKey = `Bearer ${rawApiKey}`;
        saveSessionToken(cachedApiKey);
      }
      await storeAppKey({ username, password });
      // 首次登录强制改密（若服务端要求）
      if (data.force_change) {
        await promptChangePassword({ username, password });
      }
      window.location.href = '/admin/skills';
    } else {
      showToast('用户名或密码错误', 'error');
    }
  } catch (e) {
    console.error('Login error:', e);
    showToast('连接失败', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '登录'; }
  }
}

// Auto-redirect checks
(async () => {
  const existing = await getStoredAppKey();
  const existingUsername = (existing && existing.username) ? String(existing.username) : '';
  const existingPassword = (existing && existing.password) ? String(existing.password) : '';

  usernameInput.value = existingUsername || 'admin';
  passwordInput.focus();

  if (!existingPassword) return;

  try {
    const res = await fetch('/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput.value.trim(), password: existingPassword })
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const rawApiKey = data.api_key || '';
      if (rawApiKey) {
        cachedApiKey = `Bearer ${rawApiKey}`;
        saveSessionToken(cachedApiKey);
      }
      if (data.force_change) {
        await promptChangePassword({ username: usernameInput.value.trim(), password: existingPassword });
      }
      window.location.href = '/admin/skills';
    } else {
      // 缓存凭据已失效：清除本地持久密码与会话，避免每次刷新都用错误旧密码自动尝试，
      // 导致页面卡在登录页、手动登录也被干扰。
      clearStoredAppKey();
      usernameInput.value = 'admin';
      passwordInput.value = '';
      passwordInput.focus();
      showToast('保存的登录信息已失效，请重新输入', 'error');
    }
  } catch (e) {
    console.error('Auto-login error:', e);
  }
})();
