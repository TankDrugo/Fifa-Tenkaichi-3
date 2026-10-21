import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import {
  ClientMessage,
  MAX_CLIENT_MESSAGE_BYTES,
  timed,
  type Probe,
  type RealtimeHealth,
  type ServerMessage,
} from "@ft3/shared";

export interface RealtimeOptions {
  port: number;
  host?: string;
  // Answers with the Redis version or throws; injected so the tests run without a Redis.
  redisProbe: Probe;
}

export interface RealtimeServer {
  url: string;
  close(): Promise<void>;
}

// The match server of docs/PIANO-3D-ONLINE.md, section 3. In phase 0 it only proves the two paths
// the matches will use: HTTP for the health check and a WebSocket on /ws.
export async function startRealtime(options: RealtimeOptions): Promise<RealtimeServer> {
  const startedAt = Date.now();
  const http = createServer((req, res) => {
    void route(req, res);
  });
  const wss = new WebSocketServer({ server: http, path: "/ws", maxPayload: MAX_CLIENT_MESSAGE_BYTES });

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === "GET" && req.url === "/health") {
      const redis = await timed("redis", options.redisProbe);
      const body: RealtimeHealth = {
        service: "realtime",
        ok: redis.ok,
        uptimeS: Math.round((Date.now() - startedAt) / 1000),
        connections: wss.clients.size,
        redis,
      };
      res.writeHead(redis.ok ? 200 : 503, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(body));
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }

  wss.on("connection", (socket) => {
    send(socket, { type: "hello", serverTime: Date.now() });
    socket.on("message", (data, isBinary) => onMessage(socket, data, isBinary));
  });

  await new Promise<void>((resolve) => http.listen(options.port, options.host ?? "0.0.0.0", resolve));
  const { port } = http.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        for (const client of wss.clients) client.terminate();
        wss.close(() => http.close(() => resolve()));
      }),
  };
}

function onMessage(socket: WebSocket, data: RawData, isBinary: boolean): void {
  if (isBinary) {
    send(socket, { type: "error", reason: "binary messages are not used yet" });
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText(data));
  } catch {
    send(socket, { type: "error", reason: "not JSON" });
    return;
  }
  const message = ClientMessage.safeParse(parsed);
  if (!message.success) {
    send(socket, { type: "error", reason: "unknown message" });
    return;
  }
  switch (message.data.type) {
    case "ping":
      send(socket, { type: "pong", t: message.data.t, serverTime: Date.now() });
      break;
  }
}

function rawText(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  return data.toString("utf8");
}

function send(socket: WebSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}
