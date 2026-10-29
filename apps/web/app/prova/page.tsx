import type { Metadata } from "next";
import { MatchView } from "@/game/ui/MatchView";
import { stageOptions } from "@/game/core/options";

export const metadata: Metadata = { title: "Prova · Fifa Tenkaichi 3" };

// The practice: one person with one footballer and the ball on an empty pitch, from the keyboard
// or a pad (game/core/practice.ts). /prova?modello=golden draws him with a GLB model (game/animation/models.ts),
// to see its run and kick; the other options are /partita's (game/core/options.ts).
export default async function Prova({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MatchView options={stageOptions(await searchParams, true)} bench={false} />;
}
