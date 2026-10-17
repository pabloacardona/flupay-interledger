export const ApiErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  OPEN_PAYMENTS_ERROR: "OPEN_PAYMENTS_ERROR",
  NOT_CONFIGURED: "NOT_CONFIGURED",
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}
