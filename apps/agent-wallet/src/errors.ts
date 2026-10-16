/** Typed errors surfaced to agents and stored in `Payment.errorCode`. */
export const ErrorCode = {
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  PRICE_EXCEEDS_MAX: "PRICE_EXCEEDS_MAX",
  MERCHANT_NOT_ALLOWED: "MERCHANT_NOT_ALLOWED",
  GRANT_INACTIVE: "GRANT_INACTIVE",
  PAYMENT_NOT_CONFIRMED: "PAYMENT_NOT_CONFIRMED",
  INVALID_PAYMENT_REQUIRED: "INVALID_PAYMENT_REQUIRED",
  ASSET_MISMATCH: "ASSET_MISMATCH",
  OPEN_PAYMENTS_ERROR: "OPEN_PAYMENTS_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INVALID_CALLBACK: "INVALID_CALLBACK",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const messages: Record<ErrorCode, string> = {
  BUDGET_EXCEEDED: "The owner's spending cap for this period is used up. Nothing was charged.",
  PRICE_EXCEEDS_MAX: "The price is higher than the allowed maximum per request. Nothing was charged.",
  MERCHANT_NOT_ALLOWED: "This merchant is not in the agent's allowed list. Nothing was charged.",
  GRANT_INACTIVE: "The agent has no active spending grant. The owner must approve a cap first.",
  PAYMENT_NOT_CONFIRMED: "The payment was sent but not confirmed in time.",
  INVALID_PAYMENT_REQUIRED: "The server answered 402 without a valid Payment-Required header.",
  ASSET_MISMATCH: "The merchant charges in a different currency than the agent's wallet.",
  OPEN_PAYMENTS_ERROR: "Open Payments rejected the request.",
  NOT_FOUND: "Resource not found.",
  INVALID_CALLBACK: "The grant callback could not be verified.",
};

export class WalletError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly httpStatus = 400,
  ) {
    super(message ?? messages[code]);
    this.name = "WalletError";
  }

  toJSON() {
    return { error: this.code, message: this.message };
  }
}
