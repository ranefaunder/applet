/** Edit-chat model choices (client + server). Prices: OpenRouter USD / 1M tokens. */

export type EditAiModel = {
  key: string;
  openRouterId: string;
  /** Full name + version + price for the picker (internal use). */
  label: string;
};

export const EDIT_AI_MODELS = [
  {
    key: "deepseek-flash",
    openRouterId: "deepseek/deepseek-v4-flash",
    label: "DeepSeek V4 Flash — $0.10 / $0.20",
  },
  {
    key: "mimo",
    openRouterId: "xiaomi/mimo-v2.5",
    label: "Xiaomi MiMo-V2.5 — $0.14 / $0.28",
  },
  {
    key: "gemini-lite",
    openRouterId: "google/gemini-2.5-flash-lite",
    label: "Google Gemini 2.5 Flash Lite — $0.10 / $0.40",
  },
  {
    key: "gemini-flash",
    openRouterId: "google/gemini-3-flash-preview",
    label: "Google Gemini 3 Flash Preview — $0.50 / $3.00",
  },
  {
    key: "gpt-mini",
    openRouterId: "openai/gpt-5.4-mini",
    label: "OpenAI GPT-5.4 Mini — $0.75 / $4.50",
  },
  {
    key: "gemini-pro",
    openRouterId: "google/gemini-3.1-pro-preview",
    label: "Google Gemini 3.1 Pro Preview — $2 / $12",
  },
  {
    key: "sonnet",
    openRouterId: "anthropic/claude-sonnet-5",
    label: "Anthropic Claude Sonnet 5 — $2 / $10",
  },
  {
    key: "gpt",
    openRouterId: "openai/gpt-5.5",
    label: "OpenAI GPT-5.5 — $5 / $30",
  },
  {
    key: "opus",
    openRouterId: "anthropic/claude-opus-4.8",
    label: "Anthropic Claude Opus 4.8 — $5 / $25",
  },
  {
    key: "fable",
    openRouterId: "anthropic/claude-fable-5",
    label: "Anthropic Claude Fable 5 — $10 / $50",
  },
] as const satisfies readonly EditAiModel[];

export type EditAiModelKey = (typeof EDIT_AI_MODELS)[number]["key"];

/** Cheapest model — default selection. */
export const DEFAULT_EDIT_AI_MODEL: EditAiModelKey = "deepseek-flash";

const EDIT_AI_MODEL_BY_KEY = Object.fromEntries(
  EDIT_AI_MODELS.map((m) => [m.key, m]),
) as Record<EditAiModelKey, (typeof EDIT_AI_MODELS)[number]>;

export function isEditAiModelKey(value: unknown): value is EditAiModelKey {
  return typeof value === "string" && value in EDIT_AI_MODEL_BY_KEY;
}

export function getEditAiModel(key: EditAiModelKey): (typeof EDIT_AI_MODELS)[number] {
  return EDIT_AI_MODEL_BY_KEY[key];
}

/** Format OpenRouter usage cost for subtle UI display. */
export function formatAiCostUsd(costUsd: number): string {
  if (costUsd < 0.0001) return `$${costUsd.toFixed(6)}`;
  if (costUsd < 0.01) return `$${costUsd.toFixed(4)}`;
  if (costUsd < 1) return `$${costUsd.toFixed(3)}`;
  return `$${costUsd.toFixed(2)}`;
}

/** Format request duration for subtle UI display. */
export function formatAiDurationMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)} s`;
  return `${Math.round(seconds)} s`;
}

/** Resolve picker key or OpenRouter id → short display name (no price). */
export function formatAiModelName(modelRef: string): string {
  if (isEditAiModelKey(modelRef)) {
    return getEditAiModel(modelRef).label.replace(/\s*—\s*\$[\d.]+(?:\s*\/\s*\$[\d.]+)?$/, "").trim();
  }
  const byOpenRouterId = EDIT_AI_MODELS.find((m) => m.openRouterId === modelRef);
  if (byOpenRouterId) {
    return byOpenRouterId.label.replace(/\s*—\s*\$[\d.]+(?:\s*\/\s*\$[\d.]+)?$/, "").trim();
  }
  const slug = modelRef.includes("/") ? modelRef.slice(modelRef.indexOf("/") + 1) : modelRef;
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Prefer storing the OpenRouter id that actually answered (handles credit fallback). */
export function resolveStoredModelRef(opts: {
  requestedKey: EditAiModelKey;
  modelUsed?: string | null;
}): string {
  if (opts.modelUsed) return opts.modelUsed;
  return opts.requestedKey;
}

/** e.g. "DeepSeek V4 Flash · 116 s · $0.0050" */
export function formatAiRequestStats(opts: {
  modelKey?: string | null;
  durationMs?: number | null;
  costUsd?: number | null;
}): string | null {
  const parts = [
    opts.modelKey ? formatAiModelName(opts.modelKey) : null,
    typeof opts.durationMs === "number" ? formatAiDurationMs(opts.durationMs) : null,
    typeof opts.costUsd === "number" ? formatAiCostUsd(opts.costUsd) : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
