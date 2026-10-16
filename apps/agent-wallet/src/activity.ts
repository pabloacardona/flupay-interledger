/**
 * In-memory activity feed (402 received, payment sent, 200 returned...).
 * Feeds the live demo console; structured logs go to stdout via the Fastify logger.
 */
export interface ActivityEvent {
  at: string;
  agentId: string;
  requestId: string;
  step: string;
  detail?: Record<string, unknown>;
}

const MAX_EVENTS = 500;
const events: ActivityEvent[] = [];

export function record(event: Omit<ActivityEvent, "at">): void {
  const entry = { at: new Date().toISOString(), ...event };
  events.push(entry);
  if (events.length > MAX_EVENTS) events.shift();
  console.log(JSON.stringify({ msg: "activity", ...entry }));
}

export function listActivity(agentId?: string, since?: string): ActivityEvent[] {
  return events.filter((e) => (!agentId || e.agentId === agentId) && (!since || e.at > since));
}
