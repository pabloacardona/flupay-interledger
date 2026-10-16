import { formatAmount } from "@flupay/shared";
import type { Merchant } from "@/generated/prisma/client";

export const moneyOf = (merchant: Pick<Merchant, "assetCode" | "assetScale">) => (minor: number) =>
  formatAmount({ value: BigInt(minor), assetCode: merchant.assetCode, assetScale: merchant.assetScale });

export const chargeStatusStyle: Record<string, string> = {
  pending: "bg-[#fff6e5] text-warn",
  paid: "bg-[#e8f6ee] text-ok",
  consumed: "bg-[#e8f6ee] text-ok",
  expired: "bg-[#efefec] text-muted",
};

export const chargeStatusLabel: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  consumed: "Paid · delivered",
  expired: "Expired",
};
