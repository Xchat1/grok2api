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

/** 仅支持源头原始 ID，无别名。 */
export const MODEL_CONFIG: Record<string, ModelInfo> = {
  "grok-3": {
    grok_model: ["grok-3", "MODEL_MODE_GROK_3"],
    rate_limit_model: "grok-3",
    display_name: "Grok 3",
    description: "Grok 3 chat model",
    raw_model_path: "xai/grok-3",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-3-mini": {
    grok_model: ["grok-3-mini", "MODEL_MODE_GROK_3_MINI_THINKING"],
    rate_limit_model: "grok-3-mini",
    display_name: "Grok 3 Mini",
    description: "Grok 3 mini model",
    raw_model_path: "xai/grok-3-mini",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-4.20-multi-agent-beta-0309": {
    grok_model: ["grok-4.20-multi-agent-beta-0309", "MODEL_MODE_GROK_420"],
    rate_limit_model: "grok-4.20-multi-agent-beta-0309",
    display_name: "Grok 4.20 Multi-Agent Beta 0309",
    description: "Multi-agent beta",
    raw_model_path: "xai/grok-4.20-multi-agent-beta-0309",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-4.20-beta-0309-reasoning": {
    grok_model: ["grok-4.20-beta-0309-reasoning", "MODEL_MODE_GROK_420"],
    rate_limit_model: "grok-4.20-beta-0309-reasoning",
    display_name: "Grok 4.20 Beta 0309 Reasoning",
    description: "4.20 reasoning",
    raw_model_path: "xai/grok-4.20-beta-0309-reasoning",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-4.20-beta-0309-non-reasoning": {
    grok_model: ["grok-4.20-beta-0309-non-reasoning", "MODEL_MODE_GROK_420"],
    rate_limit_model: "grok-4.20-beta-0309-non-reasoning",
    display_name: "Grok 4.20 Beta 0309 Non-Reasoning",
    description: "4.20 non-reasoning",
    raw_model_path: "xai/grok-4.20-beta-0309-non-reasoning",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-code-fast-1": {
    grok_model: ["grok-code-fast-1", "MODEL_MODE_FAST"],
    rate_limit_model: "grok-code-fast-1",
    display_name: "Grok Code Fast 1",
    description: "Code model",
    raw_model_path: "xai/grok-code-fast-1",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-4-fast-reasoning": {
    grok_model: ["grok-4-fast-reasoning", "MODEL_MODE_FAST"],
    rate_limit_model: "grok-4-fast-reasoning",
    display_name: "Grok 4 Fast Reasoning",
    description: "Grok 4 reasoning",
    raw_model_path: "xai/grok-4-fast-reasoning",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-4-fast-non-reasoning": {
    grok_model: ["grok-4-fast-non-reasoning", "MODEL_MODE_FAST"],
    rate_limit_model: "grok-4-fast-non-reasoning",
    display_name: "Grok 4 Fast Non-Reasoning",
    description: "Grok 4 non-reasoning",
    raw_model_path: "xai/grok-4-fast-non-reasoning",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-4-1-fast-reasoning": {
    grok_model: ["grok-4-1-fast-reasoning", "MODEL_MODE_FAST"],
    rate_limit_model: "grok-4-1-fast-reasoning",
    display_name: "Grok 4.1 Fast Reasoning",
    description: "Grok 4.1 reasoning",
    raw_model_path: "xai/grok-4-1-fast-reasoning",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-4-1-fast-non-reasoningeu-west-1": {
    grok_model: ["grok-4-1-fast-non-reasoningeu-west-1", "MODEL_MODE_FAST"],
    rate_limit_model: "grok-4-1-fast-non-reasoningeu-west-1",
    display_name: "Grok 4.1 Fast Non-Reasoning EU West 1",
    description: "EU West 1",
    raw_model_path: "xai/grok-4-1-fast-non-reasoningeu-west-1",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-4-1-fast-non-reasoningus-east-4": {
    grok_model: ["grok-4-1-fast-non-reasoningus-east-4", "MODEL_MODE_FAST"],
    rate_limit_model: "grok-4-1-fast-non-reasoningus-east-4",
    display_name: "Grok 4.1 Fast Non-Reasoning US East 4",
    description: "US East 4",
    raw_model_path: "xai/grok-4-1-fast-non-reasoningus-east-4",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-4-0709": {
    grok_model: ["grok-4-0709", "MODEL_MODE_FAST"],
    rate_limit_model: "grok-4-0709",
    display_name: "Grok 4 0709",
    description: "Grok 4 0709",
    raw_model_path: "xai/grok-4-0709",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
  },
  "grok-imagine-image-pro": {
    grok_model: ["grok-imagine-image-pro", "MODEL_MODE_FAST"],
    rate_limit_model: "grok-imagine-image-pro",
    display_name: "Grok Imagine Image Pro",
    description: "Image generation pro",
    raw_model_path: "xai/grok-imagine-image-pro",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
    is_image_model: true,
  },
  "grok-imagine-image": {
    grok_model: ["grok-imagine-image", "MODEL_MODE_FAST"],
    rate_limit_model: "grok-imagine-image",
    display_name: "Grok Imagine Image",
    description: "Image generation",
    raw_model_path: "xai/grok-imagine-image",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
    is_image_model: true,
  },
  "grok-imagine-video": {
    grok_model: ["grok-imagine-video", "MODEL_MODE_FAST"],
    rate_limit_model: "grok-imagine-video",
    display_name: "Grok Imagine Video",
    description: "Video generation",
    raw_model_path: "xai/grok-imagine-video",
    default_temperature: 1.0,
    default_max_output_tokens: 8192,
    supported_max_output_tokens: 131072,
    default_top_p: 0.95,
    is_video_model: true,
  },
};

export function isValidModel(model: string): boolean {
  return Boolean(MODEL_CONFIG[model]);
}

export function getModelInfo(model: string): ModelInfo | null {
  return MODEL_CONFIG[model] ?? null;
}

export function toGrokModel(model: string): { grokModel: string; mode: string; isVideoModel: boolean } {
  const cfg = MODEL_CONFIG[model];
  if (!cfg) return { grokModel: model, mode: "MODEL_MODE_FAST", isVideoModel: false };
  return { grokModel: cfg.grok_model[0], mode: cfg.grok_model[1], isVideoModel: Boolean(cfg.is_video_model) };
}

export function toRateLimitModel(model: string): string {
  return MODEL_CONFIG[model]?.rate_limit_model ?? model;
}

