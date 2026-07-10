const APP_KEY_STORAGE = 'grok2api_app_key';
const SESSION_STORAGE = 'grok2api_session';
const APP_KEY_ENC_PREFIX = 'enc:v1:';
const APP_KEY_XOR_PREFIX = 'enc:xor:';
const APP_KEY_SECRET = 'grok2api-admin-key';
let cachedApiKey = null;

/* 会话 token 持久化：刷新页面直接复用，避免因密码不同步导致的「用户名或密码错误」。 */
function saveSessionToken(token) {
  if (token) localStorage.setItem(SESSION_STORAGE, token);
}
function loadSessionToken() {
  return localStorage.getItem(SESSION_STORAGE) || '';
}
function clearSessionToken() {
  localStorage.removeItem(SESSION_STORAGE);
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(bytes) {
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function xorCipher(bytes, keyBytes) {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

function xorEncrypt(plain) {
  const data = textEncoder.encode(plain);
  const key = textEncoder.encode(APP_KEY_SECRET);
  const cipher = xorCipher(data, key);
  return `${APP_KEY_XOR_PREFIX}${toBase64(cipher)}`;
}

function xorDecrypt(stored) {
  if (!stored.startsWith(APP_KEY_XOR_PREFIX)) return stored;
  const payload = stored.slice(APP_KEY_XOR_PREFIX.length);
  const data = fromBase64(payload);
  const key = textEncoder.encode(APP_KEY_SECRET);
  const plain = xorCipher(data, key);
  return textDecoder.decode(plain);
}

async function deriveKey(salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(APP_KEY_SECRET),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptAppKey(plain) {
  if (!plain) return '';
  if (!crypto?.subtle) return xorEncrypt(plain);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plain)
  );
  return `${APP_KEY_ENC_PREFIX}${toBase64(salt)}:${toBase64(iv)}:${toBase64(new Uint8Array(cipher))}`;
}

async function decryptAppKey(stored) {
  if (!stored) return '';
  if (stored.startsWith(APP_KEY_XOR_PREFIX)) return xorDecrypt(stored);
  if (!stored.startsWith(APP_KEY_ENC_PREFIX)) return stored;
  if (!crypto?.subtle) return '';
  const parts = stored.split(':');
  if (parts.length !== 5) return '';
  const salt = fromBase64(parts[2]);
  const iv = fromBase64(parts[3]);
  const cipher = fromBase64(parts[4]);
  const key = await deriveKey(salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher
  );
  return textDecoder.decode(plain);
}

function parseStoredCreds(plain) {
  const raw = (plain || '').trim();
  if (!raw) return { username: '', password: '' };
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      const username = typeof obj.username === 'string' ? obj.username.trim() : '';
      const password = typeof obj.password === 'string' ? obj.password.trim() : '';
      if (username && password) return { username, password };
    }
  } catch (e) { }
  // Legacy: raw is the password (username defaults to admin)
  return { username: 'admin', password: raw };
}

function serializeCreds(creds) {
  const username = typeof creds?.username === 'string' ? creds.username.trim() : '';
  const password = typeof creds?.password === 'string' ? creds.password.trim() : '';
  if (!username || !password) return '';
  return JSON.stringify({ username, password });
}

async function getStoredAppKey() {
  const stored = localStorage.getItem(APP_KEY_STORAGE) || '';
  if (!stored) return { username: '', password: '' };
  try {
    const plain = await decryptAppKey(stored);
    return parseStoredCreds(plain);
  } catch (e) {
    clearStoredAppKey();
    return { username: '', password: '' };
  }
}

async function storeAppKey(input) {
  if (!input) {
    clearStoredAppKey();
    return;
  }
  const creds = typeof input === 'string' ? { username: 'admin', password: input } : input;
  const serialized = serializeCreds(creds);
  if (!serialized) {
    clearStoredAppKey();
    return;
  }
  const encrypted = await encryptAppKey(serialized);
  localStorage.setItem(APP_KEY_STORAGE, encrypted || '');
}

function clearStoredAppKey() {
  localStorage.removeItem(APP_KEY_STORAGE);
  clearSessionToken();
  cachedApiKey = null;
}

async function requestApiKey(creds) {
  const body = serializeCreds(creds);
  const res = await fetch('/api/v1/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  if (!res.ok) {
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  const rawApiKey = data.api_key || '';
  cachedApiKey = rawApiKey ? `Bearer ${rawApiKey}` : '';
  saveSessionToken(cachedApiKey);
  if (data.force_change) {
    await promptChangePassword(creds);
  }
  return cachedApiKey;
}

/**
 * 首次登录强制改密：弹出模态框让用户输入新口令，调用后端改密后重新登录。
 */
function promptChangePassword(creds) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content modal-md">
        <div class="modal-header">
          <h3 class="modal-title">修改后台口令</h3>
        </div>
        <div class="space-y-4">
          <p class="text-sm text-[var(--accents-5)]">检测到使用默认/初始口令，请设置新口令（至少 8 位）。</p>
          <div>
            <label class="modal-label mb-1 block">新口令</label>
            <input type="password" id="cp-new" class="geist-input" autocomplete="new-password" />
          </div>
          <div>
            <label class="modal-label mb-1 block">确认新口令</label>
            <input type="password" id="cp-confirm" class="geist-input" autocomplete="new-password" />
          </div>
          <div id="cp-msg" class="text-xs text-red-600 hidden"></div>
          <div class="flex justify-end gap-2 pt-2">
            <button id="cp-cancel" type="button" class="geist-button-outline text-xs px-3">取消</button>
            <button id="cp-save" type="button" class="geist-button text-xs px-3">保存</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    // 关键：.modal-overlay 默认 opacity:0 + pointer-events:none，必须加 is-open 才可见可交互。
    // 否则改密框透明且点不动，promptChangePassword 的 Promise 永挂起，登录后无法跳转。
    requestAnimationFrame(() => overlay.classList.add('is-open'));

    const newEl = overlay.querySelector('#cp-new');
    const confirmEl = overlay.querySelector('#cp-confirm');
    const msgEl = overlay.querySelector('#cp-msg');
    const saveBtn = overlay.querySelector('#cp-save');
    const cancelBtn = overlay.querySelector('#cp-cancel');
    newEl.focus();

    function fail(msg) {
      msgEl.textContent = msg;
      msgEl.classList.remove('hidden');
    }

    async function submit() {
      const newPwd = newEl.value || '';
      const confirmPwd = confirmEl.value || '';
      if (newPwd.length < 8) return fail('新口令至少 8 位');
      if (newPwd !== confirmPwd) return fail('两次输入不一致');
      msgEl.classList.add('hidden');
      saveBtn.disabled = true;
      try {
        const resp = await fetch('/api/v1/admin/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...buildAuthHeaders(cachedApiKey) },
          body: JSON.stringify({ old_password: creds.password, new_password: newPwd })
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          return fail(err.detail || '修改失败');
        }
        overlay.remove();
        // 改密后所有会话失效，使用新口令重新登录
        const newCreds = { username: creds.username, password: newPwd };
        await storeAppKey(newCreds);
        cachedApiKey = await requestApiKey(newCreds);
        resolve();
      } catch (e) {
        fail('网络错误，请重试');
      } finally {
        saveBtn.disabled = false;
      }
    }

    saveBtn.addEventListener('click', submit);
    confirmEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
      // 用户取消改密：仍返回当前会话 token，但提示尚未修改
      resolve();
    });
  });
}

async function ensureApiKey() {
  // 1) 优先复用持久化的会话 token：刷新页面不丢失登录态，无需每次用密码重登。
  const storedSession = loadSessionToken();
  if (storedSession) {
    cachedApiKey = storedSession;
    return cachedApiKey;
  }
  // 2) 无会话 token 时，用持久密码自动重登（如会话已过期 / 服务重启）。
  const creds = await getStoredAppKey();
  if (!creds || !creds.password) {
    window.location.href = '/login';
    return null;
  }
  try {
    return await requestApiKey(creds);
  } catch (e) {
    // 登录失败（如后端短暂不可用 / 触发登录限流 429）不要清除本地持久密码，
    // 仅清内存 token 并跳登录页；登录页会用本地密码自动重登，避免丢失登录态。
    cachedApiKey = null;
    window.location.href = '/login';
    return null;
  }
}

/**
 * 处理 401 未授权：清除可能失效的会话 token 后，优先用本地持久密码自动重登，
 * 成功则刷新当前页以新会话继续；仅当无可用凭据（密码已被清除或错误）时才真正登出。
 * 即便后端会话偶发失效（如多 worker 未共享 session），也不会强制用户重新手输密码。
 */
async function handleUnauthorized() {
  // 当前会话 token 已失效，先清除，避免循环复用无效 token。
  clearSessionToken();
  cachedApiKey = null;
  try {
    const creds = await getStoredAppKey();
    if (creds && creds.password) {
      cachedApiKey = await requestApiKey(creds);
      window.location.reload();
      return;
    }
  } catch (e) {
    // 重登失败，落到下面的真正登出
  }
  logout();
}

function buildAuthHeaders(apiKey) {
  return apiKey ? { 'Authorization': apiKey } : {};
}

function logout() {
  clearStoredAppKey();
  window.location.href = '/login';
}

async function fetchStorageType() {
  const apiKey = await ensureApiKey();
  if (apiKey === null) return null;
  try {
    const res = await fetch('/api/v1/admin/storage', {
      headers: buildAuthHeaders(apiKey)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && data.type) ? String(data.type) : null;
  } catch (e) {
    return null;
  }
}

function formatStorageLabel(type) {
  if (!type) return '-';
  const normalized = type.toLowerCase();
  const map = {
    local: 'local',
    mysql: 'mysql',
    pgsql: 'pgsql',
    postgres: 'pgsql',
    postgresql: 'pgsql',
    d1: 'd1',
    redis: 'redis'
  };
  return map[normalized] || '-';
}

async function updateStorageModeButton() {
  const buttons = Array.from(document.querySelectorAll('#storage-mode-btn, [data-storage-mode-btn]'));
  if (!buttons.length) return;
  buttons.forEach((btn) => {
    btn.textContent = '...';
    btn.title = '存储模式';
    btn.classList.remove('storage-ready');
  });
  const storageType = await fetchStorageType();
  const label = formatStorageLabel(storageType);
  buttons.forEach((btn) => {
    btn.textContent = label === '-' ? label : label.toUpperCase();
    btn.title = '存储模式';
    if (label !== '-') btn.classList.add('storage-ready');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateStorageModeButton);
} else {
  updateStorageModeButton();
}
