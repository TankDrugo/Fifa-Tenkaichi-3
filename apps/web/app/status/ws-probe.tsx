"use client";

import { useEffect, useState } from "react";
import { ServerMessage } from "@ft3/shared";

const PINGS = 10;

type Probe = { state: "pending" } | { state: "ok"; medianMs: number; url: string } | { state: "error"; url: string };

// Opens a WebSocket from the browser to apps/realtime, the path the online matches will take, and
// measures the round trip of ten pings sent one after the other.
export function WsProbe({ url }: { url: string | null }) {
  const [probe, setProbe] = useState<Probe>({ state: "pending" });

  useEffect(() => {
    const target = url ?? `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:3001`;
    const ws = new WebSocket(`${target}/ws`);
    const rtts: number[] = [];
    const ping = () => ws.send(JSON.stringify({ type: "ping", t: performance.now() }));
    ws.onmessage = (e) => {
      const parsed = ServerMessage.safeParse(JSON.parse(String(e.data)));
      if (!parsed.success) return;
      const msg = parsed.data;
      if (msg.type === "hello") ping();
      if (msg.type !== "pong") return;
      rtts.push(performance.now() - msg.t);
      if (rtts.length < PINGS) return ping();
      rtts.sort((a, b) => a - b);
      setProbe({ state: "ok", medianMs: Math.round(((rtts[4] ?? 0) + (rtts[5] ?? 0)) * 5) / 10, url: target });
      ws.close();
    };
    ws.onerror = () => setProbe({ state: "error", url: target });
    return () => ws.close();
  }, [url]);

  if (probe.state === "pending") return <p data-testid="ws-probe" data-state="pending">WebSocket: prova in corso…</p>;
  if (probe.state === "error")
    return (
      <p data-testid="ws-probe" data-state="error" className="down">
        WebSocket verso {probe.url}/ws: non raggiungibile.
      </p>
    );
  return (
    <p data-testid="ws-probe" data-state="ok" data-rtt-ms={probe.medianMs} className="ok">
      WebSocket verso {probe.url}/ws: collegato, andata e ritorno mediana {probe.medianMs.toLocaleString("it-IT")} ms
      su {PINGS} ping.
    </p>
  );
}
