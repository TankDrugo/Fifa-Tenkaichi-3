"use client";
// The page around the 3D match: the score and the clock on top, and on /bench the numbers
// Tancredi reads on his laptop (docs/PIANO-3D-ONLINE.md, section 4.6); on /prova the goals and the
// controls of the practice (practice.ts, input.ts). The scene itself is drawn only in the browser
// (WebGL), so it is loaded without server rendering.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fingerprint } from "@ft3/sim";
import type { Driver } from "../core/driver";
import type { StageLoop } from "../core/loop";
import { FrameStats } from "../core/stats";
import type { StageOptions } from "../core/options";

const Stage = dynamic(() => import("./Stage").then((m) => m.Stage), { ssr: false });

const it = (v: number, d = 1) => v.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });

interface Hud {
  home: string;
  away: string;
  score: string;
  clock: string;
  fps: number;
  meanMs: number;
  slowMs: number;
  frames: number;
  calls: number;
  maxCalls: number;
  triangles: number;
  maxTriangles: number;
  textures: number;
  geometries: number;
  size: string;
}

declare global {
  interface Window {
    // for the checks with Playwright (tools of phase 2): the numbers and the match
    __ft3?: { stats: FrameStats; driver: () => Driver | null; loop: () => StageLoop | null; fingerprint: () => string | null };
  }
}

export function MatchView({ options, bench }: { options: StageOptions; bench: boolean }) {
  const stats = useMemo(() => new FrameStats(), []);
  const loop = useRef<StageLoop | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const onLoop = useCallback((l: StageLoop) => { loop.current = l; }, []);

  useEffect(() => {
    window.__ft3 = { stats, driver: () => loop.current?.driver ?? null, loop: () => loop.current, fingerprint: () => (loop.current ? fingerprint(loop.current.driver.match) : null) };
    const id = setInterval(() => {
      const d = loop.current?.driver;
      if (!d) return;
      const m = d.match, s = stats.summary(), left = Math.max(0, m.length - m.clock);
      setHud({
        home: d.home.name, away: d.away.name, score: `${m.score[0]} - ${m.score[1]}`,
        clock: `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(Math.floor(left % 60)).padStart(2, "0")}`,
        fps: s.fps, meanMs: s.meanMs, slowMs: s.slowMs, frames: s.frames,
        calls: stats.info.calls, maxCalls: stats.maxCalls, triangles: stats.info.triangles, maxTriangles: stats.maxTriangles,
        textures: stats.info.textures, geometries: stats.info.geometries,
        size: `${stats.info.width} × ${stats.info.height} (× ${it(stats.info.dpr, 2)})`,
      });
    }, 250);
    return () => { clearInterval(id); delete window.__ft3; };
  }, [stats]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}>
      <Stage options={options} stats={stats} onLoop={onLoop} />
      {hud && options.practice && (
        <>
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", padding: "8px 18px", background: "rgba(10,14,28,0.82)", color: "#fff", borderRadius: 10, font: "700 18px/1.2 system-ui, sans-serif", whiteSpace: "nowrap" }}>
            Prova libera · gol {hud.score.split(" - ")[0]}
          </div>
          <div style={{ position: "absolute", left: "50%", bottom: 12, transform: "translateX(-50%)", padding: "8px 14px", background: "rgba(10,14,28,0.78)", color: "#e8ecf6", borderRadius: 10, font: "14px/1.5 system-ui, sans-serif", textAlign: "center", maxWidth: "calc(100% - 24px)" }}>
            <div><b>Tastiera</b>: WASD o frecce per correre, Maiusc scatto, K tiro (tieni premuto per caricarlo), J passaggio, L finta, Spazio speciale</div>
            <div><b>Pad</b>: levetta o croce, X tiro, A passaggio, B finta, RT scatto, Y speciale</div>
          </div>
        </>
      )}
      {hud && !options.practice && (
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 16, alignItems: "center", padding: "8px 18px", background: "rgba(10,14,28,0.82)", color: "#fff", borderRadius: 10, font: "700 18px/1.2 system-ui, sans-serif", whiteSpace: "nowrap" }}>
          <span>{hud.home}</span>
          <span style={{ fontSize: 24 }}>{hud.score}</span>
          <span>{hud.away}</span>
          <span style={{ color: "#ffe27a" }}>{hud.clock}</span>
        </div>
      )}
      {bench && hud && (
        <section aria-label="Misure" style={{ position: "absolute", left: 12, bottom: 12, padding: "12px 16px", background: "rgba(10,14,28,0.86)", color: "#e8ecf6", borderRadius: 10, font: "16px/1.5 system-ui, sans-serif", minWidth: 360 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 18 }}>Banco del motore 3D</h1>
          <div>Fotogrammi al secondo: <b>{it(hud.fps)}</b> (obiettivo 60)</div>
          <div>Tempo per fotogramma: <b>{it(hud.meanMs)} ms</b> · 1% più lenti: <b style={{ color: hud.slowMs < 25 ? "#7ef0a0" : "#ff9a9a" }}>{it(hud.slowMs)} ms</b> (sotto 25)</div>
          <div>Chiamate di disegno: <b style={{ color: hud.maxCalls <= 150 ? "#7ef0a0" : "#ff9a9a" }}>{hud.calls}</b>, massimo {hud.maxCalls} (budget 150)</div>
          <div>Triangoli: <b style={{ color: hud.maxTriangles <= 300000 ? "#7ef0a0" : "#ff9a9a" }}>{hud.triangles.toLocaleString("it-IT")}</b>, massimo {hud.maxTriangles.toLocaleString("it-IT")} (budget 300.000)</div>
          <div>Risoluzione: {hud.size} · mappa d&apos;ombra 2048 · texture {hud.textures}, geometrie {hud.geometries}</div>
          <div style={{ color: "#b4bdd3", marginTop: 6 }}>Ultimi {hud.frames} fotogrammi. Lascia la pagina aperta 30 secondi a schermo intero, poi scrivi i numeri.</div>
        </section>
      )}
    </div>
  );
}
