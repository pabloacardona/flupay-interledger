import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Merchant } from "@/generated/prisma/client";
import { db } from "./db";
import { env } from "./env";

const SESSION_COOKIE = "flupay_session";
const NEW_KEY_COOKIE = "flupay_new_key";

function sign(value: string): string {
  return createHmac("sha256", env.ENCRYPTION_KEY).update(value).digest("base64url");
}

/** Session = signed merchant id. No passwords in the MVP: the API key is the login. */
export async function startSession(merchantId: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, `${merchantId}.${sign(merchantId)}`, {
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

export async function currentMerchant(): Promise<Merchant | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [id, signature] = raw.split(".");
  if (!id || !signature) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return db.merchant.findUnique({ where: { id } });
}

export async function requireMerchant(): Promise<Merchant> {
  const merchant = await currentMerchant();
  if (!merchant) redirect("/login");
  return merchant;
}

/** A newly issued API key is shown exactly once, then the cookie is gone. */
export async function stashNewApiKey(apiKey: string): Promise<void> {
  (await cookies()).set(NEW_KEY_COOKIE, apiKey, { httpOnly: true, sameSite: "strict", path: "/dashboard", maxAge: 120 });
}

export async function readNewApiKey(): Promise<string | null> {
  return (await cookies()).get(NEW_KEY_COOKIE)?.value ?? null;
}
