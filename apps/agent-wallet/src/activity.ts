import { db } from "./db.js";
import type { Prisma } from "./generated/prisma/client.js";

/**
 * Activity feed (402 received, quote, payment sent, 200...) for the live demo console.
 * Also printed as one JSON line per step, tagged with the request id.
 */
export interface ActivityInput {
  agentId: string;
  requestId: string;
  step: string;
  detail?: Record<string, unknown>;
}

export function record(event: ActivityInput): void {
  console.log(JSON.stringify({ msg: "activity", at: new Date().toISOString(), ...event }));
  // Fire and forget: the feed must never block or break a payment.
  db.activityEvent
    .create({ data: { ...event, detail: event.detail as Prisma.InputJsonValue | undefined } })
    .catch((err: unknown) => console.error(JSON.stringify({ msg: "activity_write_failed", error: String(err) })));
}

export async function listActivity(agentId?: string, since?: string) {
  const events = await db.activityEvent.findMany({
    where: { ...(agentId ? { agentId } : {}), ...(since ? { at: { gt: new Date(since) } } : {}) },
    orderBy: { at: "asc" },
    take: 500,
  });
  return events.map(({ id: _id, ...e }) => e);
}
