// Global HTTP initialization: prefer IPv4 and increase connect timeout
// Applies to Node runtime (Next.js route handlers using the node runtime)
import dns from "node:dns";
import { setGlobalDispatcher, Agent } from "undici";

// Prefer IPv4 first to avoid IPv6 connectivity stalls on some networks
try {
  // Node 18+ supports this; in older Node this will no-op
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore if not supported
}

// Increase connect timeout (default ~10-30s depending on env). Use 180s to be resilient.
// Also increase keepAlive timeout and max sockets for better performance.
try {
  setGlobalDispatcher(
    new Agent({
      connect: {
        timeout: 180_000, // 3 minutes
      },
      bodyTimeout: 180_000, // 3 minutes for response body
      headersTimeout: 180_000, // 3 minutes for response headers
      keepAliveTimeout: 60_000, // 1 minute keep-alive
      keepAliveMaxTimeout: 600_000, // 10 minutes max keep-alive
    })
  );
} catch {
  // ignore if undici not present or already set
}

// Simple retry helper for transient network errors
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  const base = options.baseDelayMs ?? 500;
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Only back off if we will retry
      if (i < retries) {
        const delay = base * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      break;
    }
  }
  throw lastErr as Error;
}
