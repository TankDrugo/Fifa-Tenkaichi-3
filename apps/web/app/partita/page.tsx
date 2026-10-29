import type { Metadata } from "next";
import { MatchView } from "@/game/ui/MatchView";
import { stageOptions } from "@/game/core/options";

export const metadata: Metadata = { title: "Partita · Fifa Tenkaichi 3" };

// Two teams of the AI play a match of packages/sim, drawn in 3D (docs/PIANO-3D-ONLINE.md, phase 2).
export default async function Partita({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MatchView options={stageOptions(await searchParams)} bench={false} />;
}
