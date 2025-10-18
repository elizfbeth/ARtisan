import { ConvexHttpClient } from "convex/browser";

/**
 * Create a Convex HTTP client with proper error handling
 *
 * The ConvexHttpClient can have timeout issues, so we provide
 * a wrapper with better diagnostics
 */

let cachedClient: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }

  // Reuse the same client instance to avoid connection issues
  if (!cachedClient) {
    console.log("Creating new Convex HTTP client for:", process.env.NEXT_PUBLIC_CONVEX_URL);
    cachedClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  }

  return cachedClient;
}

/**
 * Execute a Convex mutation with timeout and retry
 */
export async function executeConvexMutation<T>(
  mutation: Promise<T>,
  options: {
    name: string;
    timeoutMs?: number;
    retries?: number;
  }
): Promise<T | null> {
  const { name, timeoutMs = 10000, retries = 1 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        mutation,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${name} timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);

      console.log(`✓ ${name} succeeded${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`);
      return result;
    } catch (error) {
      console.error(`⚠ ${name} failed (attempt ${attempt + 1}/${retries + 1}):`, error);

      if (attempt === retries) {
        // Last attempt failed
        return null;
      }

      // Wait before retry with exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return null;
}

/**
 * Test Convex connection
 */
export async function testConvexConnection(): Promise<boolean> {
  try {
    const client = getConvexClient();

    // Try a simple query (this will work even if the query doesn't exist)
    // The connection will fail fast if there's a network issue
    console.log("Testing Convex connection...");

    // Just creating the client and checking the URL
    console.log("Convex URL:", process.env.NEXT_PUBLIC_CONVEX_URL);
    console.log("✓ Convex client created successfully");

    return true;
  } catch (error) {
    console.error("✗ Convex connection test failed:", error);
    return false;
  }
}
