// Client for the FluPay charges API (apps/web, /api/v1/charges).
// The platform creates the Open Payments incoming payment on the merchant wallet
// and enforces single use, so the gateway needs no keys or database of its own.

/** A charge as returned by the charges API (`serializeCharge` in apps/web/src/lib/charges.ts). */
export interface Charge {
  id: string;
  status: "pending" | "paid" | "consumed" | "expired";
  /** Integer in minor units. */
  amount: string;
  asset_code: string;
  asset_scale: number;
  /** Human-readable, e.g. "50.00 COP". */
  price: string;
  description: string | null;
  reference: string | null;
  incoming_url: string;
  expires_at: string;
  /** Ready-to-send value of the `Payment-Required` header. */
  payment_required: string;
}

export interface CreateChargeInput {
  /** Decimal amount in the merchant's currency, e.g. "50". */
  amount: string;
  description?: string;
  reference?: string;
  agentHint?: string;
}

export type VerifyResult =
  | { valid: true; reason: null; charge: Charge }
  | { valid: false; reason: string; charge: Charge | null };

/** What the paywall needs from FluPay. Tests pass a fake implementation. */
export interface ChargesApi {
  createCharge(input: CreateChargeInput): Promise<Charge>;
  /** Verifies the agent's `Authorization: OpenPayments <url>` value and consumes the charge. */
  verify(authorization: string): Promise<VerifyResult>;
}

/** The charges API failed or is unreachable. */
export class FlupayError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
  }
}

export function createFlupayClient(baseUrl: string, apiKey: string, fetchImpl: typeof fetch = fetch): ChargesApi {
  async function post<T>(path: string, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(new URL(path, baseUrl), {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new FlupayError(`FluPay unreachable: ${(err as Error).message}`, null);
    }
    const text = await res.text();
    if (!res.ok) throw new FlupayError(`FluPay ${path} answered ${res.status}: ${text.slice(0, 300)}`, res.status);
    return JSON.parse(text) as T;
  }

  return {
    createCharge: (input) =>
      post<Charge>("/api/v1/charges", {
        amount: input.amount,
        description: input.description,
        reference: input.reference,
        agent_hint: input.agentHint,
      }),
    verify: (authorization) => post<VerifyResult>("/api/v1/charges/verify", { authorization }),
  };
}
