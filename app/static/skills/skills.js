// 技能中心：按能力维度展示 Grok2API 提供的全部技能。
// 数据与渲染均在前端完成；模型示例与 /v1/models、model_catalog 保持一致。

const ICONS = {
  chat:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  responses:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
  image:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  edit:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  film:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/></svg>',
  hd:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><text x="12" y="15.2" font-family="system-ui, -apple-system, Arial, sans-serif" font-size="8" font-weight="800" text-anchor="middle" fill="currentColor" stroke="none">HD</text></svg>',
  bulb:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.142 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.142 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/></svg>',
  list:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
};

const EXAMPLE_MODELS = {
  chat: "grok-4.5",
  reasoning: "grok-4.20-0309-reasoning-console",
  coding: "grok-code-fast-1",
  image: "grok-imagine-image",
  imageLite: "grok-imagine-image-lite",
  video: "grok-imagine-video",
  codex: "gpt-5.5",
};

const SKILLS = [
  {
    id: "models",
    title: "模型列表",
    subtitle: "Model Catalog",
    category: "基础能力",
    color: "#444",
    icon: ICONS.list,
    desc: "查询当前实例支持的全部模型 ID（与配置管理「可用模型」、后端 model_catalog 同步）。",
    tags: ["发现", "25 模型", "OpenAI 兼容"],
    method: "GET",
    endpoint: "/v1/models",
    features: [
      "返回 object=list 与 data[] 结构，兼容 OpenAI SDK",
      "包含 grok-4.5、4.3 各档位、4.20 multi-agent、imagine、coding 等",
      "gpt-5.5 为 Codex 别名，不在列表中但可通过 Responses API 使用",
    ],
    params: [
      { name: "Authorization", type: "header", desc: "Bearer <API_KEY>" },
    ],
    curl: `curl http://localhost:8788/v1/models \\
  -H "Authorization: Bearer $GROK2API_API_KEY"`,
  },
  {
    id: "chat",
    title: "对话",
    subtitle: "Chat Completions",
    category: "对话与推理",
    color: "#0070f3",
    icon: ICONS.chat,
    desc: "OpenAI 兼容文本对话，支持流式输出、思维链与工具调用（prompt 模拟）。",
    tags: ["文本", "流式", "tools"],
    method: "POST",
    endpoint: "/v1/chat/completions",
    features: [
      "兼容 messages 结构（system / user / assistant / developer）",
      "支持 stream、thinking、reasoning_effort",
      "支持 tools / function calling（通过 <tool_call> 标签桥接，稳定性依赖上游模型）",
      "推荐模型：grok-4.5、grok-4.3-high、grok-code-fast-1",
    ],
    params: [
      { name: "model", type: "string", desc: "模型 ID，如 grok-4.5、grok-4.3-fast" },
      { name: "messages", type: "array", desc: "对话消息列表" },
      { name: "stream", type: "boolean", desc: "是否流式输出" },
      { name: "thinking", type: "string", desc: "思维链：enabled / disabled / null" },
      { name: "tools", type: "array", desc: "OpenAI 格式工具定义（可选）" },
    ],
    curl: `curl http://localhost:8788/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GROK2API_API_KEY" \\
  -d '{
    "model": "${EXAMPLE_MODELS.chat}",
    "messages": [{"role":"user","content":"你好"}],
    "stream": false
  }'`,
  },
  {
    id: "responses",
    title: "Responses API",
    subtitle: "Codex / Agents",
    category: "对话与推理",
    color: "#0ea5e9",
    icon: ICONS.responses,
    desc: "OpenAI Responses 协议，供 Codex CLI 等 Agent 使用；支持流式 function_call 事件。",
    tags: ["Codex", "Agent", "tools"],
    method: "POST",
    endpoint: "/v1/responses",
    features: [
      "兼容 Codex wire_api=responses 配置",
      "支持扁平 tools（name + inputSchema）与 namespace 工具组",
      "gpt-5.5 别名：有 tools 时映射 grok-code-fast-1，否则映射 grok-4.5",
      "工具调用为 prompt 模拟，非 Grok 原生 function calling",
    ],
    params: [
      { name: "model", type: "string", desc: "如 gpt-5.5、grok-code-fast-1" },
      { name: "input", type: "string|array", desc: "用户输入或消息块" },
      { name: "stream", type: "boolean", desc: "是否 SSE 流式" },
      { name: "tools", type: "array", desc: "Responses / Chat 双格式工具定义" },
      { name: "tool_choice", type: "string", desc: "auto / required / none" },
    ],
    curl: `curl http://localhost:8788/v1/responses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GROK2API_API_KEY" \\
  -d '{
    "model": "${EXAMPLE_MODELS.codex}",
    "input": "用一句话介绍你自己",
    "stream": false
  }'`,
  },
  {
    id: "deep-thinking",
    title: "深度思考",
    subtitle: "Reasoning / Thinking",
    category: "对话与推理",
    color: "#11998e",
    icon: ICONS.bulb,
    desc: "为推理向模型开启思维链，或通过 reasoning 档位提升推导质量。",
    tags: ["推理", "思维链", "reasoning"],
    method: "POST",
    endpoint: "/v1/chat/completions",
    features: [
      "Chat：thinking=enabled 或 reasoning_effort=low|medium|high|xhigh",
      "推荐模型：grok-4.20-0309-reasoning-console、grok-4.3-high、grok-4.20-multi-agent-high",
      "旧 ID grok-4.20-0309-reasoning 已下线，请改用 *-reasoning-console 或 4.3 档位",
    ],
    params: [
      { name: "model", type: "string", desc: "推理模型，如 grok-4.20-0309-reasoning-console" },
      { name: "thinking", type: "string", desc: "enabled / disabled（Chat）" },
      { name: "reasoning_effort", type: "string", desc: "none|minimal|low|medium|high|xhigh" },
      { name: "messages", type: "array", desc: "对话消息" },
    ],
    curl: `curl http://localhost:8788/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GROK2API_API_KEY" \\
  -d '{
    "model": "${EXAMPLE_MODELS.reasoning}",
    "messages": [{"role":"user","content":"请逐步推导这道物理题"}],
    "thinking": "enabled"
  }'`,
  },
  {
    id: "image-gen",
    title: "图像生成",
    subtitle: "Image Generation",
    category: "图像能力",
    color: "#7928ca",
    icon: ICONS.image,
    desc: "文生图，支持 imagine 系列模型、多种比例与流式返回。",
    tags: ["文生图", "lite", "并发"],
    method: "POST",
    endpoint: "/v1/images/generations",
    features: [
      "模型：grok-imagine-image、grok-imagine-image-pro、grok-imagine-image-lite",
      "支持 size 比例与 n 并发（流式时 n 为 1 或 2）",
      "response_format：url / base64 / b64_json",
    ],
    params: [
      { name: "model", type: "string", desc: "图像模型名" },
      { name: "prompt", type: "string", desc: "图像描述" },
      { name: "n", type: "integer", desc: "数量 1-10" },
      { name: "size", type: "string", desc: "如 16:9、1024x1024" },
      { name: "response_format", type: "string", desc: "url / base64 / b64_json" },
    ],
    curl: `curl http://localhost:8788/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GROK2API_API_KEY" \\
  -d '{
    "model": "${EXAMPLE_MODELS.imageLite}",
    "prompt": "一只在太空漂浮的猫",
    "n": 1
  }'`,
  },
  {
    id: "image-edit",
    title: "图像编辑",
    subtitle: "Image Editing",
    category: "图像能力",
    color: "#e0489e",
    icon: ICONS.edit,
    desc: "基于参考图编辑，multipart 上传原图与提示词。",
    tags: ["图生图", "上传", "编辑"],
    method: "POST",
    endpoint: "/v1/images/edits",
    features: [
      "支持 png / jpg / jpeg / webp（最多 16 张）",
      "模型通常使用 grok-imagine-image 系列",
      "返回格式同图像生成",
    ],
    params: [
      { name: "model", type: "string", desc: "如 grok-imagine-image" },
      { name: "prompt", type: "string", desc: "编辑提示词" },
      { name: "image", type: "file[]", desc: "待编辑图片" },
      { name: "n", type: "integer", desc: "生成数量 1-10" },
    ],
    curl: `curl http://localhost:8788/v1/images/edits \\
  -H "Authorization: Bearer $GROK2API_API_KEY" \\
  -F "model=${EXAMPLE_MODELS.image}" \\
  -F "prompt=给这只猫加一副太阳镜" \\
  -F "image=@./cat.png" \\
  -F "n=1"`,
  },
  {
    id: "video-gen",
    title: "视频生成",
    subtitle: "Video Generation",
    category: "视频能力",
    color: "#f5a623",
    icon: ICONS.film,
    desc: "文生视频，可通过 Chat 接口或专用 Videos 接口调用。",
    tags: ["文生视频", "video_config", "/v1/videos"],
    method: "POST",
    endpoint: "/v1/chat/completions 或 /v1/videos",
    features: [
      "模型：grok-imagine-video",
      "Chat 路径：messages + video_config（aspect_ratio、video_length、resolution、preset）",
      "Videos 路径：OpenAI 风格 POST /v1/videos（prompt、size、seconds、quality）",
    ],
    params: [
      { name: "model", type: "string", desc: "grok-imagine-video" },
      { name: "video_config.aspect_ratio", type: "string", desc: "16:9 / 9:16 / 1:1 / 2:3 / 3:2" },
      { name: "video_config.video_length", type: "integer", desc: "5-15 秒" },
      { name: "video_config.resolution", type: "string", desc: "SD / HD" },
      { name: "video_config.preset", type: "string", desc: "fun / normal / spicy" },
    ],
    curl: `curl http://localhost:8788/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GROK2API_API_KEY" \\
  -d '{
    "model": "${EXAMPLE_MODELS.video}",
    "messages": [{"role":"user","content":"一只猫在太空漂浮"}],
    "video_config": {
      "aspect_ratio": "16:9",
      "video_length": 10,
      "resolution": "SD",
      "preset": "normal"
    }
  }'`,
  },
  {
    id: "video-hd",
    title: "高清视频生成",
    subtitle: "HD Video (not upscale)",
    category: "视频能力",
    color: "#ff8c00",
    icon: ICONS.hd,
    desc: "生成时直接输出 HD 分辨率；并非对已有视频文件做超分辨率后处理。",
    tags: ["HD", "生成时", "非超分"],
    method: "POST",
    endpoint: "/v1/chat/completions",
    features: [
      "设置 video_config.resolution=HD 或 /v1/videos 的 quality=high",
      "无独立「视频超分」接口；不能上传成品视频再放大",
      "若需更清晰，请在生成阶段选择 HD / high",
    ],
    params: [
      { name: "model", type: "string", desc: "grok-imagine-video" },
      { name: "video_config.resolution", type: "string", desc: "HD" },
      { name: "quality", type: "string", desc: "/v1/videos 路径使用 high" },
    ],
    curl: `curl http://localhost:8788/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GROK2API_API_KEY" \\
  -d '{
    "model": "${EXAMPLE_MODELS.video}",
    "messages": [{"role":"user","content":"日落下的城市天际线"}],
    "video_config": {
      "aspect_ratio": "16:9",
      "video_length": 6,
      "resolution": "HD",
      "preset": "normal"
    }
  }'`,
  },
];

function renderSkillCards() {
  const container = document.getElementById("skill-container");
  const count = document.getElementById("skill-count");
  if (!container || !count) return;

  const groups = {};
  SKILLS.forEach((s) => {
    const cat = s.category || "其他";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  });

  const order = Object.keys(groups);
  container.innerHTML = order.map((cat) => {
    const cards = groups[cat].map((s) => `
      <div class="skill-card" data-skill="${escapeAttr(s.id)}" role="button" tabindex="0">
        <div class="skill-card-head">
          <div class="skill-icon" style="background:${escapeAttr(s.color)}">${escapeHtml(s.icon)}</div>
          <div>
            <div class="skill-title">${escapeHtml(s.title)}</div>
            <div class="skill-subtitle">${escapeHtml(s.subtitle)}</div>
          </div>
        </div>
        <div class="skill-desc">${escapeHtml(s.desc)}</div>
        <div class="skill-tags">${s.tags.map((t) => `<span class="skill-tag">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="skill-endpoint">
          <span class="skill-method">${escapeHtml(s.method)}</span>
          <span>${escapeHtml(s.endpoint)}</span>
        </div>
      </div>
    `).join("");

    return `
      <div class="dc-section">
        <div class="dc-section-title">${escapeHtml(cat)}</div>
        <div class="skill-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">${cards}</div>
      </div>
    `;
  }).join("");

  count.textContent = `共 ${SKILLS.length} 项技能`;

  container.querySelectorAll(".skill-card").forEach((card) => {
    const open = () => openSkillModal(card.getAttribute("data-skill"));
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function openSkillModal(id) {
  const skill = SKILLS.find((s) => s.id === id);
  const modal = document.getElementById("skill-modal");
  const body = document.getElementById("skill-modal-body");
  if (!skill || !modal || !body) return;

  const paramsRows = skill.params.map((p) => `
    <tr>
      <td><code>${escapeHtml(p.name)}</code></td>
      <td>${escapeHtml(p.type)}</td>
      <td>${escapeHtml(p.desc)}</td>
    </tr>
  `).join("");

  body.innerHTML = `
    <div class="skill-modal-title">${escapeHtml(skill.title)}</div>
    <div class="skill-modal-sub">${escapeHtml(skill.subtitle)}</div>
    <p class="text-sm text-[var(--accents-5)] leading-relaxed">${escapeHtml(skill.desc)}</p>

    <div class="skill-section-label">特性</div>
    <ul class="list-disc pl-5 text-sm text-[var(--accents-5)] space-y-1">
      ${skill.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
    </ul>

    <div class="skill-section-label">接口</div>
    <div class="skill-endpoint-box">
      <span><span class="skill-method">${escapeHtml(skill.method)}</span> ${escapeHtml(skill.endpoint)}</span>
      <button type="button" class="skill-copy-btn" data-copy="${escapeAttr(skill.method)} ${escapeAttr(skill.endpoint)}">复制</button>
    </div>

    <div class="skill-section-label">请求参数</div>
    <table class="skill-params">
      <thead><tr><th>参数</th><th>类型</th><th>说明</th></tr></thead>
      <tbody>${paramsRows}</tbody>
    </table>

    <div class="skill-section-label">调用示例</div>
    <div class="skill-code">
      <button type="button" class="skill-copy-btn" data-copy="${escapeAttr(skill.curl)}">复制</button>${escapeHtml(skill.curl)}
    </div>
  `;

  body.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.getAttribute("data-copy");
      copyText(text);
      if (typeof showToast === "function") showToast("已复制到剪贴板", "success");
    });
  });

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeSkillModal() {
  const modal = document.getElementById("skill-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (e) {
    /* noop */
  }
  document.body.removeChild(ta);
}

document.addEventListener("DOMContentLoaded", () => {
  renderSkillCards();

  const modal = document.getElementById("skill-modal");
  if (modal) {
    modal.querySelectorAll("[data-close]").forEach((el) =>
      el.addEventListener("click", closeSkillModal),
    );
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSkillModal();
  });
});

if (document.readyState !== "loading") {
  renderSkillCards();
}
