import type { Metadata } from "next";
import { clubById } from "@ft3/sim";
import { EXPRESSIONS, type Expression } from "@/game/faces.ts";
import { ShowroomView } from "@/game/ShowroomView.tsx";

export const metadata: Metadata = { title: "Personaggi · Fifa Tenkaichi 3" };

// A team's five footballers in a line: /personaggi?team=lupi&style=B, &back=1 from behind, &expr=joy
// for one expression on every face (game/faces.ts). Tancredi chooses the characters' style on these
// (docs/PIANO-3D-ONLINE.md, phase 3).
export default async function Personaggi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  const club = clubById(one("team") ?? "") ?? clubById("fulmini")!;
  const style = one("style") === "A" ? "A" : "B";
  const expr = (EXPRESSIONS as readonly string[]).includes(one("expr") ?? "") ? (one("expr") as Expression) : "";
  const options = { team: club.id, style, back: one("back") === "1", expression: expr } as const;
  return <ShowroomView options={options} title={`${club.name} · stile ${style === "A" ? "A, sportivo" : "B, a tema"}`} />;
}
