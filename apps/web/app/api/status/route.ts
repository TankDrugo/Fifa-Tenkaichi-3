import { checkAll } from "@/lib/checks";

export const dynamic = "force-dynamic";

// The four services as JSON, for infra/check-status.mjs and the CI job that starts the compose.
export async function GET(): Promise<Response> {
  const status = await checkAll();
  return Response.json(status, { status: status.allOk ? 200 : 503, headers: { "cache-control": "no-store" } });
}
