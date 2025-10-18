// Lightweight network helpers for robust HTTP calls in Node/Next.js
import dns from "node:dns";

// Prefer IPv4 first to avoid IPv6 connectivity stalls on some networks
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore if not supported
}

export type FetchRetryOptions = {
  timeoutMs?: number; // overall request timeout; defaults to 180s (3 minutes)
  retries?: number; // number of retry attempts; defaults to 3 (total 4 tries)
  backoffMs?: number; // base backoff; defaults to 1000ms (exponential)
};

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchRetryOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 180_000; // Increase default to 3 minutes
  const retries = options.retries ?? 3; // Increase default retries
  const backoff = options.backoffMs ?? 1000; // Increase backoff to 1 second

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal, cache: init.cache ?? "no-store" });
      clearTimeout(t);
      if (!res.ok) {
        // Don't retry on 4xx except 408
        if (res.status >= 400 && res.status < 500 && res.status !== 408) {
          return res;
        }
        lastErr = new Error(`HTTP ${res.status}`);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
          continue;
        }
        return res;
      }
      return res;
    } catch (err) {
      lastErr = err;
      clearTimeout(t);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr as Error;
}
