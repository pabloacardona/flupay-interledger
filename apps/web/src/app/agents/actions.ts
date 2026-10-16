"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeWalletAddress } from "@flupay/shared";
import { agentWallet } from "@/lib/agent-wallet";
import { ApiError } from "@/lib/errors";
import { createOwner, ownedAgent, rotateOwnerKey } from "@/lib/owners";
import { clearSecret, requireOwner, startSession, stashSecret } from "@/lib/session";
import type { FormState } from "@/app/actions";

const messageOf = (err: unknown) =>
  err instanceof ApiError ? err.message : err instanceof z.ZodError ? err.issues.map((i) => i.message).join(", ") : "Algo salió mal";

const decimal = (msg: string) => z.string().trim().regex(/^\d+(\.\d+)?$/, msg);

export async function signUpOwner(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    const input = z
      .object({
        name: z.string().trim().min(2, "Tu nombre es obligatorio"),
        email: z.union([z.email("Correo inválido"), z.literal("")]).optional(),
      })
      .parse(Object.fromEntries(form));
    const { owner, ownerKey } = await createOwner(input);
    await startSession("o", owner.id);
    await stashSecret("ownerKey", ownerKey);
  } catch (err) {
    return { error: messageOf(err) };
  }
  redirect("/agents");
}

export async function createAgentAction(_prev: FormState, form: FormData): Promise<FormState> {
  const owner = await requireOwner();
  let agentId: string;
  try {
    const input = z
      .object({
        name: z.string().trim().min(2, "El nombre del agente es obligatorio"),
        walletAddress: z.string().trim().min(5, "La wallet address es obligatoria"),
        maxPrice: decimal("El máximo por compra debe ser un número"),
      })
      .parse(Object.fromEntries(form));
    const { agent, mcp_api_key } = await agentWallet.createAgent({
      ownerId: owner.walletOwnerId,
      name: input.name,
      walletAddress: normalizeWalletAddress(input.walletAddress),
      maxPrice: input.maxPrice,
    });
    await stashSecret("mcpKey", `${agent.id}:${mcp_api_key}`);
    agentId = agent.id;
  } catch (err) {
    return { error: messageOf(err) };
  }
  redirect(`/agents/${agentId}`);
}

/** Starts the interactive grant and sends the owner to the wallet to approve the cap. */
export async function approveCapAction(_prev: FormState, form: FormData): Promise<FormState> {
  const owner = await requireOwner();
  let redirectUrl: string;
  try {
    const input = z
      .object({
        agentId: z.string(),
        budget: decimal("El tope debe ser un número"),
        period: z.enum(["P1D", "P1W", "P1M"]),
      })
      .parse(Object.fromEntries(form));
    await ownedAgent(owner, input.agentId);
    ({ redirect_url: redirectUrl } = await agentWallet.startGrant(input.agentId, input.budget, input.period));
  } catch (err) {
    return { error: messageOf(err) };
  }
  redirect(redirectUrl);
}

export async function revokeCapAction(form: FormData): Promise<void> {
  const owner = await requireOwner();
  const agentId = String(form.get("agentId"));
  await ownedAgent(owner, agentId);
  await agentWallet.revokeGrant(agentId);
  revalidatePath(`/agents/${agentId}`);
}

export async function rotateMcpKeyAction(form: FormData): Promise<void> {
  const owner = await requireOwner();
  const agentId = String(form.get("agentId"));
  await ownedAgent(owner, agentId);
  const { mcp_api_key } = await agentWallet.rotateKey(agentId);
  await stashSecret("mcpKey", `${agentId}:${mcp_api_key}`);
  revalidatePath("/agents", "layout");
}

export async function rotateOwnerKeyAction(): Promise<void> {
  const owner = await requireOwner();
  await stashSecret("ownerKey", await rotateOwnerKey(owner.id));
  revalidatePath("/agents", "layout");
}

export async function dismissOwnerSecrets(): Promise<void> {
  await clearSecret("ownerKey");
  await clearSecret("mcpKey");
  revalidatePath("/agents", "layout");
}
