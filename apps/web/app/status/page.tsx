import type { ServiceName } from "@ft3/shared";
import { checkAll } from "@/lib/checks.ts";
import { WsProbe } from "./ws-probe.tsx";

export const dynamic = "force-dynamic";

const LABELS: Record<ServiceName, string> = {
  web: "apps/web (Next.js)",
  realtime: "apps/realtime (partite)",
  postgres: "Postgres",
  redis: "Redis",
};

export default async function StatusPage() {
  const status = await checkAll();
  return (
    <main>
      <h1>Stato dei servizi</h1>
      <p className={status.allOk ? "ok" : "down"} data-testid="summary">
        {status.allOk
          ? "Tutti e quattro i servizi rispondono."
          : `Non rispondono: ${status.services.filter((s) => !s.ok).length} servizi su 4.`}
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Servizio</th>
            <th scope="col">Stato</th>
            <th scope="col">Tempo</th>
            <th scope="col">Dettaglio</th>
          </tr>
        </thead>
        <tbody>
          {status.services.map((s) => (
            <tr key={s.name} data-service={s.name} data-ok={s.ok}>
              <th scope="row">{LABELS[s.name]}</th>
              <td className={s.ok ? "ok" : "down"}>{s.ok ? "collegato" : "non risponde"}</td>
              <td>{s.ms.toLocaleString("it-IT")} ms</td>
              <td>{s.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Dal navigatore</h2>
      <WsProbe url={process.env.REALTIME_PUBLIC_URL ?? null} />
      <p className="note">
        Controllato alle {new Date(status.checkedAt).toLocaleTimeString("it-IT")}. Ricarica la pagina per rifare i
        controlli; in JSON: <a href="/api/status">/api/status</a>.
      </p>
    </main>
  );
}
