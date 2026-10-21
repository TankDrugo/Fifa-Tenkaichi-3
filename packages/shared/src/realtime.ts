import { z } from "zod";
import { ServiceCheck } from "./status.ts";

// What apps/realtime answers on GET /health: its own state and its link to Redis.
export const RealtimeHealth = z.object({
  service: z.literal("realtime"),
  ok: z.boolean(),
  uptimeS: z.number().nonnegative(),
  connections: z.number().int().nonnegative(),
  redis: ServiceCheck,
});
export type RealtimeHealth = z.infer<typeof RealtimeHealth>;

// WebSocket messages. Phase 0 only has the ping that the status page uses to measure the round
// trip; the match messages of phase 6 join these two unions.
export const ClientMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping"), t: z.number() }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export const ServerMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello"), serverTime: z.number() }),
  z.object({ type: z.literal("pong"), t: z.number(), serverTime: z.number() }),
  z.object({ type: z.literal("error"), reason: z.string() }),
]);
export type ServerMessage = z.infer<typeof ServerMessage>;

export const MAX_CLIENT_MESSAGE_BYTES = 1024;
