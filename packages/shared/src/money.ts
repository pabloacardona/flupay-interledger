/**
 * Money helpers. Amounts are always integers in minor units (bigint),
 * paired with an asset scale. Never use floats for money.
 */

export interface Amount {
  value: bigint;
  assetCode: string;
  assetScale: number;
}

/** Parses a decimal string like "0.05" into minor units at the given scale. */
export function toMinor(decimal: string, assetScale: number): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(decimal.trim());
  if (!match) throw new Error(`Invalid decimal amount: ${decimal}`);
  const [, whole = "0", fraction = ""] = match;
  if (fraction.length > assetScale) {
    throw new Error(`Amount ${decimal} has more decimals than asset scale ${assetScale}`);
  }
  return BigInt(whole + fraction.padEnd(assetScale, "0"));
}

/** Formats minor units as a decimal string: (5n, 2) -> "0.05". */
export function fromMinor(value: bigint, assetScale: number): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(assetScale + 1, "0");
  const whole = digits.slice(0, digits.length - assetScale);
  const fraction = digits.slice(digits.length - assetScale);
  return `${negative ? "-" : ""}${whole}${assetScale > 0 ? `.${fraction}` : ""}`;
}

/** Parses a price like "0.05 USD" into an amount at the given scale. */
export function parsePrice(price: string, assetScale: number): Amount {
  const match = /^(\d+(?:\.\d+)?)\s+([A-Z]{3})$/.exec(price.trim());
  if (!match) throw new Error(`Invalid price: ${price}`);
  return { value: toMinor(match[1]!, assetScale), assetCode: match[2]!, assetScale };
}

export function formatAmount(amount: Amount): string {
  return `${fromMinor(amount.value, amount.assetScale)} ${amount.assetCode}`;
}

/**
 * Converts minor units between scales. Rounds up when reducing precision so a
 * converted price is never understated.
 */
export function rescale(value: bigint, fromScale: number, toScale: number): bigint {
  if (toScale >= fromScale) return value * 10n ** BigInt(toScale - fromScale);
  const divisor = 10n ** BigInt(fromScale - toScale);
  return (value + divisor - 1n) / divisor;
}
