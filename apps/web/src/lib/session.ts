import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AgentOwner, Merchant } from "@/generated/prisma/client";
import { db } from "./db";
import { env } from "./env";

const SESSION_COOKIE = "flupay_session";

/** m = merchant (sells to agents), o = agent owner (funds agents). */
export type AccountKind = "m" | "o";

function sign(value: string): string {
  return createHmac("sha256", env.ENCRYPTION_KEY).update(value).digest("base64url");
}

/** Session = signed "<kind>:<id>". No passwords in the MVP: the secret key is the login. */
export async function startSession(kind: AccountKind, id: string): Promise<void> {
  const value = `${kind}:${id}`;
  (await cookies()).set(SESSION_COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentSession(): Promise<{ kind: AccountKind; id: string } | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  const value = raw.slice(0, dot);
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(raw.slice(dot + 1));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const [kind, id] = value.split(":");
  if ((kind !== "m" && kind !== "o") || !id) return null;
  return { kind, id };
}

export async function currentMerchant(): Promise<Merchant | null> {
  const session = await currentSession();
  return session?.kind === "m" ? db.merchant.findUnique({ where: { id: session.id } }) : null;
}

export async function currentOwner(): Promise<AgentOwner | null> {
  const session = await currentSession();
  return session?.kind === "o" ? db.agentOwner.findUnique({ where: { id: session.id } }) : null;
}

export async function requireMerchant(): Promise<Merchant> {
  const merchant = await currentMerchant();
  if (!merchant) redirect("/login");
  return merchant;
}

export async function requireOwner(): Promise<AgentOwner> {
  const owner = await currentOwner();
  if (!owner) redirect("/login");
  return owner;
}

/** One-time secrets (API keys) are shown once through a short-lived cookie, then deleted. */
const ONE_TIME = { merchantKey: ["flupay_new_key", "/dashboard"], ownerKey: ["flupay_new_owner_key", "/agents"], mcpKey: ["flupay_new_mcp_key", "/agents"] } as const;
type OneTime = keyof typeof ONE_TIME;

export async function stashSecret(kind: OneTime, value: string): Promise<void> {
  const [name, path] = ONE_TIME[kind];
  (await cookies()).set(name, value, { httpOnly: true, sameSite: "strict", path, maxAge: 120 });
}

export async function readSecret(kind: OneTime): Promise<string | null> {
  const [name] = ONE_TIME[kind];
  return (await cookies()).get(name)?.value ?? null;
}

export async function clearSecret(kind: OneTime): Promise<void> {
  const [name, path] = ONE_TIME[kind];
  (await cookies()).delete({ name, path });
}

// Backwards-compatible helpers used by merchant pages.
export const stashNewApiKey = (key: string) => stashSecret("merchantKey", key);
export const readNewApiKey = () => readSecret("merchantKey");
