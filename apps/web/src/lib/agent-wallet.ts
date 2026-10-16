import "server-only";
import { env } from "./env";
import { ApiError, ApiErrorCode } from "./errors";

/** Server-to-server client for the agent wallet service (mcp.useflupay.space). */

export interface Balance {
  status: "active" | "none";
  budget: string | null;
  spent: string | null;
  remaining: string | null;
  interval: string | null;
}

export interface WalletAgent {
  id: string;
  owner_id: string;
  name: string;
  wallet_address: string;
  asset_code: string;
  asset_scale: number;
  max_price: string;
  allowed_merchants: string[];
  created_at: string;
  balance: Balance;
}

export interface WalletPayment {
  id: string;
  agent_id: string;
  target_url: string;
  merchant_wallet: string;
  price: string;
  debit: string | null;
  status: string;
  error_code: string | null;
  created_at: string;
}

export interface ActivityEvent {
  at: string;
  agentId: string;
  requestId: string;
  step: string;
  detail: Record<string, unknown> | null;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.AGENT_WALLET_API_URL || !env.AGENT_WALLET_ADMIN_KEY) {
    throw new ApiError(ApiErrorCode.NOT_CONFIGURED, "Agent wallet service is not configured", 503);
  }
  const res = await fetch(`${env.AGENT_WALLET_API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.AGENT_WALLET_ADMIN_KEY}`, ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  if (!res.ok) {
    throw new ApiError(ApiErrorCode.OPEN_PAYMENTS_ERROR, body.message ?? body.error ?? `Agent wallet error ${res.status}`, res.status);
  }
  return body as T;
}

export const agentWallet = {
  createOwner: (name: string, email?: string) =>
    call<{ id: string }>("/owners", { method: "POST", body: JSON.stringify({ name, email: email || undefined }) }),
  listAgents: (ownerId: string) => call<WalletAgent[]>(`/agents?owner_id=${encodeURIComponent(ownerId)}`),
  getAgent: (id: string) => call<WalletAgent>(`/agents/${encodeURIComponent(id)}`),
  createAgent: (input: { ownerId: string; name: string; walletAddress: string; maxPrice: string }) =>
    call<{ agent: WalletAgent; mcp_api_key: string }>("/agents", {
      method: "POST",
      body: JSON.stringify({ owner_id: input.ownerId, name: input.name, wallet_address: input.walletAddress, max_price: input.maxPrice }),
    }),
  rotateKey: (id: string) => call<{ mcp_api_key: string }>(`/agents/${encodeURIComponent(id)}/key`, { method: "POST" }),
  startGrant: (id: string, budget: string, period: string) =>
    call<{ grant_id: string; redirect_url: string }>(`/agents/${encodeURIComponent(id)}/grants`, {
      method: "POST",
      body: JSON.stringify({ budget, period }),
    }),
  revokeGrant: (id: string) => call<void>(`/agents/${encodeURIComponent(id)}/grants`, { method: "DELETE" }),
  payments: (id: string) => call<WalletPayment[]>(`/payments?agent_id=${encodeURIComponent(id)}`),
  activity: (id: string) => call<ActivityEvent[]>(`/activity?agent_id=${encodeURIComponent(id)}`),
};
