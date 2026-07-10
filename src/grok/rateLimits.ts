import type { GrokSettings } from "../settings";
import { getDynamicHeaders } from "./headers";
import { toRateLimitModel } from "./models";

const RATE_LIMIT_API = "https://grok.com/rest/rate-limits";

export function extractRemainingQuota(
  result: Record<string, unknown> | null | undefined,
  bucket: "normal" | "heavy" = "normal",
): number | null {
  if (!result || typeof result !== "object") return null;

  const legacy = (result as any).remainingTokens;
  if (typeof legacy === "number" && Number.isFinite(legacy)) return legacy;

  const direct = (result as any).remainingQueries;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;

  const effortKey = bucket === "heavy" ? "highEffortRateLimits" : "lowEffortRateLimits";
  const nested = (result as any)[effortKey];
  if (nested && typeof nested === "object") {
    const nestedRemaining = (nested as any).remainingQueries ?? (nested as any).remainingTokens;
    if (typeof nestedRemaining === "number" && Number.isFinite(nestedRemaining)) return nestedRemaining;
  }

  return null;
}

export async function checkRateLimits(
  cookie: string,
  settings: GrokSettings,
  model: string,
): Promise<Record<string, unknown> | null> {
  const rateModel = toRateLimitModel(model);
  const headers = getDynamicHeaders(settings, "/rest/rate-limits");
  headers.Cookie = cookie;
  const body = JSON.stringify({ requestKind: "DEFAULT", modelName: rateModel });

  const resp = await fetch(RATE_LIMIT_API, { method: "POST", headers, body });
  if (!resp.ok) return null;
  return (await resp.json()) as Record<string, unknown>;
}

