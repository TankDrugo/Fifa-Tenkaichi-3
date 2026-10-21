import { describe, expect, it } from "vitest";
import { ClientMessage, ServerMessage, StatusReport, report, timed } from "./index.ts";

describe("timed", () => {
  it("marks a probe that answers as ok and keeps its detail", async () => {
    const check = await timed("redis", async () => "8.10.2");
    expect(check).toMatchObject({ name: "redis", ok: true, detail: "8.10.2" });
    expect(check.ms).toBeGreaterThanOrEqual(0);
  });

  it("marks a probe that throws as down and keeps the reason", async () => {
    const check = await timed("postgres", async () => {
      throw new Error("connection refused");
    });
    expect(check).toMatchObject({ name: "postgres", ok: false, detail: "connection refused" });
  });

  it("stops waiting at the deadline", async () => {
    const check = await timed("realtime", () => new Promise<string>(() => {}), 50);
    expect(check.ok).toBe(false);
    expect(check.detail).toBe("no answer in 50 ms");
    expect(check.ms).toBeLessThan(1000);
  });
});

describe("report", () => {
  it("is ok only when every service is", () => {
    const up = { name: "web", ok: true, ms: 0, detail: "" } as const;
    const down = { name: "redis", ok: false, ms: 0, detail: "" } as const;
    expect(report([up]).allOk).toBe(true);
    expect(report([up, down]).allOk).toBe(false);
    expect(StatusReport.parse(report([up, down])).services).toHaveLength(2);
  });
});

describe("messages", () => {
  it("accepts a ping and refuses an unknown type", () => {
    expect(ClientMessage.safeParse({ type: "ping", t: 1 }).success).toBe(true);
    expect(ClientMessage.safeParse({ type: "goal", t: 1 }).success).toBe(false);
    expect(ServerMessage.safeParse({ type: "pong", t: 1, serverTime: 2 }).success).toBe(true);
  });
});
