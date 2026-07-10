// 接口文档模块脚本逻辑

let activeTab = 'guide';
let activeExampleApi = 'chat';
let activeLang = 'curl';
let userApiKey = 'your_api_key';
let isSwaggerInitialized = false;

// 动态模板，将替换其中的 {BASE_URL} 和 {API_KEY}
const API_TEMPLATES = {
  chat: {
    curl: `curl {BASE_URL}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {API_KEY}" \\
  -d '{
    "model": "grok-2-1212",
    "messages": [
      {"role": "system", "content": "你是一个人工智能助手。"},
      {"role": "user", "content": "你好！"}
    ],
    "stream": false
  }'`,
    python: `from openai import OpenAI

client = OpenAI(
    base_url="{BASE_URL}",
    api_key="{API_KEY}"
)

response = client.chat.completions.create(
    model="grok-2-1212",
    messages=[
        {"role": "system", "content": "你是一个人工智能助手。"},
        {"role": "user", "content": "你好！"}
    ],
    stream=False
)

print(response.choices[0].message.content)`,
    node: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "{BASE_URL}",
  apiKey: "{API_KEY}"
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "grok-2-1212",
    messages: [
      { role: "system", content: "你是一个人工智能助手。" },
      { role: "user", content: "你好！" }
    ],
  });

  console.log(completion.choices[0].message.content);
}

main();`
  },
  images: {
    curl: `curl {BASE_URL}/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {API_KEY}" \\
  -d '{
    "model": "grok-imagine-image",
    "prompt": "一只戴着宇航员头盔的波斯猫，太空背景",
    "n": 1,
    "size": "1024x1024",
    "response_format": "url"
  }'`,
    python: `from openai import OpenAI

client = OpenAI(
    base_url="{BASE_URL}",
    api_key="{API_KEY}"
)

response = client.images.generate(
    model="grok-imagine-image",
    prompt="一只戴着宇航员头盔的波斯猫，太空背景",
    n=1,
    size="1024x1024"
)

print(response.data[0].url)`,
    node: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "{BASE_URL}",
  apiKey: "{API_KEY}"
});

async function main() {
  const image = await openai.images.generate({
    model: "grok-imagine-image",
    prompt: "一只戴着宇航员头盔的波斯猫，太空背景",
    n: 1,
    size: "1024x1024"
  });

  console.log(image.data[0].url);
}

main();`
  },
  videos: {
    curl: `curl {BASE_URL}/videos \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {API_KEY}" \\
  -d '{
    "model": "grok-imagine-video",
    "prompt": "镜头穿过一条赛博朋克风霓虹街道，下着小雨",
    "aspect_ratio": "16:9",
    "video_length": 6
  }'`,
    python: `import requests

url = "{BASE_URL}/videos"
headers = {
    "Authorization": "Bearer {API_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "model": "grok-imagine-video",
    "prompt": "镜头穿过一条赛博朋克风霓虹街道，下着小雨",
    "aspect_ratio": "16:9",
    "video_length": 6
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
    node: `import fetch from "node-fetch";

const url = "{BASE_URL}/videos";
const headers = {
  "Authorization": "Bearer {API_KEY}",
  "Content-Type": "application/json"
};
const payload = {
  model: "grok-imagine-video",
  prompt: "镜头穿过一条赛博朋克风霓虹街道，下着小雨",
  aspect_ratio: "16:9",
  video_length: 6
};

async function generateVideo() {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log(data);
}

generateVideo();`
  },
  models: {
    curl: `curl {BASE_URL}/models \\
  -H "Authorization: Bearer {API_KEY}"`,
    python: `from openai import OpenAI

client = OpenAI(
    base_url="{BASE_URL}",
    api_key="{API_KEY}"
)

models = client.models.list()
for model in models.data:
    print(model.id)`,
    node: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "{BASE_URL}",
  apiKey: "{API_KEY}"
});

async function main() {
  const list = await openai.models.list();

  for await (const model of list) {
    console.log(model.id);
  }
}

main();`
  },
  responses: {
    curl: `curl {BASE_URL}/responses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {API_KEY}" \\
  -d '{
    "model": "grok-3",
    "instructions": "你是一个专业的代码助手",
    "input": ["请写一个 python 快速排序算法"],
    "stream": false
  }'`,
    python: `import requests

url = "{BASE_URL}/responses"
headers = {
    "Authorization": "Bearer {API_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "model": "grok-3",
    "instructions": "你是一个专业的代码助手",
    "input": ["请写一个 python 快速排序算法"],
    "stream": False
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
    node: `import fetch from "node-fetch";

const url = "{BASE_URL}/responses";
const headers = {
  "Authorization": "Bearer {API_KEY}",
  "Content-Type": "application/json"
};
const payload = {
  model: "grok-3",
  instructions: "你是一个专业的代码助手",
  input: ["请写一个 python 快速排序算法"],
  stream: false
};

async function createResponse() {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log(data);
}

createResponse();`
  }
};

// 获取 Base URL
function getBaseUrl() {
  return `${window.location.origin}/v1`;
}

// 获取并替换模板内容
function getFormattedCode(api, lang) {
  const template = API_TEMPLATES[api][lang];
  return template
    .replace(/{BASE_URL}/g, getBaseUrl())
    .replace(/{API_KEY}/g, userApiKey);
}

// 渲染当前代码
function renderCode() {
  const codeContent = getFormattedCode(activeExampleApi, activeLang);
  const codeBlock = document.getElementById('code-block-content');
  if (codeBlock) {
    codeBlock.textContent = codeContent;
  }
}

// 切换选项卡
function switchTab(tabId) {
  activeTab = tabId;
  
  // 切换 tab 按钮样式
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active', 'text-black');
    btn.classList.add('text-[var(--accents-4)]', 'border-transparent');
  });
  
  const currentBtn = document.getElementById(`tab-btn-${tabId}`);
  if (currentBtn) {
    currentBtn.classList.add('active', 'text-black');
    currentBtn.classList.remove('text-[var(--accents-4)]', 'border-transparent');
  }

  // 切换内容区域
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  const currentContent = document.getElementById(`tab-content-${tabId}`);
  if (currentContent) {
    currentContent.classList.remove('hidden');
  }

  // 特殊处理 Swagger PlayGround
  if (tabId === 'playground' && !isSwaggerInitialized) {
    loadSwaggerUI();
  }
}

// 切换代码接口
function switchExampleApi(apiId) {
  activeExampleApi = apiId;
  
  // 按钮聚焦切换
  document.querySelectorAll('[id^="api-btn-"]').forEach(btn => {
    btn.classList.remove('bg-black', 'text-white');
    btn.classList.add('text-[var(--accents-6)]', 'hover:bg-gray-100');
  });

  const currentBtn = document.getElementById(`api-btn-${apiId}`);
  if (currentBtn) {
    currentBtn.classList.add('bg-black', 'text-white');
    currentBtn.classList.remove('text-[var(--accents-6)]', 'hover:bg-gray-100');
  }

  renderCode();
}

// 切换代码语言
function switchLang(langId) {
  activeLang = langId;

  // 按钮样式切换
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.remove('active', 'text-black');
    btn.classList.add('text-[var(--accents-4)]');
  });

  const currentBtn = document.getElementById(`lang-btn-${langId}`);
  if (currentBtn) {
    currentBtn.classList.add('active', 'text-black');
    currentBtn.classList.remove('text-[var(--accents-4)]');
  }

  renderCode();
}

// 复制文本辅助函数
function copyText(elementId) {
  const elem = document.getElementById(elementId);
  if (!elem) return;
  const text = elem.textContent || elem.value;
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('已成功复制到剪贴板！', 'success');
  }).catch(() => {
    showToast('复制失败，请手动选择复制。', 'error');
  });
}

// 复制当前展示的代码
function copyCurrentCode() {
  const codeContent = getFormattedCode(activeExampleApi, activeLang);
  navigator.clipboard.writeText(codeContent).then(() => {
    showToast('代码已复制！', 'success');
  }).catch(() => {
    showToast('复制失败，请手动选择复制。', 'error');
  });
}

// 异步加载 Swagger UI
function loadSwaggerUI() {
  if (window.SwaggerUIBundle) {
    initSwaggerUI();
    return;
  }

  // 1. 加载 Swagger UI 样式文件
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css';
  document.head.appendChild(link);

  // 2. 加载 Bundle JS
  const bundleScript = document.createElement('script');
  bundleScript.src = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js';
  bundleScript.onload = () => {
    // 3. 加载 Preset JS
    const presetScript = document.createElement('script');
    presetScript.src = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js';
    presetScript.onload = () => {
      initSwaggerUI();
    };
    document.head.appendChild(presetScript);
  };
  document.head.appendChild(bundleScript);
}

// 初始化 Swagger UI
function initSwaggerUI() {
  if (isSwaggerInitialized) return;

  try {
    const ui = SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: "BaseLayout",
      onComplete: () => {
        document.getElementById('swagger-loader').classList.add('hidden');
        document.getElementById('swagger-ui-container').classList.remove('hidden');
        isSwaggerInitialized = true;
      },
      onFailure: (err) => {
        document.getElementById('swagger-loader').innerHTML = `
          <div class="text-red-500 font-semibold">Swagger UI 加载失败</div>
          <p class="text-xs text-[var(--accents-4)] mt-1">${escapeHtml(err)}</p>
        `;
      }
    });
  } catch (e) {
    document.getElementById('swagger-loader').innerHTML = `
      <div class="text-red-500 font-semibold">Swagger UI 初始化出错</div>
      <p class="text-xs text-[var(--accents-4)] mt-1">${escapeHtml(e && e.message)}</p>
    `;
  }
}

// 自动拉取 API Key 以优化代码示例展示
async function fetchUserApiKey() {
  try {
    const adminKey = await ensureApiKey();
    if (!adminKey) return;
    
    const res = await fetch('/api/v1/admin/keys', {
      headers: buildAuthHeaders(adminKey)
    });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      // 优先获取有效状态下的第一个 Key
      const activeKeyObj = data.find(k => k.is_active);
      if (activeKeyObj) {
        userApiKey = activeKeyObj.key;
        renderCode();
      }
    }
  } catch (e) {
    // 忽略错误，继续使用占位符
  }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
  // 设置当前的 base URL 展示
  const url = getBaseUrl();
  const urlText = document.getElementById('base-url-text');
  if (urlText) urlText.textContent = url;

  // 更新指南中的 client-base code
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`client-base-${i}`);
    if (el) {
      if (i === 4) {
        el.textContent = `${url}/chat/completions`;
      } else {
        el.textContent = url;
      }
    }
  }

  // 替换 origin 占位符
  document.querySelectorAll('.origin-host-placeholder').forEach(el => {
    el.textContent = window.location.origin;
  });

  // 渲染初始代码
  renderCode();

  // 尝试拉取真实的 API Key 填入代码中
  fetchUserApiKey();
});
