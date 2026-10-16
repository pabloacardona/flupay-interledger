"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { createMerchant, createProduct, findMerchantByApiKey, rotateApiKey } from "@/lib/merchants";
import { endSession, requireMerchant, startSession, stashNewApiKey } from "@/lib/session";

export interface FormState {
  error?: string;
}

const messageOf = (err: unknown) =>
  err instanceof ApiError ? err.message : err instanceof z.ZodError ? err.issues.map((i) => i.message).join(", ") : "Algo salió mal";

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  let merchantId: string;
  try {
    const input = z
      .object({
        name: z.string().trim().min(2, "El nombre del negocio es obligatorio"),
        email: z.union([z.email("Correo inválido"), z.literal("")]).optional(),
        walletAddress: z.string().trim().min(5, "La wallet address es obligatoria"),
      })
      .parse(Object.fromEntries(form));
    const { merchant, apiKey } = await createMerchant(input);
    await startSession(merchant.id);
    await stashNewApiKey(apiKey);
    merchantId = merchant.id;
  } catch (err) {
    return { error: messageOf(err) };
  }
  if (merchantId) redirect("/dashboard");
  return {};
}

export async function logIn(_prev: FormState, form: FormData): Promise<FormState> {
  const apiKey = String(form.get("apiKey") ?? "").trim();
  const merchant = apiKey ? await findMerchantByApiKey(apiKey) : null;
  if (!merchant) return { error: "API key inválida" };
  await startSession(merchant.id);
  redirect("/dashboard");
}

export async function logOut(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function addProduct(_prev: FormState, form: FormData): Promise<FormState> {
  const merchant = await requireMerchant();
  try {
    const input = z
      .object({
        name: z.string().trim().min(1, "El nombre es obligatorio").max(100),
        description: z.string().trim().max(500).optional(),
        price: z.string().trim().regex(/^\d+(\.\d+)?$/, "El precio debe ser un número, por ejemplo 15000"),
      })
      .parse(Object.fromEntries(form));
    await createProduct(merchant, input);
  } catch (err) {
    return { error: messageOf(err) };
  }
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function toggleProduct(form: FormData): Promise<void> {
  const merchant = await requireMerchant();
  const id = String(form.get("id"));
  const product = await db.product.findFirst({ where: { id, merchantId: merchant.id } });
  if (product) await db.product.update({ where: { id }, data: { active: !product.active } });
  revalidatePath("/dashboard", "layout");
}

export async function regenerateApiKey(): Promise<void> {
  const merchant = await requireMerchant();
  await stashNewApiKey(await rotateApiKey(merchant.id));
  revalidatePath("/dashboard", "layout");
}

export async function dismissNewKey(): Promise<void> {
  (await cookies()).delete({ name: "flupay_new_key", path: "/dashboard" });
  revalidatePath("/dashboard", "layout");
}
