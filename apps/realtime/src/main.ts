import { createClient } from "redis";
import { startRealtime } from "./server.ts";

const port = Number(process.env.PORT ?? 3001);
const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

// Commands fail at once while Redis is away instead of queuing, so the health check reports the
// outage; the client keeps reconnecting in the background.
const redis = createClient({
  url: redisUrl,
  disableOfflineQueue: true,
  socket: { connectTimeout: 2000, reconnectStrategy: (retries) => Math.min(100 * 2 ** retries, 2000) },
});
redis.on("error", (err: unknown) => console.error("redis:", err instanceof Error ? err.message : err));
redis.connect().catch(() => {});

const server = await startRealtime({
  port,
  redisProbe: async () => {
    await redis.ping();
    const info = await redis.info("server");
    return `Redis ${/redis_version:(\S+)/.exec(info)?.[1] ?? "?"}`;
  },
});
console.log(`realtime listening on ${server.url} (health: /health, websocket: /ws)`);

async function shutdown(signal: string): Promise<void> {
  console.log(`realtime: ${signal}, closing`);
  await server.close();
  if (redis.isOpen) await redis.quit();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
