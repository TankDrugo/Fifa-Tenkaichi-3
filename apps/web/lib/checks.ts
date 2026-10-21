import pg from "pg";
import { createClient } from "redis";
import { RealtimeHealth, report, timed, type StatusReport } from "@ft3/shared";

// Same settings as apps/realtime/src/main.ts: commands fail at once while Redis is away, and the
// client reconnects behind.
function makeRedis() {
  const redis = createClient({
    url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    disableOfflineQueue: true,
    socket: { connectTimeout: 2000, reconnectStrategy: (retries) => Math.min(100 * 2 ** retries, 2000) },
  });
  redis.on("error", (err: unknown) => console.error("redis:", err instanceof Error ? err.message : err));
  redis.connect().catch(() => {});
  return redis;
}

function makePool(): pg.Pool {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://ft3:ft3-dev@127.0.0.1:5432/ft3",
    max: 4,
    connectionTimeoutMillis: 2000,
  });
  pool.on("error", (err) => console.error("postgres:", err.message));
  return pool;
}

// One pool and one Redis client per server process. Next.js reloads modules in development, so
// they live on globalThis instead of in module variables.
type Clients = { pool: pg.Pool; redis: ReturnType<typeof makeRedis> };
const holder = globalThis as typeof globalThis & { __ft3Clients?: Clients };

function clients(): Clients {
  holder.__ft3Clients ??= { pool: makePool(), redis: makeRedis() };
  return holder.__ft3Clients;
}

async function probePostgres(): Promise<string> {
  const { rows } = await clients().pool.query<{ v: string }>("select current_setting('server_version') as v");
  return `Postgres ${rows[0]?.v.split(" ")[0] ?? "?"}`;
}

async function probeRedis(): Promise<string> {
  const { redis } = clients();
  await redis.ping();
  const info = await redis.info("server");
  return `Redis ${/redis_version:(\S+)/.exec(info)?.[1] ?? "?"}`;
}

async function probeRealtime(): Promise<string> {
  const base = process.env.REALTIME_INTERNAL_URL ?? "http://127.0.0.1:3001";
  const res = await fetch(`${base}/health`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
  const health = RealtimeHealth.parse(await res.json());
  if (!health.ok) throw new Error(`acceso, ma non raggiunge Redis: ${health.redis.detail}`);
  return `acceso da ${health.uptimeS} s, collegato a Redis (${health.redis.ms} ms), ${health.connections} WebSocket aperti`;
}

export async function checkAll(): Promise<StatusReport> {
  const services = await Promise.all([
    timed("web", async () => `Node ${process.version}`),
    timed("realtime", probeRealtime),
    timed("postgres", probePostgres),
    timed("redis", probeRedis),
  ]);
  return report(services);
}
