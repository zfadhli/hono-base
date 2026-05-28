import type { Context } from "hono";

const store = new Map<string, number[]>();

export function rateLimit(config: { window: number; max: number }) {
  return async (c: Context, next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for")
      ?? c.req.header("x-real-ip")
      ?? "unknown";
    const now = Date.now();
    const cutoff = now - config.window * 1000;

    let timestamps = store.get(key);
    if (!timestamps) {
      timestamps = [];
      store.set(key, timestamps);
    }

    while (timestamps.length > 0 && timestamps[0]! < cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= config.max) {
      const retryAfter = Math.ceil((timestamps[0]! + config.window * 1000 - now) / 1000);
      return c.json({ error: "Too many requests", retryAfter }, 429);
    }

    timestamps.push(now);
    await next();
  };
}
