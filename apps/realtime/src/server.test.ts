import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RealtimeHealth, ServerMessage } from "@ft3/shared";
import { startRealtime, type RealtimeServer } from "./server.ts";

let redisUp = true;
let server: RealtimeServer;

beforeAll(async () => {
  server = await startRealtime({
    port: 0,
    host: "127.0.0.1",
    redisProbe: async () => {
      if (!redisUp) throw new Error("connection refused");
      return "Redis test";
    },
  });
});
afterAll(() => server.close());

describe("GET /health", () => {
  it("answers 200 with the Redis row when Redis answers", async () => {
    redisUp = true;
    const res = await fetch(`${server.url}/health`);
    expect(res.status).toBe(200);
    const body = RealtimeHealth.parse(await res.json());
    expect(body.redis).toMatchObject({ ok: true, detail: "Redis test" });
  });

  it("answers 503 when Redis does not", async () => {
    redisUp = false;
    const res = await fetch(`${server.url}/health`);
    expect(res.status).toBe(503);
    expect(RealtimeHealth.parse(await res.json()).redis.detail).toBe("connection refused");
  });
});

describe("WebSocket /ws", () => {
  it("greets, answers a ping with the same t, refuses what it does not know", async () => {
    const ws = new WebSocket(`${server.url.replace("http", "ws")}/ws`);
    const received: ServerMessage[] = [];
    const wait = (n: number) =>
      new Promise<void>((resolve) => {
        const tick = () => (received.length >= n ? resolve() : setTimeout(tick, 5));
        tick();
      });
    ws.addEventListener("message", (e) => received.push(ServerMessage.parse(JSON.parse(String(e.data)))));
    await new Promise((resolve) => ws.addEventListener("open", resolve));
    await wait(1);
    ws.send(JSON.stringify({ type: "ping", t: 42 }));
    ws.send("{not json");
    ws.send(JSON.stringify({ type: "goal" }));
    await wait(4);
    ws.close();
    expect(received.map((m) => m.type)).toEqual(["hello", "pong", "error", "error"]);
    expect(received[1]).toMatchObject({ type: "pong", t: 42 });
  });
});
