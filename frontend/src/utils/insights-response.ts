type MaybeInsightsResponse = {
  parsed?: unknown;
  rawJsonText?: string;
  json?: unknown;
};

export function toPrettyInsights(data: unknown): string {
  const d = data as MaybeInsightsResponse;

  const raw = d?.parsed ?? d?.rawJsonText ?? d?.json ?? data;

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
  }
}
