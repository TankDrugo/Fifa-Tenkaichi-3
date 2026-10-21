export const dynamic = "force-dynamic";

// Liveness of this container only, for the Docker health check: the other services have their own,
// and /api/status says whether they are linked.
export function GET(): Response {
  return Response.json({ service: "web", ok: true }, { headers: { "cache-control": "no-store" } });
}
