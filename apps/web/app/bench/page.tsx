import type { Metadata } from "next";
import { MatchView } from "@/game/MatchView.tsx";
import { stageOptions } from "@/game/options.ts";

export const metadata: Metadata = { title: "Banco 3D · Fifa Tenkaichi 3" };

// The same match as /partita with the numbers of section 4.6: frames a second, time per frame, the
// 1% slowest frames, draw calls and triangles of renderer.info.
export default async function Bench({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MatchView options={stageOptions(await searchParams)} bench />;
}
