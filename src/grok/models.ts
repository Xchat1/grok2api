export interface ModelInfo {
  grok_model: [string, string];
  rate_limit_model: string;
  display_name: string;
  description: string;
  raw_model_path: string;
  default_temperature: number;
  default_max_output_tokens: number;
  supported_max_output_tokens: number;
  default_top_p: number;
  is_image_model?: boolean;
  is_video_model?: boolean;
}

const CHAT_DEFAULTS = {
  default_temperature: 1.0,
  default_max_output_tokens: 8192,
  supported_max_output_tokens: 131072,
  default_top_p: 0.95,
} as const;

export const GPT55_ALIAS = "gpt-5.5";
export const GPT55_CODING_MODEL = "grok-code-fast-1";
export const GPT55_GENERAL_MODEL = "grok-4.5";

type ModelSpec = {
  id: string;
  description: string;
  isCoding?: boolean;
  isImage?: boolean;
  isVideo?: boolean;
};

function displayName(modelId: string): string {
  return modelId.replace(/^grok-/, "Grok ").replace(/-/g, " ");
}

function buildChatModel(
  modelId: string,
  description: string,
  extras: Partial<ModelInfo> = {},
): ModelInfo {
  return {
    grok_model: [modelId, "MODEL_MODE_FAST"],
    rate_limit_model: modelId,
    display_name: displayName(modelId),
    description,
    raw_model_path: `xai/${modelId}`,
    ...CHAT_DEFAULTS,
    ...extras,
  };
}

/** Keep in sync with app/services/grok/model_catalog.py */
export const MODEL_SPECS: ModelSpec[] = [
  { id: "grok-4.20-0309-multi-agent", description: "4.20 multi-agent" },
  { id: "grok-4.20-0309-console", description: "4.20 0309 console" },
  { id: "grok-4.20-0309-non-reasoning", description: "4.20 0309 non-reasoning" },
  { id: "grok-4.20-0309-non-reasoning-console", description: "4.20 0309 non-reasoning console" },
  { id: "grok-4.20-0309-reasoning-console", description: "4.20 0309 reasoning console" },
  { id: "grok-4.20-fast", description: "4.20 fast" },
  { id: "grok-4.20-multi-agent-console", description: "4.20 multi-agent console" },
  { id: "grok-4.20-multi-agent-low", description: "4.20 multi-agent low" },
  { id: "grok-4.20-multi-agent-medium", description: "4.20 multi-agent medium" },
  { id: "grok-4.20-multi-agent-high", description: "4.20 multi-agent high" },
  { id: "grok-4.20-multi-agent-xhigh", description: "4.20 multi-agent xhigh" },
  { id: "grok-4.5", description: "Grok 4.5 flagship" },
  { id: "grok-4.3", description: "Grok 4.3 flagship" },
  { id: "grok-4.3-fast", description: "Grok 4.3 fast" },
  { id: "grok-4.3-console", description: "Grok 4.3 console" },
  { id: "grok-4.3-low", description: "Grok 4.3 low" },
  { id: "grok-4.3-medium", description: "Grok 4.3 medium" },
  { id: "grok-4.3-high", description: "Grok 4.3 high" },
  { id: "grok-build-0.1", description: "Coding model", isCoding: true },
  { id: "grok-build-console", description: "Build console", isCoding: true },
  { id: "grok-code-fast-1", description: "Code model", isCoding: true },
  { id: "grok-imagine-image-pro", description: "Image generation model pro", isImage: true },
  { id: "grok-imagine-image", description: "Image generation model", isImage: true },
  { id: "grok-imagine-image-lite", description: "Image generation model lite", isImage: true },
  { id: "grok-imagine-video", description: "Video generation model", isVideo: true },
];

export const CODING_MODEL_IDS = new Set(
  MODEL_SPECS.filter((spec) => spec.isCoding).map((spec) => spec.id),
);

export const MODEL_CONFIG: Record<string, ModelInfo> = Object.fromEntries(
  MODEL_SPECS.map((spec) => [
    spec.id,
    buildChatModel(spec.id, spec.description, {
      ...(spec.isImage ? { is_image_model: true } : {}),
      ...(spec.isVideo ? { is_video_model: true } : {}),
    }),
  ]),
);

export function resolveGpt55(hasTools = false): string {
  return hasTools ? GPT55_CODING_MODEL : GPT55_GENERAL_MODEL;
}

export function resolveModelId(model: string, hasTools = false): string {
  if (model === GPT55_ALIAS) return resolveGpt55(hasTools);
  return model;
}

export function isCodingModel(model: string): boolean {
  return CODING_MODEL_IDS.has(resolveModelId(model));
}

export function isValidModel(model: string): boolean {
  if (model === GPT55_ALIAS) return true;
  return Boolean(MODEL_CONFIG[model]);
}

export function getModelInfo(model: string, hasTools = false): ModelInfo | null {
  return MODEL_CONFIG[resolveModelId(model, hasTools)] ?? null;
}

export function toGrokModel(model: string, hasTools = false): {
  grokModel: string;
  mode: string;
  isVideoModel: boolean;
} {
  const target = resolveModelId(model, hasTools);
  const cfg = MODEL_CONFIG[target];
  if (!cfg) {
    return { grokModel: target, mode: "MODEL_MODE_FAST", isVideoModel: false };
  }
  return {
    grokModel: cfg.grok_model[0],
    mode: cfg.grok_model[1],
    isVideoModel: Boolean(cfg.is_video_model),
  };
}

export function toRateLimitModel(model: string, hasTools = false): string {
  return MODEL_CONFIG[resolveModelId(model, hasTools)]?.rate_limit_model ?? model;
}
