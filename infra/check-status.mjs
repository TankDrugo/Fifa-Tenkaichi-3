// Checks a running stack from outside: asks apps/web for /api/status and opens a WebSocket to
// apps/realtime. Exit 0 only when the four services answer and the WebSocket round trip works.
//
//   node infra/check-status.mjs [web url] [realtime ws url]
//   defaults: http://localhost:3000 ws://localhost:3001
const webUrl = process.argv[2] ?? "http://localhost:3000";
const wsUrl = process.argv[3] ?? "ws://localhost:3001";
const PINGS = 20;

async function status() {
  // The containers report healthy before web has opened its first pool: retry for up to 30 s.
  let last;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${webUrl}/api/status`, { signal: AbortSignal.timeout(5000) });
      last = await res.json();
      if (last.allOk) return last;
    } catch (err) {
      last = { error: err.message };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return last;
}

function roundTrips() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsUrl}/ws`);
    const rtts = [];
    const timer = setTimeout(() => reject(new Error("no answer in 10 s")), 10_000);
    const ping = () => ws.send(JSON.stringify({ type: "ping", t: performance.now() }));
    ws.onerror = () => reject(new Error(`cannot open ${wsUrl}/ws`));
    ws.onmessage = (e) => {
      const msg = JSON.parse(String(e.data));
      if (msg.type === "hello") return ping();
      if (msg.type !== "pong") return;
      rtts.push(performance.now() - msg.t);
      if (rtts.length < PINGS) return ping();
      clearTimeout(timer);
      ws.close();
      rtts.sort((a, b) => a - b);
      resolve({ median: (rtts[9] + rtts[10]) / 2, max: rtts[PINGS - 1] });
    };
  });
}

const report = await status();
if (!report?.services) {
  console.error("web did not answer:", report);
  process.exit(1);
}
for (const s of report.services) {
  console.log(`${s.ok ? "ok  " : "DOWN"} ${s.name.padEnd(9)} ${String(s.ms).padStart(7)} ms  ${s.detail}`);
}
let wsOk = false;
try {
  const { median, max } = await roundTrips();
  console.log(`ok   websocket ${median.toFixed(2).padStart(7)} ms  median of ${PINGS} pings, max ${max.toFixed(2)} ms`);
  wsOk = true;
} catch (err) {
  console.log(`DOWN websocket            ${err.message}`);
}
process.exit(report.allOk && wsOk ? 0 : 1);
