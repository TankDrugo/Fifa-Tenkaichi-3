import { z } from "zod";

// The four services of docs/PIANO-3D-ONLINE.md, section 3, in the order the status page lists them.
export const SERVICE_NAMES = ["web", "realtime", "postgres", "redis"] as const;
export type ServiceName = (typeof SERVICE_NAMES)[number];

export const ServiceCheck = z.object({
  name: z.enum(SERVICE_NAMES),
  ok: z.boolean(),
  ms: z.number().nonnegative(),
  detail: z.string(),
});
export type ServiceCheck = z.infer<typeof ServiceCheck>;

export const StatusReport = z.object({
  checkedAt: z.string(),
  allOk: z.boolean(),
  services: z.array(ServiceCheck),
});
export type StatusReport = z.infer<typeof StatusReport>;

// A check answers with a short description of what it reached (a version, an uptime) or throws.
export type Probe = () => Promise<string>;

// Runs one probe with a deadline, so a service that does not answer turns its row red instead of
// holding the whole page.
export async function timed(name: ServiceName, probe: Probe, timeoutMs = 2000): Promise<ServiceCheck> {
  const start = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer in ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    const detail = await Promise.race([probe(), deadline]);
    return { name, ok: true, ms: elapsed(start), detail };
  } catch (err) {
    return { name, ok: false, ms: elapsed(start), detail: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

export function report(services: ServiceCheck[], now = new Date()): StatusReport {
  return { checkedAt: now.toISOString(), allOk: services.every((s) => s.ok), services };
}

function elapsed(start: number): number {
  return Math.round((performance.now() - start) * 10) / 10;
}
