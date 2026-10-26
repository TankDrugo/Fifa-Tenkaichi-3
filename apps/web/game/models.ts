// The GLB models the game can draw the players with (docs/STUDIO-PERSONAGGI.md, section 11, point
// 2): files in apps/web/public/models, chosen by id in the address, /partita?modello=fulmine and
// /personaggi?modello=fulmine. Without an id, or with one not listed here, the pieces in code draw.
export const MODELS: Record<string, string> = {
  // CH_Fulmine, built from Tancredi's reference by art/CH_Fulmine/build (26/10/2026)
  fulmine: "/models/fulmine.glb",
};

export const modelUrl = (id: string): string | undefined => (Object.hasOwn(MODELS, id) ? MODELS[id] : undefined);
