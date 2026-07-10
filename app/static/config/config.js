let apiKey = '';
let currentConfig = {};
const NUMERIC_FIELDS = new Set([
  'timeout',
  'max_retry',
  'refresh_interval_hours',
  'fail_threshold',
  'nsfw_refresh_concurrency',
  'nsfw_refresh_retries',
  'limit_mb',
  'save_delay_ms',
  'assets_max_concurrent',
  'media_max_concurrent',
  'usage_max_concurrent',
  'assets_delete_batch_size',
  'admin_assets_batch_size',
  'reload_interval_sec',
  'solver_threads',
  'register_threads',
  'default_count'
]);

const LOCALE_MAP = {
  "app": {
    "label": "应用设置",
    "api_key": { title: "API 密钥", desc: "调用 Grok2API 服务所需的 Bearer Token，请妥善保管。" },
    "admin_username": { title: "后台账号", desc: "登录 Grok2API 服务管理后台的用户名，默认 admin。" },
    "app_key": { title: "后台密码", desc: "登录 Grok2API 服务管理后台的密码，请妥善保管。" },
    "app_url": { title: "应用地址", desc: "当前 Grok2API 服务的外部访问 URL，用于文件链接访问。" },
    "image_format": { title: "图片格式", desc: "生成的图片格式（url / base64 / b64_json）。" },
    "video_format": { title: "视频格式", desc: "生成的视频格式（仅支持 url）。" }
  },
  "grok": {
    "label": "Grok 设置",
    "temporary": { title: "临时对话", desc: "是否启用临时对话模式。" },
    "stream": { title: "流式响应", desc: "是否默认启用流式输出。" },
    "thinking": { title: "思维链", desc: "是否启用模型思维链输出。" },
    "dynamic_statsig": { title: "动态指纹", desc: "是否启用动态生成 Statsig 值。" },
    "filter_tags": { title: "过滤标签", desc: "自动过滤 Grok 响应中的特殊标签。" },
    "video_poster_preview": { title: "视频海报预览", desc: "启用后会将返回内容中的 <video> 标签替换为带播放按钮的 Poster 预览图；点击预览图会在新标签页打开视频（默认关闭）。" },
    "timeout": { title: "超时时间", desc: "请求 Grok 服务的超时时间（秒）。" },
    "base_proxy_url": { title: "基础代理 URL", desc: "代理请求到 Grok 官网的基础服务地址。" },
    "asset_proxy_url": { title: "资源代理 URL", desc: "代理请求到 Grok 官网的静态资源（图片/视频）地址。" },
    "cf_clearance": { title: "CF Clearance", desc: "Cloudflare 验证 Cookie，用于验证 Cloudflare 的验证。" },
    "max_retry": { title: "最大重试", desc: "请求 Grok 服务失败时的最大重试次数。" },
    "retry_status_codes": { title: "重试状态码", desc: "触发重试的 HTTP 状态码列表。" },
    "image_generation_method": { title: "生图调用方式", desc: "旧方法稳定；新方法为实验性方法。" }
  },
  "token": {
    "label": "Token 池设置",
    "auto_refresh": { title: "自动刷新", desc: "是否开启 Token 自动刷新机制。" },
    "refresh_interval_hours": { title: "刷新间隔", desc: "Token 刷新的时间间隔（小时）。" },
    "fail_threshold": { title: "失败阈值", desc: "单个 Token 连续失败多少次后标记为不可用。" },
    "nsfw_refresh_concurrency": { title: "NSFW 刷新并发", desc: "账户设置刷新（协议/年龄/NSFW）时的默认并发数。" },
    "nsfw_refresh_retries": { title: "NSFW 刷新重试", desc: "账户设置刷新失败后的额外重试次数（不含首次）。" },
    "save_delay_ms": { title: "保存延迟", desc: "Token 变更合并写入的延迟（毫秒）。" },
    "reload_interval_sec": { title: "一致性刷新", desc: "多 worker 场景下 Token 状态刷新间隔（秒）。" }
  },
  "cache": {
    "label": "缓存设置",
    "enable_auto_clean": { title: "自动清理", desc: "是否启用缓存自动清理，开启后按上限自动回收。" },
    "limit_mb": { title: "清理阈值", desc: "缓存大小阈值（MB），超过阈值会触发清理。" }
  },
  "performance": {
    "label": "并发性能",
    "assets_max_concurrent": { title: "资产并发上限", desc: "资源上传/下载/列表的并发上限。推荐 25。" },
    "media_max_concurrent": { title: "媒体并发上限", desc: "视频/媒体生成请求的并发上限。推荐 50。" },
    "usage_max_concurrent": { title: "用量并发上限", desc: "用量查询请求的并发上限。推荐 25。" },
    "assets_delete_batch_size": { title: "资产清理批量", desc: "在线资产删除单批并发数量。推荐 10。" },
    "admin_assets_batch_size": { title: "管理端批量", desc: "管理端在线资产统计/清理批量并发数量。推荐 10。" }
  },
  "register": {
    "label": "自动注册",
    "worker_domain": { title: "Worker 域名", desc: "临时邮箱 Worker 的域名（不含 https://）。" },
    "email_domain": { title: "邮箱域名", desc: "临时邮箱使用的域名，如 example.com。" },
    "admin_password": { title: "邮箱管理密码", desc: "Worker 后台的管理密钥。" },
    "yescaptcha_key": { title: "YesCaptcha Key", desc: "可选。填写后优先使用 YesCaptcha。" },
    "solver_url": { title: "Solver 地址", desc: "本地 Turnstile Solver 地址，默认 http://127.0.0.1:5072。" },
    "solver_browser_type": { title: "Solver 浏览器", desc: "Solver 使用的浏览器类型：chromium / chrome / msedge / camoufox。建议使用 camoufox（对 accounts.x.ai 成功率更高）。" },
    "solver_threads": { title: "Solver 线程数", desc: "自动启动 Solver 时的线程数，默认 5。" },
    "register_threads": { title: "注册线程数", desc: "注册并发线程数，默认 10。" },
    "default_count": { title: "默认注册数量", desc: "未填写数量时默认注册多少个，默认 100。" },
    "auto_start_solver": { title: "自动启动 Solver", desc: "注册时自动启动本地 Solver。" },
    "solver_debug": { title: "Solver 调试", desc: "启动 Solver 时开启调试日志。" },
    "max_errors": { title: "最大错误数", desc: "失败次数超过阈值会自动停止注册。0 表示自动计算。"},
    "max_runtime_minutes": { title: "最长运行时间(分钟)", desc: "超过指定分钟数后自动停止注册。0 表示不限制。"}
  }
};

// 静态可用模型（与 ModelService / MODEL_CONFIG 对齐）
// 仅支持源头原始 ID，与 model.py / models.ts 一致
const STATIC_MODELS = [
  { id: "grok-4.20-0309-multi-agent", desc: "Grok 4.20 0309 multi agent" },
  { id: "grok-4.20-0309-console", desc: "Grok 4.20 0309 console" },
  { id: "grok-4.20-0309-non-reasoning", desc: "Grok 4.20 0309 non reasoning" },
  { id: "grok-4.20-0309-non-reasoning-console", desc: "Grok 4.20 0309 non reasoning console" },
  { id: "grok-4.20-0309-reasoning-console", desc: "Grok 4.20 0309 reasoning console" },
  { id: "grok-4.20-fast", desc: "Grok 4.20 fast" },
  { id: "grok-4.20-multi-agent-console", desc: "Grok 4.20 multi agent console" },
  { id: "grok-4.20-multi-agent-low", desc: "Grok 4.20 multi agent low" },
  { id: "grok-4.20-multi-agent-medium", desc: "Grok 4.20 multi agent medium" },
  { id: "grok-4.20-multi-agent-high", desc: "Grok 4.20 multi agent high" },
  { id: "grok-4.20-multi-agent-xhigh", desc: "Grok 4.20 multi agent xhigh" },
  { id: "grok-4.5", desc: "Grok 4.5" },
  { id: "grok-4.3", desc: "Grok 4.3" },
  { id: "grok-4.3-fast", desc: "Grok 4.3 fast" },
  { id: "grok-4.3-console", desc: "Grok 4.3 console" },
  { id: "grok-4.3-low", desc: "Grok 4.3 low" },
  { id: "grok-4.3-medium", desc: "Grok 4.3 medium" },
  { id: "grok-4.3-high", desc: "Grok 4.3 high" },
  { id: "grok-build-0.1", desc: "Grok build 0.1" },
  { id: "grok-build-console", desc: "Grok build console" },
  { id: "grok-code-fast-1", desc: "Grok code fast 1" },
  { id: "grok-imagine-image-pro", desc: "Grok imagine image pro" },
  { id: "grok-imagine-image", desc: "Grok imagine image" },
  { id: "grok-imagine-image-lite", desc: "Grok imagine image lite" },
  { id: "grok-imagine-video", desc: "Grok imagine video" }
];

function getText(section, key) {
  if (LOCALE_MAP[section] && LOCALE_MAP[section][key]) {
    return LOCALE_MAP[section][key];
  }
  return {
    title: key.replace(/_/g, ' '),
    desc: '暂无说明，请参考配置文档。'
  };
}

function getSectionLabel(section) {
  return (LOCALE_MAP[section] && LOCALE_MAP[section].label) || `${escapeHtml(section)} 设置`;
}

// 与后端 SENSITIVE_KEYS 对齐：这些字段在 GET 配置时会被脱敏为 "********"
const SECRET_FIELDS = new Set([
  'app.app_key',
  'app.api_key',
  'grok.cf_clearance',
  'register.admin_password',
  'register.yescaptcha_key',
]);

async function init() {
  apiKey = await ensureApiKey();
  if (apiKey === null) return;
  loadData();
}

async function loadData() {
  try {
    const res = await fetch('/api/v1/admin/config', {
      headers: buildAuthHeaders(apiKey)
    });
    if (res.ok) {
      currentConfig = await res.json();
      renderConfig(currentConfig);
    } else if (res.status === 401) {
      handleUnauthorized();
    }
  } catch (e) {
    showToast('连接失败', 'error');
  }
}

function renderConfig(data) {
  const container = document.getElementById('config-container');
  container.innerHTML = '';

  const sections = Object.keys(data);
  const sectionOrder = Object.keys(LOCALE_MAP);

  sections.sort((a, b) => {
    const ia = sectionOrder.indexOf(a);
    const ib = sectionOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1; // Known sections first
    if (ib !== -1) return 1;
    return 0;
  });

  sections.forEach(section => {
    const items = data[section];

    const card = document.createElement('div');
    card.className = 'config-section';
    // 字段较多的 section 用更宽的 3 列网格
    if (section === 'register' || Object.keys(items).length >= 8) {
      card.classList.add('config-grid-wide');
    }

    const header = document.createElement('div');
    header.innerHTML = `<div class="config-section-title">${getSectionLabel(section)}</div>`;
    card.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'config-grid';

    const keys = Object.keys(items);
    if (LOCALE_MAP[section]) {
      const order = Object.keys(LOCALE_MAP[section]);
      keys.sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return 0;
      });
    }

    keys.forEach(key => {
      const val = items[key];
      const text = getText(section, key);

      // Container
      const fieldCard = document.createElement('div');
      fieldCard.className = 'config-field';
      // 密钥行 / 长文本 / 长描述字段跨整行
      const isSecret = key === 'api_key' || key === 'app_key';
      const isJson = Array.isArray(val) || typeof val === 'object';
      const longDesc = (text.desc || '').length > 48;
      if (isSecret || isJson || longDesc) {
        fieldCard.classList.add('col-span-2');
      }

      // Title
      const titleEl = document.createElement('div');
      titleEl.className = 'config-field-title';
      titleEl.textContent = text.title;
      fieldCard.appendChild(titleEl);

      // Description (Muted)
      const descEl = document.createElement('p');
      descEl.className = 'config-field-desc';
      descEl.textContent = text.desc;
      fieldCard.appendChild(descEl);

      // Input Wrapper
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'config-field-input';

      // Input Logic
      let input;
      if (typeof val === 'boolean') {
        const label = document.createElement('label');
        label.className = 'relative inline-flex items-center cursor-pointer';

        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = val;
        input.className = 'sr-only peer';
        input.dataset.section = section;
        input.dataset.key = key;

        const slider = document.createElement('div');
        slider.className = "w-9 h-5 bg-[var(--accents-2)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black";

        label.appendChild(input);
        label.appendChild(slider);
        inputWrapper.appendChild(label);
      }
      else if (key === 'image_format') {
        input = document.createElement('select');
        input.className = 'geist-input h-[34px]'; // Matches reduced padding inputs
        input.dataset.section = section;
        input.dataset.key = key;

        const opts = [
          { val: 'url', text: 'URL' },
          { val: 'base64', text: 'Base64' },
          { val: 'b64_json', text: 'b64_json' }
        ];

        opts.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.val;
          option.text = opt.text;
          if (val === opt.val) option.selected = true;
          input.appendChild(option);
        });
        inputWrapper.appendChild(input);
      }
      else if (key === 'image_generation_method') {
        input = document.createElement('select');
        input.className = 'geist-input h-[34px]';
        input.dataset.section = section;
        input.dataset.key = key;

        const opts = [
          { val: 'legacy', text: '旧方法（默认）' },
          { val: 'imagine_ws_experimental', text: '新方法（实验性）' }
        ];

        opts.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.val;
          option.text = opt.text;
          if (val === opt.val) option.selected = true;
          input.appendChild(option);
        });
        inputWrapper.appendChild(input);
      }
      else if (key === 'video_format') {
        input = document.createElement('select');
        input.className = 'geist-input h-[34px]';
        input.dataset.section = section;
        input.dataset.key = key;

        const option = document.createElement('option');
        option.value = 'url';
        option.text = 'URL';
        option.selected = true;
        input.appendChild(option);

        inputWrapper.appendChild(input);
      }
      else if (Array.isArray(val) || typeof val === 'object') {
        input = document.createElement('textarea');
        input.className = 'geist-input font-mono text-xs';
        input.rows = 4;
        input.value = JSON.stringify(val, null, 2);
        input.dataset.section = section;
        input.dataset.key = key;
        input.dataset.type = 'json';
        inputWrapper.appendChild(input);
      }
      else {
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'geist-input';
        input.value = val;
        input.dataset.section = section;
        input.dataset.key = key;

        const isSecret = SECRET_FIELDS.has(`${section}.${key}`);
        if (isSecret) {
          input.dataset.secret = '1';
          if (val === '********') {
            input.value = '';
            input.placeholder = '已设置，留空表示不修改';
          } else if (val === '') {
            input.placeholder = '未设置';
          }
        }

        if (key === 'app_key') input.type = 'text';

        if (key === 'api_key' || key === 'app_key') {
          const wrapper = document.createElement('div');
          wrapper.className = 'config-secret-row';

          input.className = 'geist-input';

          const copyBtn = document.createElement('button');
          copyBtn.className = 'config-copy-btn';
          copyBtn.type = 'button';
          copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

          copyBtn.onclick = () => copyToClipboard(input.value, copyBtn);

          wrapper.appendChild(input);
          wrapper.appendChild(copyBtn);
          inputWrapper.appendChild(wrapper);
        } else {
          inputWrapper.appendChild(input);
        }
      }

      fieldCard.appendChild(inputWrapper);
      grid.appendChild(fieldCard);
    });

    card.appendChild(grid);

    if (grid.children.length > 0) {
      container.appendChild(card);
    }
  });

  // 追加“可用模型”卡片（从 /v1/models 拉取，与后端保持一致）
  void renderStaticModelsSection(container);
}

async function renderStaticModelsSection(container) {
  const existing = document.getElementById('available-models');
  if (existing) return;

  let models = STATIC_MODELS;
  let syncedFromApi = false;
  try {
    if (apiKey) {
      const res = await fetch('/v1/models', { headers: buildAuthHeaders(apiKey) });
      if (res.ok) {
        const payload = await res.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        if (rows.length) {
          models = rows.map((m) => ({
            id: m.id,
            desc: m.display_name || m.id,
          }));
          syncedFromApi = true;
        }
      }
    }
  } catch (e) {
    console.warn('[config] failed to sync model list from /v1/models:', e);
  }

  const descText = syncedFromApi
    ? `当前共 ${models.length} 个可用模型 ID，与 /v1/models 接口实时同步。点击右侧按钮可复制模型 ID。`
    : `当前仅保留已实测支持的 ${models.length} 个模型 ID。点击右侧按钮可复制模型 ID。`;

  const card = document.createElement('div');
  card.className = 'config-section';
  card.id = 'available-models';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-4';
  header.innerHTML = `
    <div>
      <div class="config-section-title flex items-center gap-2 flex-wrap">
        可用模型
        <a href="https://docs.x.ai/developers/models" target="_blank" rel="noopener" class="text-sm font-normal text-[var(--accents-5)] hover:text-[var(--accents-3)] underline">官方文档 ↗</a>
      </div>
      <p class="config-field-desc mt-1">${descText}</p>
    </div>
  `;
  card.appendChild(header);

  const list = document.createElement('div');
  list.className = 'space-y-1 text-sm';

  models.forEach(m => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-[var(--accents-1)]';

    const left = document.createElement('div');
    left.className = 'flex flex-col';

    const idEl = document.createElement('code');
    idEl.className = 'text-xs font-mono';
    idEl.textContent = m.id;

    left.appendChild(idEl);
    if (m.desc) {
      const descEl = document.createElement('div');
      descEl.className = 'text-[11px] text-[var(--accents-4)]';
      descEl.textContent = m.desc;
      left.appendChild(descEl);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'geist-button-outline text-[11px] px-2 py-1';
    btn.textContent = '复制';
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(m.id);
        showToast(`已复制模型 ID：${m.id}`, 'success');
      } catch (e) {
        showToast('复制失败', 'error');
      }
    };

    row.appendChild(left);
    row.appendChild(btn);
    list.appendChild(row);
  });

  card.appendChild(list);
  container.appendChild(card);

  // 如果带了 hash，滚动到该区域
  if (location.hash === '#available-models') {
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
}

async function saveConfig() {
  const btn = document.getElementById('save-btn');
  const originalText = btn.innerText;
  btn.disabled = true;
  btn.innerText = '保存中...';

  try {
    const newConfig = JSON.parse(JSON.stringify(currentConfig));
    const inputs = document.querySelectorAll('input[data-section], textarea[data-section], select[data-section]');

    inputs.forEach(input => {
      const s = input.dataset.section;
      const k = input.dataset.key;
      let val = input.value;

      // 密钥字段：留空表示不修改，跳过以免清空或回写占位符
      if (input.dataset.secret === '1' && val.trim() === '') {
        return;
      }

      if (input.type === 'checkbox') {
        val = input.checked;
      } else if (input.dataset.type === 'json') {
        try { val = JSON.parse(val); } catch (e) { throw new Error(`无效的 JSON: ${getText(s, k).title}`); }
      } else if (k === 'admin_username' && val.trim() === '') {
        throw new Error('后台账号不能为空');
      } else if (k === 'app_key' && val.trim() === '') {
        throw new Error('后台密码不能为空');
      } else if (NUMERIC_FIELDS.has(k)) {
        if (val.trim() !== '' && !Number.isNaN(Number(val))) {
          val = Number(val);
        }
      }

      if (!newConfig[s]) newConfig[s] = {};
      newConfig[s][k] = val;
    });

    const res = await fetch('/api/v1/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(apiKey)
      },
      body: JSON.stringify(newConfig)
    });

    if (res.ok) {
      btn.innerText = '成功';
      showToast('配置已保存', 'success');
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.backgroundColor = '';
      }, 2000);
    } else {
      showToast('保存失败', 'error');
    }
  } catch (e) {
    showToast('错误: ' + e.message, 'error');
  } finally {
    if (btn.innerText === '保存中...') {
      btn.disabled = false;
      btn.innerText = originalText;
    } else {
      btn.disabled = false;
    }
  }
}

// 保留函数名供其他地方调用（目前未使用弹窗）
async function showAvailableModels() {
  const container = document.getElementById('config-container');
  if (!container) return;
  await renderStaticModelsSection(container);
  const card = document.getElementById('available-models');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function copyFallback(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    document.body.removeChild(ta);
    return false;
  }
}

async function copyToClipboard(text, btn) {
  if (!text) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      if (!copyFallback(text)) throw new Error('execCommand copy failed');
    }

    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    btn.style.backgroundColor = '#10b981';
    btn.style.borderColor = '#10b981';

    setTimeout(() => {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      btn.style.backgroundColor = '';
      btn.style.borderColor = '';
    }, 2000);
  } catch (err) {
    if (copyFallback(text)) {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      btn.style.backgroundColor = '#10b981';
      btn.style.borderColor = '#10b981';
      setTimeout(() => {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
      }, 2000);
    } else {
      console.error('Failed to copy', err);
    }
  }
}

window.onload = init;
